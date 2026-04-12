import { NextRequest, NextResponse } from "next/server";
import { listZones, listDNSRecords, listR2Buckets, listWorkers } from "@/lib/api/cloudflare";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const action = searchParams.get("action") ?? "overview";
    const zoneId = searchParams.get("zoneId");

    switch (action) {
      case "overview": {
        const [zones, r2, workers] = await Promise.allSettled([
          listZones(),
          listR2Buckets(),
          listWorkers(),
        ]);
        return NextResponse.json({
          zones: zones.status === "fulfilled" ? zones.value : [],
          r2Buckets: r2.status === "fulfilled" ? r2.value : [],
          workers: workers.status === "fulfilled" ? workers.value : [],
        });
      }

      case "zones":
        return NextResponse.json(await listZones());

      case "dns":
        if (!zoneId) return NextResponse.json({ error: "zoneId required" }, { status: 400 });
        return NextResponse.json(await listDNSRecords(zoneId));

      case "r2":
        return NextResponse.json(await listR2Buckets());

      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
