import { NextRequest, NextResponse } from "next/server";
import { listProjects, getProject, listDeployments, getUsage } from "@/lib/api/vercel";
import { isDemoMode, demoVercelProjects } from "@/lib/demo-data";

export async function GET(request: NextRequest) {
  if (isDemoMode()) return NextResponse.json(demoVercelProjects);
  try {
    const { searchParams } = request.nextUrl;
    const action = searchParams.get("action") ?? "projects";
    const projectId = searchParams.get("projectId");

    switch (action) {
      case "projects":
        return NextResponse.json(await listProjects());

      case "project":
        if (!projectId) return NextResponse.json({ error: "projectId required" }, { status: 400 });
        return NextResponse.json(await getProject(projectId));

      case "deployments":
        if (!projectId) return NextResponse.json({ error: "projectId required" }, { status: 400 });
        const limit = parseInt(searchParams.get("limit") ?? "10");
        return NextResponse.json(await listDeployments(projectId, limit));

      case "usage":
        return NextResponse.json(await getUsage());

      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
