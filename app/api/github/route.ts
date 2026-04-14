import { NextRequest, NextResponse } from "next/server";
import { listRepos, getRepo, getRepoCommits, listWorkflowRuns, getRepoCICD, extractRepoDeployTarget } from "@/lib/api/github";
import { isDemoMode, demoGitHubRepos, demoDeployTargets, demoCICD } from "@/lib/demo-data";

export async function GET(request: NextRequest) {
  if (isDemoMode()) {
    const action = request.nextUrl.searchParams.get("action") ?? "repos";
    if (action === "repos") return NextResponse.json(demoGitHubRepos);
    if (action === "all-deploy-targets") return NextResponse.json({ targets: demoDeployTargets, cicd: demoCICD });
    return NextResponse.json([]);
  }
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

      case "deploy-targets":
        if (!owner || !repo) return NextResponse.json({ error: "owner and repo required" }, { status: 400 });
        return NextResponse.json(await extractRepoDeployTarget(owner, repo));

      case "all-deploy-targets": {
        // Scan all repos: CI/CD info + deploy targets for Docker repos
        const allRepos = await listRepos();
        const targets: Record<string, string[]> = {};
        const cicdMap: Record<string, { hasDockerfile: boolean; hasActions: boolean; hasVercelConfig: boolean; lastConclusion: string | null }> = {};
        const checks = await Promise.allSettled(
          allRepos.slice(0, 25).map(async (r) => {
            const [o, n] = r.full_name.split("/");
            const cicd = await getRepoCICD(o, n);
            cicdMap[r.name] = {
              hasDockerfile: cicd.hasDockerfile,
              hasActions: cicd.hasActions,
              hasVercelConfig: cicd.hasVercelConfig,
              lastConclusion: cicd.lastRun?.conclusion ?? null,
            };
            if (cicd.hasDockerfile) {
              const t = await extractRepoDeployTarget(o, n);
              if (t.length > 0) targets[r.name] = t;
            }
          })
        );
        return NextResponse.json({ targets, cicd: cicdMap });
      }

      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
