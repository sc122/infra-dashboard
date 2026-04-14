import { NextRequest, NextResponse } from "next/server";
import { listSites, getSite, listDeploys } from "@/lib/api/netlify";
import { isDemoMode, demoNetlifySites } from "@/lib/demo-data";

export async function GET(request: NextRequest) {
  if (isDemoMode()) return NextResponse.json(demoNetlifySites);
  try {
    const { searchParams } = request.nextUrl;
    const action = searchParams.get("action") ?? "sites";
    const siteId = searchParams.get("siteId");

    switch (action) {
      case "sites":
        return NextResponse.json(await listSites());

      case "site":
        if (!siteId) return NextResponse.json({ error: "siteId required" }, { status: 400 });
        return NextResponse.json(await getSite(siteId));

      case "deploys":
        if (!siteId) return NextResponse.json({ error: "siteId required" }, { status: 400 });
        return NextResponse.json(await listDeploys(siteId));

      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
