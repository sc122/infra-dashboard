import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  // Skip auth for API routes (they have their own auth)
  if (request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  const password = process.env.DASHBOARD_PASSWORD;
  if (!password) {
    // No password set = no auth required
    return NextResponse.next();
  }

  // Check for auth cookie
  const authCookie = request.cookies.get("infra-auth");
  if (authCookie?.value === password) {
    return NextResponse.next();
  }

  // Return login page (uses JS POST to handle special chars in passwords)
  return new NextResponse(
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
    <p>הזן סיסמה כדי להיכנס</p>
    <form id="f" onsubmit="return login(event)">
      <input type="password" id="pw" placeholder="סיסמה" autofocus required />
      <button type="submit" id="btn">כניסה</button>
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
        else{var d=await r.json();err.textContent=d.error||'שגיאה';err.style.display='block';}
      }catch(x){err.textContent='שגיאת רשת';err.style.display='block';}
      b.textContent='כניסה';
    }
  </script>
</body></html>`,
    { status: 401, headers: { "Content-Type": "text/html; charset=utf-8" } }
  );
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
