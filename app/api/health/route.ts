import { NextResponse } from "next/server";
import { runHealthChecks } from "@/lib/api/health-checker";
import { isDemoMode, demoHealthResults } from "@/lib/demo-data";

export const dynamic = "force-dynamic";

export async function GET() {
  if (isDemoMode()) {
    const r = demoHealthResults;
    return NextResponse.json({ checkedAt: new Date().toISOString(), total: r.length, up: r.filter((h) => h.status === "up").length, down: r.filter((h) => h.status === "down").length, results: r });
  }
  try {
    const results = await runHealthChecks();
    return NextResponse.json({
      checkedAt: new Date().toISOString(),
      total: results.length,
      up: results.filter((r) => r.status === "up").length,
      down: results.filter((r) => r.status === "down").length,
      results,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
