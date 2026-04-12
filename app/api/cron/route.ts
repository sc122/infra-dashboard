import { NextRequest, NextResponse } from "next/server";
import { sendHealthReport } from "@/lib/api/telegram";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  // Verify cron secret (Vercel sends this header for cron jobs)
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Call our own health endpoint
    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000";

    const healthRes = await fetch(`${baseUrl}/api/health`);
    const healthData = await healthRes.json();

    // Send Telegram alert if any services are down
    if (healthData.results) {
      await sendHealthReport(healthData.results);
    }

    return NextResponse.json({
      success: true,
      checkedAt: healthData.checkedAt,
      total: healthData.total,
      up: healthData.up,
      down: healthData.down,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    // Try to send error notification
    try {
      const { sendAlert } = await import("@/lib/api/telegram");
      await sendAlert("critical", "Health Check Failed", message);
    } catch {
      // Telegram might not be configured
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
