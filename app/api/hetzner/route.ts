import { NextRequest, NextResponse } from "next/server";
import { listServers, getServer, getServerMetrics } from "@/lib/api/hetzner";
import { isDemoMode, demoHetznerServers } from "@/lib/demo-data";

export async function GET(request: NextRequest) {
  if (isDemoMode()) return NextResponse.json(demoHetznerServers);
  try {
    const { searchParams } = request.nextUrl;
    const action = searchParams.get("action") ?? "servers";
    const serverId = searchParams.get("serverId");

    switch (action) {
      case "servers":
        return NextResponse.json(await listServers());

      case "server":
        if (!serverId) return NextResponse.json({ error: "serverId required" }, { status: 400 });
        return NextResponse.json(await getServer(parseInt(serverId)));

      case "metrics": {
        if (!serverId) return NextResponse.json({ error: "serverId required" }, { status: 400 });
        const type = (searchParams.get("type") ?? "cpu") as "cpu" | "disk" | "network";
        const period = searchParams.get("period") ?? "1h";
        return NextResponse.json(await getServerMetrics(parseInt(serverId), type, period));
      }

      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
