"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { LanguageDot, CICDBadge } from "@/components/dashboard/service-icon";
import { MgmtLink } from "@/components/dashboard/mgmt-link";
import { fetchApi } from "@/lib/fetchers";
import { mgmt } from "@/lib/utils";
import {
  GitBranch, ArrowLeft, Triangle, Server, Globe, RefreshCw,
  FileCode, GitCommit, Workflow, Container, CircleDot,
} from "lucide-react";
import type { GitHubRepo, GitHubWorkflowRun, GitHubCommit, VercelProject, CFZone, CFDNSRecord } from "@/lib/types";

interface CodeProjectMap {
  repo: GitHubRepo;
  platform: "vercel" | "hetzner" | "none";
  vercelProject?: { name: string; id: string; status: string; lastDeploy?: string };
  domains: string[];
  cicd: {
    hasActions: boolean;
    lastRun?: GitHubWorkflowRun;
    hasDockerfile?: boolean;
  };
  lastCommit?: GitHubCommit;
}

export default function CodeMapPage() {
  const [projects, setProjects] = useState<CodeProjectMap[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadData() {
    setLoading(true);
    try {
      // Fetch all data sources in parallel
      const [repos, vercelProjects, cfData] = await Promise.allSettled([
        fetchApi<GitHubRepo[]>("/api/github?action=repos"),
        fetchApi<VercelProject[]>("/api/vercel?action=projects"),
        fetchApi<{ zones: CFZone[] }>("/api/cloudflare?action=overview"),
      ]);

      const ghRepos = repos.status === "fulfilled" ? repos.value : [];
      const vProjects = vercelProjects.status === "fulfilled" ? vercelProjects.value : [];

      // Get DNS records for domain matching
      let dnsRecords: CFDNSRecord[] = [];
      if (cfData.status === "fulfilled" && cfData.value.zones.length > 0) {
        try {
          dnsRecords = await fetchApi<CFDNSRecord[]>(
            `/api/cloudflare?action=dns&zoneId=${cfData.value.zones[0].id}`
          );
        } catch { /* ignore */ }
      }

      // Build code project map
      const mapped: CodeProjectMap[] = await Promise.all(
        ghRepos.slice(0, 25).map(async (repo) => {
          const [owner, name] = repo.full_name.split("/");

          // Match to Vercel project
          const vercelMatch = vProjects.find(
            (vp) =>
              vp.link?.repo?.toLowerCase() === name.toLowerCase() ||
              vp.name.toLowerCase() === name.toLowerCase()
          );

          // Get CI/CD + last commit
          let lastRun: GitHubWorkflowRun | undefined;
          let lastCommit: GitHubCommit | undefined;
          let hasDockerfile = false;

          try {
            const [runsRes, commitsRes, dockerRes] = await Promise.allSettled([
              fetchApi<GitHubWorkflowRun[]>(`/api/github?action=runs&owner=${owner}&repo=${name}`),
              fetchApi<GitHubCommit[]>(`/api/github?action=commits&owner=${owner}&repo=${name}`),
              fetchApi<{ hasDockerfile: boolean }>(`/api/github?action=cicd&owner=${owner}&repo=${name}`),
            ]);
            if (runsRes.status === "fulfilled") lastRun = runsRes.value[0];
            if (commitsRes.status === "fulfilled") lastCommit = commitsRes.value[0];
            if (dockerRes.status === "fulfilled") hasDockerfile = (dockerRes.value as { hasDockerfile: boolean }).hasDockerfile;
          } catch { /* ignore */ }

          // Check if repo matches a DNS record (for Hetzner/Docker mapping)
          const matchingDNS = dnsRecords.filter(
            (r) => r.type === "A" && r.name.includes(name.toLowerCase().replace(/[^a-z0-9]/g, ""))
          );

          // Determine platform
          let platform: "vercel" | "hetzner" | "none" = "none";
          if (vercelMatch) platform = "vercel";
          else if (hasDockerfile || matchingDNS.length > 0) platform = "hetzner";

          // Domains
          const domains: string[] = [];
          if (vercelMatch?.domains) domains.push(...vercelMatch.domains.filter((d) => !d.includes("-sc122s-")));
          matchingDNS.forEach((r) => domains.push(r.name));

          return {
            repo,
            platform,
            vercelProject: vercelMatch
              ? {
                  name: vercelMatch.name,
                  id: vercelMatch.id,
                  status: vercelMatch.latestDeployment?.readyState ?? "unknown",
                  lastDeploy: vercelMatch.latestDeployment
                    ? new Date(vercelMatch.latestDeployment.createdAt).toISOString()
                    : undefined,
                }
              : undefined,
            domains,
            cicd: {
              hasActions: !!lastRun,
              lastRun,
              hasDockerfile,
            },
            lastCommit,
          };
        })
      );

      // Sort: connected projects first, then by last push
      mapped.sort((a, b) => {
        if (a.platform !== "none" && b.platform === "none") return -1;
        if (a.platform === "none" && b.platform !== "none") return 1;
        return new Date(b.repo.pushed_at).getTime() - new Date(a.repo.pushed_at).getTime();
      });

      setProjects(mapped);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadData(); }, []);

  const connected = projects.filter((p) => p.platform !== "none");
  const unconnected = projects.filter((p) => p.platform === "none");

  return (
    <main className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Code → Deploy Map</h1>
          <p className="text-muted-foreground">
            מיפוי מלא: קוד → פלטפורמה → deployment → דומיין
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={loadData} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ml-2 ${loading ? "animate-spin" : ""}`} />
          רענון
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Connected</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{connected.length}</div>
            <p className="text-xs text-muted-foreground">repos מחוברים לפלטפורמה</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Unconnected</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-muted-foreground">{unconnected.length}</div>
            <p className="text-xs text-muted-foreground">repos ללא deployment</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">With CI/CD</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {projects.filter((p) => p.cicd.hasActions).length}
            </div>
            <p className="text-xs text-muted-foreground">repos עם GitHub Actions</p>
          </CardContent>
        </Card>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-32 w-full" />)}
        </div>
      ) : (
        <>
          {/* Connected Projects */}
          {connected.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <CircleDot className="h-4 w-4 text-green-500" />
                פרויקטים מחוברים ({connected.length})
              </h2>
              {connected.map((p) => (
                <ProjectCard key={p.repo.id} project={p} />
              ))}
            </div>
          )}

          {/* Unconnected repos */}
          {unconnected.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-lg font-semibold flex items-center gap-2 text-muted-foreground">
                <CircleDot className="h-4 w-4" />
                Repos ללא deployment ({unconnected.length})
              </h2>
              {unconnected.map((p) => (
                <ProjectCard key={p.repo.id} project={p} compact />
              ))}
            </div>
          )}
        </>
      )}
    </main>
  );
}

function ProjectCard({ project: p, compact = false }: { project: CodeProjectMap; compact?: boolean }) {
  const platformIcon = p.platform === "vercel" ? Triangle : p.platform === "hetzner" ? Server : GitBranch;
  const platformLabel = p.platform === "vercel" ? "Vercel" : p.platform === "hetzner" ? "Hetzner/Docker" : "Not deployed";

  return (
    <Card className={compact ? "opacity-60 hover:opacity-100 transition-opacity" : ""}>
      <CardContent className="pt-4">
        <div className="flex items-start gap-4">
          {/* Repo info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <GitBranch className="h-4 w-4 text-muted-foreground shrink-0" />
              <a href={p.repo.html_url} target="_blank" rel="noopener noreferrer"
                className="font-semibold text-blue-500 hover:underline truncate">
                {p.repo.full_name}
              </a>
              <LanguageDot language={p.repo.language} />
              {p.repo.private && <Badge variant="outline" className="text-[10px] px-1">Private</Badge>}
            </div>

            {!compact && (
              <div className="flex items-center gap-6 mt-2 text-xs text-muted-foreground">
                {/* CI/CD */}
                <div className="flex items-center gap-1">
                  <Workflow className="h-3 w-3" />
                  {p.cicd.hasActions ? (
                    <CICDBadge conclusion={p.cicd.lastRun?.conclusion} />
                  ) : (
                    <span>No CI/CD</span>
                  )}
                </div>

                {/* Dockerfile */}
                {p.cicd.hasDockerfile && (
                  <div className="flex items-center gap-1">
                    <Container className="h-3 w-3" />
                    <span className="text-blue-500">Dockerfile</span>
                  </div>
                )}

                {/* Last commit */}
                {p.lastCommit && (
                  <div className="flex items-center gap-1 max-w-[250px]">
                    <GitCommit className="h-3 w-3 shrink-0" />
                    <span className="truncate">{p.lastCommit.commit.message}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Arrow */}
          <ArrowLeft className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />

          {/* Platform */}
          <div className="flex items-center gap-2 min-w-[120px]">
            {(() => { const Icon = platformIcon; return <Icon className="h-4 w-4 shrink-0" />; })()}
            <div>
              <p className="text-sm font-medium">{platformLabel}</p>
              {p.vercelProject && (
                <StatusBadge status={p.vercelProject.status} />
              )}
            </div>
          </div>

          {/* Arrow */}
          {p.domains.length > 0 && (
            <>
              <ArrowLeft className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
              <div className="min-w-[150px]">
                {p.domains.slice(0, 2).map((d) => (
                  <a key={d} href={`https://${d}`} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-blue-500 hover:underline">
                    <Globe className="h-3 w-3 shrink-0" />
                    {d}
                  </a>
                ))}
              </div>
            </>
          )}

          {/* Mgmt link */}
          <div className="shrink-0">
            {p.platform === "vercel" && p.vercelProject && (
              <MgmtLink href={mgmt.vercel.project(p.vercelProject.name)} tooltip="Vercel Dashboard" iconOnly />
            )}
            <MgmtLink href={p.repo.html_url} tooltip="GitHub" iconOnly />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
