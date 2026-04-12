"use client";

import { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { LanguageDot, CICDBadge } from "@/components/dashboard/service-icon";
import { MgmtLink } from "@/components/dashboard/mgmt-link";
import { fetchApi } from "@/lib/fetchers";
import { cn } from "@/lib/utils";
import {
  GitBranch, ArrowLeft, Triangle, Server, Globe, RefreshCw,
  GitCommit, Container, Hexagon, Search, ChevronDown, ChevronUp,
  Link2, Link2Off, X,
} from "lucide-react";
import type { GitHubRepo, GitHubWorkflowRun, GitHubCommit, VercelProject, CFZone, CFDNSRecord } from "@/lib/types";
import type { NetlifySite } from "@/lib/api/netlify";

interface CodeProject {
  repo: GitHubRepo;
  platform: "vercel" | "netlify" | "docker" | "none";
  platformName?: string;
  domains: string[];
  cicd: { hasActions: boolean; lastRun?: GitHubWorkflowRun; hasDockerfile?: boolean };
  lastCommit?: GitHubCommit;
}

type FilterState = { platform: string | null; cicd: string | null; search: string };

export default function CodeMapPage() {
  const [projects, setProjects] = useState<CodeProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<FilterState>({ platform: null, cicd: null, search: "" });
  const [showUnconnected, setShowUnconnected] = useState(false);

  async function loadData() {
    setLoading(true);
    try {
      const [repos, vercelProjects, cfData, netlifyData, deployTargets] = await Promise.allSettled([
        fetchApi<GitHubRepo[]>("/api/github?action=repos"),
        fetchApi<VercelProject[]>("/api/vercel?action=projects"),
        fetchApi<{ zones: CFZone[] }>("/api/cloudflare?action=overview"),
        fetchApi<NetlifySite[]>("/api/netlify?action=sites"),
        fetchApi<Record<string, string[]>>("/api/github?action=all-deploy-targets"),
      ]);

      const ghRepos = repos.status === "fulfilled" ? repos.value : [];
      const vProjects = vercelProjects.status === "fulfilled" ? vercelProjects.value : [];
      const nSites = netlifyData.status === "fulfilled" ? netlifyData.value : [];
      const targets = deployTargets.status === "fulfilled" ? deployTargets.value : {};

      let dnsRecords: CFDNSRecord[] = [];
      if (cfData.status === "fulfilled" && cfData.value.zones.length > 0) {
        try {
          dnsRecords = await fetchApi<CFDNSRecord[]>(`/api/cloudflare?action=dns&zoneId=${cfData.value.zones[0].id}`);
        } catch {}
      }

      const mapped: CodeProject[] = await Promise.all(
        ghRepos.slice(0, 25).map(async (repo) => {
          const [owner, name] = repo.full_name.split("/");

          // Match platforms
          const vercelMatch = vProjects.find((vp) => vp.link?.repo?.toLowerCase() === name.toLowerCase());
          const netlifyMatch = nSites.find((ns) => ns.build_settings?.repo_url?.endsWith(`/${name}`));

          // CI/CD
          let lastRun: GitHubWorkflowRun | undefined;
          let lastCommit: GitHubCommit | undefined;
          let hasDockerfile = false;
          try {
            const [runsRes, commitsRes, cicdRes] = await Promise.allSettled([
              fetchApi<GitHubWorkflowRun[]>(`/api/github?action=runs&owner=${owner}&repo=${name}`),
              fetchApi<GitHubCommit[]>(`/api/github?action=commits&owner=${owner}&repo=${name}`),
              fetchApi<{ hasDockerfile: boolean }>(`/api/github?action=cicd&owner=${owner}&repo=${name}`),
            ]);
            if (runsRes.status === "fulfilled") lastRun = runsRes.value[0];
            if (commitsRes.status === "fulfilled") lastCommit = commitsRes.value[0];
            if (cicdRes.status === "fulfilled") hasDockerfile = (cicdRes.value as { hasDockerfile: boolean }).hasDockerfile;
          } catch {}

          // Deploy targets from repo config
          const repoTargets = targets[name] ?? [];
          const dnsMatch = dnsRecords.some((r) =>
            r.type === "A" && (repoTargets.some((t) => r.name.includes(t)) ||
            r.name.split(".")[0].includes(name.toLowerCase().replace(/[-_]/g, "")))
          );

          // Determine platform
          let platform: CodeProject["platform"] = "none";
          let platformName = "";
          const domains: string[] = [];
          if (vercelMatch) {
            platform = "vercel"; platformName = vercelMatch.name;
            const teamFilter = process.env.NEXT_PUBLIC_VERCEL_TEAM_SLUG?.replace("-projects", "") || "";
            domains.push(...(vercelMatch.domains?.filter((d) => !(teamFilter && d.includes(`-${teamFilter}-`)) && !d.includes("-git-")) ?? []));
          } else if (netlifyMatch) {
            platform = "netlify"; platformName = netlifyMatch.name;
            domains.push(netlifyMatch.custom_domain ?? `${netlifyMatch.name}.netlify.app`);
          } else if (hasDockerfile || dnsMatch) {
            platform = "docker"; platformName = "VPS";
            // Find matching DNS
            for (const r of dnsRecords) {
              if (r.type !== "A") continue;
              const sub = r.name.split(".")[0];
              if (repoTargets.some((t) => r.name.includes(t) || t.includes(sub)) ||
                  sub.includes(name.toLowerCase().replace(/[-_]/g, ""))) {
                domains.push(r.name);
              }
            }
          }

          return { repo, platform, platformName, domains, cicd: { hasActions: !!lastRun, lastRun, hasDockerfile }, lastCommit };
        })
      );

      mapped.sort((a, b) => {
        if (a.platform !== "none" && b.platform === "none") return -1;
        if (a.platform === "none" && b.platform !== "none") return 1;
        return new Date(b.repo.pushed_at).getTime() - new Date(a.repo.pushed_at).getTime();
      });

      setProjects(mapped);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  useEffect(() => { loadData(); }, []);

  const connected = useMemo(() => projects.filter((p) => p.platform !== "none"), [projects]);
  const unconnected = useMemo(() => projects.filter((p) => p.platform === "none"), [projects]);

  const filtered = useMemo(() => {
    const apply = (list: CodeProject[]) => list.filter((p) => {
      if (filters.platform && p.platform !== filters.platform) return false;
      if (filters.cicd === "yes" && !p.cicd.hasActions) return false;
      if (filters.cicd === "no" && p.cicd.hasActions) return false;
      if (filters.search) {
        const q = filters.search.toLowerCase();
        return p.repo.name.toLowerCase().includes(q) || p.domains.some((d) => d.includes(q));
      }
      return true;
    });
    return { connected: apply(connected), unconnected: apply(unconnected) };
  }, [connected, unconnected, filters]);

  const toggle = (key: keyof FilterState, value: string) => {
    setFilters((f) => ({ ...f, [key]: f[key] === value ? null : value }));
  };

  const platformIcon = { vercel: Triangle, netlify: Hexagon, docker: Container, none: GitBranch };
  const hasFilter = filters.platform || filters.cicd || filters.search;

  if (loading) {
    return <main className="p-6 space-y-6"><Skeleton className="h-8 w-48" /><Skeleton className="h-32 w-full" /><Skeleton className="h-96 w-full" /></main>;
  }

  return (
    <main className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Code → Deploy Map</h1>
          <p className="text-muted-foreground">מיפוי: קוד → פלטפורמה → deployment → דומיין</p>
        </div>
        <Button variant="outline" size="sm" onClick={loadData}><RefreshCw className="h-4 w-4 ml-2" />רענון</Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent className="pt-4 text-center">
          <div className="text-2xl font-bold text-green-600">{connected.length}</div>
          <p className="text-xs text-muted-foreground">repos מחוברים</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 text-center">
          <div className="text-2xl font-bold text-muted-foreground">{unconnected.length}</div>
          <p className="text-xs text-muted-foreground">ללא deployment</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 text-center">
          <div className="text-2xl font-bold text-blue-600">{projects.filter((p) => p.cicd.hasActions).length}</div>
          <p className="text-xs text-muted-foreground">עם CI/CD</p>
        </CardContent></Card>
      </div>

      <Card>
        <CardContent className="pt-4">
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2 pb-3">
            <div className="relative">
              <Search className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input type="text" placeholder="חיפוש repo..." value={filters.search}
                onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
                className="h-8 w-40 rounded-md border bg-transparent pr-8 pl-2 text-xs outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <div className="w-px h-6 bg-border" />
            {(["vercel", "netlify", "docker"] as const).map((pl) => {
              const Icon = platformIcon[pl];
              const count = projects.filter((p) => p.platform === pl).length;
              return (
                <button key={pl} data-active={filters.platform === pl} onClick={() => toggle("platform", pl)}
                  className="inline-flex items-center gap-1 h-7 px-2.5 rounded-full text-xs font-medium border transition-all hover:bg-muted data-[active=true]:bg-primary data-[active=true]:text-primary-foreground">
                  <Icon className="h-3 w-3" />{pl === "docker" ? "Docker" : pl.charAt(0).toUpperCase() + pl.slice(1)}<span className="opacity-60">{count}</span>
                </button>
              );
            })}
            <div className="w-px h-6 bg-border" />
            <button data-active={filters.cicd === "yes"} onClick={() => toggle("cicd", "yes")}
              className="inline-flex items-center gap-1 h-7 px-2.5 rounded-full text-xs font-medium border transition-all hover:bg-muted data-[active=true]:bg-green-500 data-[active=true]:text-white">
              CI/CD ✓
            </button>
            <button data-active={filters.cicd === "no"} onClick={() => toggle("cicd", "no")}
              className="inline-flex items-center gap-1 h-7 px-2.5 rounded-full text-xs font-medium border transition-all hover:bg-muted data-[active=true]:bg-red-500 data-[active=true]:text-white">
              No CI/CD
            </button>
            {hasFilter && (
              <button onClick={() => setFilters({ platform: null, cicd: null, search: "" })}
                className="inline-flex items-center gap-1 h-7 px-2 rounded-full text-xs text-muted-foreground hover:text-foreground border hover:bg-muted">
                <X className="h-3 w-3" />נקה
              </button>
            )}
          </div>

          {/* Connected repos table */}
          {filtered.connected.length > 0 && (
            <>
              <div className="flex items-center gap-2 text-xs font-semibold text-green-600 py-2">
                <Link2 className="h-3.5 w-3.5" />מחוברים ({filtered.connected.length})
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">Repo</TableHead>
                    <TableHead className="text-right w-[60px]">שפה</TableHead>
                    <TableHead className="text-right">Last Commit</TableHead>
                    <TableHead className="text-right w-[100px]">פלטפורמה</TableHead>
                    <TableHead className="text-right">דומיין</TableHead>
                    <TableHead className="text-right w-[80px]">CI/CD</TableHead>
                    <TableHead className="text-right w-[40px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.connected.map((p) => <RepoRow key={p.repo.id} project={p} />)}
                </TableBody>
              </Table>
            </>
          )}

          {/* Unconnected repos */}
          {filtered.unconnected.length > 0 && (
            <>
              <button className="flex items-center gap-2 text-xs font-semibold text-muted-foreground py-3 w-full hover:text-foreground transition-colors"
                onClick={() => setShowUnconnected(!showUnconnected)}>
                {showUnconnected ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                <Link2Off className="h-3.5 w-3.5" />
                ללא deployment ({filtered.unconnected.length})
                {!showUnconnected && <span className="font-normal text-[10px]">— לחץ להצגה</span>}
              </button>
              {showUnconnected && (
                <Table>
                  <TableBody>
                    {filtered.unconnected.map((p) => <RepoRow key={p.repo.id} project={p} compact />)}
                  </TableBody>
                </Table>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </main>
  );
}

function RepoRow({ project: p, compact = false }: { project: CodeProject; compact?: boolean }) {
  const Icon = { vercel: Triangle, netlify: Hexagon, docker: Container, none: GitBranch }[p.platform];
  const platformLabel = { vercel: "Vercel", netlify: "Netlify", docker: "Docker", none: "-" }[p.platform];

  return (
    <TableRow className={cn(
      compact ? "opacity-60 hover:opacity-100" : "",
      p.platform !== "none" ? "border-r-2 border-r-green-500" : "border-r-2 border-r-transparent"
    )}>
      <TableCell>
        <a href={p.repo.html_url} target="_blank" rel="noopener noreferrer"
          className="font-medium text-sm text-blue-500 hover:underline inline-flex items-center gap-1">
          <GitBranch className="h-3.5 w-3.5 shrink-0" />
          {p.repo.name}
        </a>
        {p.repo.private && <Badge variant="outline" className="text-[9px] px-1 mr-1">Private</Badge>}
      </TableCell>
      <TableCell><LanguageDot language={p.repo.language} /></TableCell>
      <TableCell className="text-xs text-muted-foreground max-w-[180px]">
        {p.lastCommit ? (
          <span className="flex items-center gap-1 truncate">
            <GitCommit className="h-3 w-3 shrink-0" />
            <span className="truncate">{p.lastCommit.commit.message.split("\n")[0]}</span>
          </span>
        ) : "-"}
      </TableCell>
      <TableCell>
        {p.platform !== "none" ? (
          <div className="flex items-center gap-1.5">
            <Icon className="h-3.5 w-3.5" />
            <span className="text-xs">{platformLabel}</span>
          </div>
        ) : <span className="text-xs text-muted-foreground">-</span>}
      </TableCell>
      <TableCell>
        {p.domains.length > 0 ? (
          <a href={`https://${p.domains[0]}`} target="_blank" rel="noopener noreferrer"
            className="text-xs text-blue-500 hover:underline inline-flex items-center gap-1">
            <Globe className="h-3 w-3 shrink-0" />
            <span className="truncate max-w-[150px]">{p.domains[0]}</span>
          </a>
        ) : <span className="text-xs text-muted-foreground">-</span>}
      </TableCell>
      <TableCell>
        {p.cicd.hasActions ? (
          <CICDBadge conclusion={p.cicd.lastRun?.conclusion} />
        ) : p.cicd.hasDockerfile ? (
          <Badge variant="outline" className="text-[10px] px-1">Dockerfile</Badge>
        ) : <span className="text-xs text-muted-foreground">-</span>}
      </TableCell>
      <TableCell>
        <MgmtLink href={p.repo.html_url} tooltip="GitHub" iconOnly />
      </TableCell>
    </TableRow>
  );
}
