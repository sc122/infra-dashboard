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

  // Check for password in query param (login)
  const passwordParam = request.nextUrl.searchParams.get("password");
  if (passwordParam === password) {
    const response = NextResponse.redirect(new URL(request.nextUrl.pathname, request.url));
    response.cookies.set("infra-auth", password, {
      httpOnly: true,
      secure: true,
      sameSite: "strict",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });
    return response;
  }

  // Return login page
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
</style></head>
<body>
  <div class="card">
    <h1>Infra Dashboard</h1>
    <p>הזן סיסמה כדי להיכנס</p>
    <form method="GET">
      <input type="password" name="password" placeholder="סיסמה" autofocus required />
      <button type="submit">כניסה</button>
    </form>
  </div>
</body></html>`,
    { status: 401, headers: { "Content-Type": "text/html; charset=utf-8" } }
  );
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
