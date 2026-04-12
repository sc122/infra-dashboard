import { NextRequest, NextResponse } from "next/server";
import { listRepos, getRepo, getRepoCommits, listWorkflowRuns, getRepoCICD, extractRepoDeployTarget } from "@/lib/api/github";

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

      case "deploy-targets":
        if (!owner || !repo) return NextResponse.json({ error: "owner and repo required" }, { status: 400 });
        return NextResponse.json(await extractRepoDeployTarget(owner, repo));

      case "all-deploy-targets": {
        // Scan all repos with Dockerfiles for domain references
        const allRepos = await listRepos();
        const targets: Record<string, string[]> = {};
        const cicdChecks = await Promise.allSettled(
          allRepos.slice(0, 20).map(async (r) => {
            const [o, n] = r.full_name.split("/");
            const cicd = await getRepoCICD(o, n);
            if (cicd.hasDockerfile) {
              const t = await extractRepoDeployTarget(o, n);
              if (t.length > 0) return { name: r.name, targets: t };
            }
            return null;
          })
        );
        for (const r of cicdChecks) {
          if (r.status === "fulfilled" && r.value) {
            targets[r.value.name] = r.value.targets;
          }
        }
        return NextResponse.json(targets);
      }

      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
