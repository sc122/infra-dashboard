import { NextRequest, NextResponse } from "next/server";
import { sendMessage, sendAlert } from "@/lib/api/telegram";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, severity, title, details, message } = body;

    if (type === "test") {
      await sendMessage("\u{2705} <b>Test notification</b>\n\nInfra Dashboard is connected!");
      return NextResponse.json({ success: true });
    }

    if (type === "alert" && severity && title && details) {
      await sendAlert(severity, title, details);
      return NextResponse.json({ success: true });
    }

    if (message) {
      await sendMessage(message);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
