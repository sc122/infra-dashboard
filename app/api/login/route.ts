import { NextRequest, NextResponse } from "next/server";

// Same HMAC function as proxy.ts — generates token from password
async function generateToken(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw", encoder.encode(password), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode("infra-dashboard-auth"));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Timing-safe comparison
function safeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

export async function POST(request: NextRequest) {
  const password = process.env.DASHBOARD_PASSWORD;
  if (!password) {
    return NextResponse.json({ success: true });
  }

  const body = await request.json();

  // Timing-safe password comparison
  if (typeof body.password === "string" && safeCompare(body.password, password)) {
    // Store HMAC token in cookie, NOT the raw password
    const token = await generateToken(password);
    const response = NextResponse.json({ success: true });
    response.cookies.set("infra-auth", token, {
      httpOnly: true,
      secure: true,
      sameSite: "strict",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });
    return response;
  }

  // Generic error — don't reveal if password exists or is wrong
  return NextResponse.json({ error: "Authentication failed" }, { status: 401 });
}
