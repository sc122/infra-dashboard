import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import createMiddleware from "next-intl/middleware";
import { routing, isRtl } from "./i18n/routing";

const intlMiddleware = createMiddleware(routing);

// ─── Rate Limiting (in-memory, per-deployment) ──────────────
const rateLimits = new Map<string, { count: number; resetAt: number; locked: boolean; lockUntil: number }>();

function checkRateLimit(key: string, maxAttempts: number, windowMs: number, lockoutMs = 0): "ok" | "limited" | "locked" {
  const now = Date.now();
  const entry = rateLimits.get(key);

  // Check lockout
  if (entry?.locked && now < entry.lockUntil) return "locked";
  if (entry?.locked && now >= entry.lockUntil) {
    rateLimits.delete(key);
    return "ok";
  }

  // Check rate
  if (!entry || now > entry.resetAt) {
    rateLimits.set(key, { count: 1, resetAt: now + windowMs, locked: false, lockUntil: 0 });
    return "ok";
  }
  entry.count++;

  // Lockout after excessive attempts
  if (lockoutMs > 0 && entry.count > maxAttempts * 2) {
    entry.locked = true;
    entry.lockUntil = now + lockoutMs;
    return "locked";
  }

  return entry.count > maxAttempts ? "limited" : "ok";
}

function getClientIP(request: NextRequest): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
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

// ─── Locale-aware login page ────────────────────────────────
function detectLocale(pathname: string): string {
  const first = pathname.split("/")[1];
  if ((routing.locales as readonly string[]).includes(first)) return first;
  return routing.defaultLocale;
}

const loginCopy: Record<string, { title: string; subtitle: string; placeholder: string; button: string; failed: string; network: string }> = {
  he: { title: "Infra Dashboard", subtitle: "נדרשת הזדהות", placeholder: "סיסמה", button: "התחברות", failed: "ההזדהות נכשלה", network: "שגיאת רשת" },
  en: { title: "Infra Dashboard", subtitle: "Authentication required", placeholder: "Password", button: "Login", failed: "Authentication failed", network: "Network error" },
  ar: { title: "Infra Dashboard", subtitle: "المصادقة مطلوبة", placeholder: "كلمة المرور", button: "تسجيل الدخول", failed: "فشلت المصادقة", network: "خطأ في الشبكة" },
  ru: { title: "Infra Dashboard", subtitle: "Требуется аутентификация", placeholder: "Пароль", button: "Войти", failed: "Ошибка аутентификации", network: "Ошибка сети" },
};

function renderLoginPage(locale: string): string {
  const c = loginCopy[locale] ?? loginCopy[routing.defaultLocale];
  const dir = isRtl(locale) ? "rtl" : "ltr";
  return `<!DOCTYPE html>
<html lang="${locale}" dir="${dir}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${c.button} - ${c.title}</title>
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
    <h1>${c.title}</h1>
    <p>${c.subtitle}</p>
    <form id="f" onsubmit="return login(event)">
      <input type="password" id="pw" placeholder="${c.placeholder}" autofocus required />
      <button type="submit" id="btn">${c.button}</button>
      <div class="err" id="err"></div>
    </form>
  </div>
  <script>
    var FAILED=${JSON.stringify(c.failed)};
    var NETWORK=${JSON.stringify(c.network)};
    var BTN_LABEL=${JSON.stringify(c.button)};
    async function login(e){
      e.preventDefault();
      var b=document.getElementById('btn'),err=document.getElementById('err');
      b.textContent='...';err.style.display='none';
      try{
        var r=await fetch('/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password:document.getElementById('pw').value})});
        if(r.ok){window.location.reload();}
        else{var d=await r.json();err.textContent=d.error||FAILED;err.style.display='block';}
      }catch(x){err.textContent=NETWORK;err.style.display='block';}
      b.textContent=BTN_LABEL;
    }
  </script>
</body></html>`;
}

// ─── Main Proxy ─────────────────────────────────────────────
export async function proxy(request: NextRequest) {
  const password = process.env.DASHBOARD_PASSWORD;
  const { pathname } = request.nextUrl;
  const isApi = pathname.startsWith("/api/");

  // No password = dev mode (no auth) — still apply intl on UI routes
  if (!password) {
    return isApi
      ? addSecurityHeaders(NextResponse.next())
      : addSecurityHeaders(intlMiddleware(request));
  }

  // Allow login API (with strict rate limiting + lockout)
  if (pathname === "/api/login") {
    const ip = getClientIP(request);
    const status = checkRateLimit(`login:${ip}`, 3, 60_000, 300_000);
    if (status === "locked") {
      return addSecurityHeaders(
        NextResponse.json({ error: "Too many attempts. Locked for 5 minutes." }, { status: 429 })
      );
    }
    if (status === "limited") {
      return addSecurityHeaders(
        NextResponse.json({ error: "Too many attempts. Try again in 1 minute." }, { status: 429 })
      );
    }
    return addSecurityHeaders(NextResponse.next());
  }

  // Allow cron with Vercel's secret
  if (pathname === "/api/cron") {
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
      return addSecurityHeaders(NextResponse.next());
    }
  }

  // Allow Telegram webhook (validates chat ID internally)
  if (pathname === "/api/telegram-webhook") {
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
      // Authenticated — apply rate limits on expensive endpoints
      if (pathname === "/api/audit") {
        const ip = getClientIP(request);
        const auditStatus = checkRateLimit(`audit:${ip}`, 3, 60_000);
        if (auditStatus !== "ok") {
          return addSecurityHeaders(
            NextResponse.json({ error: "Audit rate limited. Max 3 per minute." }, { status: 429 })
          );
        }
      }
      // For UI routes, hand off to next-intl for locale routing
      if (!isApi) {
        return addSecurityHeaders(intlMiddleware(request));
      }
      return addSecurityHeaders(NextResponse.next());
    }
  }

  // Not authenticated — API gets 401 JSON
  if (isApi) {
    return addSecurityHeaders(
      NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    );
  }

  // Pages get login form in detected locale
  const locale = detectLocale(pathname);
  return addSecurityHeaders(new NextResponse(
    renderLoginPage(locale),
    { status: 401, headers: { "Content-Type": "text/html; charset=utf-8" } }
  ));
}

export const config = {
  // Skip Next internals, static files, and favicon. API routes still pass through
  // for auth checks; intl middleware only runs on non-API matched paths.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
