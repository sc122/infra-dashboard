import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const password = process.env.DASHBOARD_PASSWORD;
  if (!password) {
    return NextResponse.json({ success: true });
  }

  const body = await request.json();
  if (body.password === password) {
    const response = NextResponse.json({ success: true });
    response.cookies.set("infra-auth", password, {
      httpOnly: true,
      secure: true,
      sameSite: "strict",
      maxAge: 60 * 60 * 24 * 7,
    });
    return response;
  }

  return NextResponse.json({ error: "סיסמה שגויה" }, { status: 401 });
}
