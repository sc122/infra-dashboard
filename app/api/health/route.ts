import { NextResponse } from "next/server";
import { runHealthChecks } from "@/lib/api/health-checker";

export const dynamic = "force-dynamic";

export async function GET() {
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
