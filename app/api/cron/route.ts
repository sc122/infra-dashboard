import { NextRequest, NextResponse } from "next/server";
import { sendDailyReport, sendServiceDown, sendCriticalFinding } from "@/lib/api/telegram";
import { runAudit } from "@/lib/audit/engine";
import { runHealthChecks } from "@/lib/api/health-checker";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // ── Step 1: Health check (direct, no self-fetch) ──
    const healthResults = await runHealthChecks();

    // ── Step 2: Run audit ──
    const audit = await runAudit();

    // ── Step 3: Send daily report (always, even if all OK) ──
    try {
      await sendDailyReport(healthResults, audit);
    } catch (err) {
      console.error("Failed to send daily report:", err);
    }

    // ── Step 4: Immediate alerts for DOWN services ──
    const downServices = healthResults.filter((h) => h.status === "down");
    if (downServices.length > 0) {
      try {
        await sendServiceDown(downServices);
      } catch {
        // Already reported in daily report
      }
    }

    // ── Step 5: Immediate alerts for NEW critical findings ──
    const criticalFindings = audit.findings.filter((f) => f.severity === "critical");
    for (const finding of criticalFindings) {
      try {
        await sendCriticalFinding(finding);
      } catch {
        // Already in daily report
      }
    }

    return NextResponse.json({
      success: true,
      healthChecked: healthResults.length,
      healthUp: healthResults.filter((h) => h.status === "up").length,
      healthDown: downServices.length,
      auditScore: audit.score,
      auditFindings: audit.summary.total,
      criticalAlerts: criticalFindings.length,
      reportSent: true,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    try {
      const { sendAlert } = await import("@/lib/api/telegram");
      await sendAlert("critical", "Cron Job Failed", message);
    } catch { /* Telegram might be down too */ }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
