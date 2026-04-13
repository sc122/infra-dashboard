import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// ─── Rate Limiting (in-memory, per-deployment) ──────────────
const loginAttempts = new Map<string, { count: number; resetAt: number }>();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 60_000; // 1 minute

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = loginAttempts.get(ip);
  if (!entry || now > entry.resetAt) {
    loginAttempts.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  entry.count++;
  return entry.count > MAX_ATTEMPTS;
}

// ─── Timing-safe string comparison ──────────────────────────
function safeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

// ─── Auth token: HMAC-based, not raw password ───────────────
async function generateToken(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw", encoder.encode(password), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode("infra-dashboard-auth"));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

// ─── Security Headers ───────────────────────────────────────
function addSecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  return response;
}

// ─── Main Proxy ─────────────────────────────────────────────
export async function proxy(request: NextRequest) {
  const password = process.env.DASHBOARD_PASSWORD;

  // No password = dev mode (no auth)
  if (!password) {
    return addSecurityHeaders(NextResponse.next());
  }

  // Allow login API (with rate limiting)
  if (request.nextUrl.pathname === "/api/login") {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    if (isRateLimited(ip)) {
      return addSecurityHeaders(
        NextResponse.json({ error: "Too many attempts. Try again in 1 minute." }, { status: 429 })
      );
    }
    return addSecurityHeaders(NextResponse.next());
  }

  // Allow cron with Vercel's secret
  if (request.nextUrl.pathname === "/api/cron") {
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
      return addSecurityHeaders(NextResponse.next());
    }
  }

  // Allow Telegram webhook (validates chat ID internally)
  if (request.nextUrl.pathname === "/api/telegram-webhook") {
    // Verify Telegram secret token if configured
    const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
    if (secret) {
      const headerSecret = request.headers.get("x-telegram-bot-api-secret-token");
      if (headerSecret !== secret) {
        return NextResponse.json({ error: "Invalid secret" }, { status: 403 });
      }
    }
    return addSecurityHeaders(NextResponse.next());
  }

  // ── Auth check — all other routes ──
  const authCookie = request.cookies.get("infra-auth");
  if (authCookie?.value) {
    const expectedToken = await generateToken(password);
    if (safeCompare(authCookie.value, expectedToken)) {
      return addSecurityHeaders(NextResponse.next());
    }
  }

  // Not authenticated — API gets 401 JSON
  if (request.nextUrl.pathname.startsWith("/api/")) {
    return addSecurityHeaders(
      NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    );
  }

  // Pages get login form (generic error — don't reveal password exists)
  return addSecurityHeaders(new NextResponse(
    `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Login - Infra Dashboard</title>
<style>
  body{font-family:system-ui;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#0a0a0a;color:#fafafa}
  .card{background:#18181b;padding:2rem;border-radius:12px;border:1px solid #27272a;max-width:360px;width:100%}
  h1{margin:0 0 0.5rem;font-size:1.25rem}
  p{color:#a1a1aa;font-size:0.875rem;margin:0 0 1.5rem}
  input{width:100%;padding:0.625rem;border:1px solid #27272a;border-radius:8px;background:#09090b;color:#fafafa;font-size:0.875rem;box-sizing:border-box}
  button{width:100%;padding:0.625rem;border:none;border-radius:8px;background:#fafafa;color:#09090b;font-weight:600;cursor:pointer;margin-top:0.75rem;font-size:0.875rem}
  button:hover{background:#e4e4e7}
  .err{color:#f87171;font-size:0.8rem;margin-top:0.5rem;display:none}
</style></head>
<body>
  <div class="card">
    <h1>Infra Dashboard</h1>
    <p>Authentication required</p>
    <form id="f" onsubmit="return login(event)">
      <input type="password" id="pw" placeholder="Password" autofocus required />
      <button type="submit" id="btn">Login</button>
      <div class="err" id="err"></div>
    </form>
  </div>
  <script>
    async function login(e){
      e.preventDefault();
      var b=document.getElementById('btn'),err=document.getElementById('err');
      b.textContent='...';err.style.display='none';
      try{
        var r=await fetch('/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password:document.getElementById('pw').value})});
        if(r.ok){window.location.reload();}
        else{var d=await r.json();err.textContent=d.error||'Authentication failed';err.style.display='block';}
      }catch(x){err.textContent='Network error';err.style.display='block';}
      b.textContent='Login';
    }
  </script>
</body></html>`,
    { status: 401, headers: { "Content-Type": "text/html; charset=utf-8" } }
  ));
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
