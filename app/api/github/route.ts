import { NextRequest, NextResponse } from "next/server";
import { listRepos, getRepo, getRepoCommits, listWorkflowRuns, getRepoCICD } from "@/lib/api/github";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const action = searchParams.get("action") ?? "repos";
    const owner = searchParams.get("owner") ?? "";
    const repo = searchParams.get("repo") ?? "";

    switch (action) {
      case "repos":
        return NextResponse.json(await listRepos());

      case "repo":
        if (!owner || !repo) return NextResponse.json({ error: "owner and repo required" }, { status: 400 });
        return NextResponse.json(await getRepo(owner, repo));

      case "commits":
        if (!owner || !repo) return NextResponse.json({ error: "owner and repo required" }, { status: 400 });
        const limit = parseInt(searchParams.get("limit") ?? "5");
        return NextResponse.json(await getRepoCommits(owner, repo, limit));

      case "runs":
        if (!owner || !repo) return NextResponse.json({ error: "owner and repo required" }, { status: 400 });
        return NextResponse.json(await listWorkflowRuns(owner, repo));

      case "cicd":
        if (!owner || !repo) return NextResponse.json({ error: "owner and repo required" }, { status: 400 });
        return NextResponse.json(await getRepoCICD(owner, repo));

      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
