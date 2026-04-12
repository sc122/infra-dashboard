"use client";

import { useEffect, useState, useMemo } from "react";
import { OverviewCards, type PlatformSummary } from "@/components/dashboard/overview-cards";
import { UnifiedTable, classifyProject } from "@/components/dashboard/unified-table";
import { FilterBar, type Filters } from "@/components/dashboard/filter-bar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchApi } from "@/lib/fetchers";
import { discoverAllProjects, type Project, type DiscoveryInput } from "@/lib/project-discovery";
import type { VercelProject, CFDNSRecord, CFZone, HetznerServer, GitHubRepo, HealthCheck } from "@/lib/types";
import type { NetlifySite } from "@/lib/api/netlify";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<Project[]>([]);
  const [filters, setFilters] = useState<Filters>({ platform: null, status: null, tier: null, search: "" });
  const [summary, setSummary] = useState<PlatformSummary>({
    vercelProjects: 0, netlifyProjects: 0, cloudflareZones: 0, cloudflareBuckets: 0,
    hetznerServers: 0, healthUp: 0, healthDown: 0, healthTotal: 0,
  });

  async function loadData() {
    setLoading(true);
    try {
      const [vercelData, cfData, hetznerData, healthData, githubData, netlifyData] = await Promise.allSettled([
        fetchApi<VercelProject[]>("/api/vercel?action=projects"),
        fetchApi<{ zones: CFZone[]; r2Buckets: unknown[] }>("/api/cloudflare?action=overview"),
        fetchApi<HetznerServer[]>("/api/hetzner?action=servers"),
        fetchApi<{ results: HealthCheck[] }>("/api/health"),
        fetchApi<GitHubRepo[]>("/api/github?action=repos"),
        fetchApi<NetlifySite[]>("/api/netlify?action=sites"),
      ]);

      const vercelProjects = vercelData.status === "fulfilled" ? vercelData.value : [];
      const netlifySites = netlifyData.status === "fulfilled" ? netlifyData.value : [];
      const cfZones = cfData.status === "fulfilled" ? cfData.value.zones : [];
      const servers = hetznerData.status === "fulfilled" ? hetznerData.value : [];
      const healthResults = healthData.status === "fulfilled" ? healthData.value.results ?? [] : [];
      const repos = githubData.status === "fulfilled" ? githubData.value : [];

      let dnsRecords: CFDNSRecord[] = [];
      if (cfZones.length > 0) {
        try { dnsRecords = await fetchApi<CFDNSRecord[]>(`/api/cloudflare?action=dns&zoneId=${cfZones[0].id}`); } catch {}
      }

      let repoDeployTargets: Record<string, string[]> = {};
      let repoCICD: DiscoveryInput["repoCICD"] = {};
      try {
        const combined = await fetchApi<{
          targets: Record<string, string[]>;
          cicd: Record<string, { hasDockerfile: boolean; hasActions: boolean; hasVercelConfig: boolean; lastConclusion: string | null }>;
        }>("/api/github?action=all-deploy-targets");
        repoDeployTargets = combined.targets ?? {};
        // Convert to discovery format
        for (const [name, info] of Object.entries(combined.cicd ?? {})) {
          repoCICD[name] = {
            ...info,
            lastRun: info.lastConclusion ? { conclusion: info.lastConclusion } as never : undefined,
          };
        }
      } catch {}

      const input: DiscoveryInput = {
        vercelProjects, netlifySites, dnsRecords, hetznerServers: servers,
        repos, repoCICD, healthResults, repoDeployTargets,
      };
      const discovered = discoverAllProjects(input);

      setProjects(discovered);
      setSummary({
        vercelProjects: discovered.filter((p) => p.hosting.platform === "vercel").length,
        netlifyProjects: discovered.filter((p) => p.hosting.platform === "netlify").length,
        cloudflareZones: cfZones.length,
        cloudflareBuckets: cfData.status === "fulfilled" ? cfData.value.r2Buckets.length : 0,
        hetznerServers: servers.length,
        healthUp: discovered.filter((p) => p.status === "up" || p.status === "protected").length,
        healthDown: discovered.filter((p) => p.status === "down").length,
        healthTotal: discovered.length,
      });
    } catch (err) {
      console.error("Failed to load:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadData(); }, []);

  // Apply filters
  const filtered = useMemo(() => {
    return projects.filter((p) => {
      if (filters.platform && p.hosting.platform !== filters.platform) return false;
      if (filters.status) {
        const isUp = p.status === "up" || p.status === "protected";
        if (filters.status === "up" && !isUp) return false;
        if (filters.status === "down" && p.status !== "down") return false;
      }
      if (filters.tier && classifyProject(p) !== filters.tier) return false;
      if (filters.search) {
        const q = filters.search.toLowerCase();
        const match = p.name.toLowerCase().includes(q) ||
          p.domain.toLowerCase().includes(q) ||
          p.repos.some((r) => r.name.toLowerCase().includes(q));
        if (!match) return false;
      }
      return true;
    });
  }, [projects, filters]);

  // Counts for filter bar
  const counts = useMemo(() => {
    const platforms: Record<string, number> = {};
    let production = 0, active = 0, inactive = 0;
    for (const p of projects) {
      platforms[p.hosting.platform] = (platforms[p.hosting.platform] ?? 0) + 1;
      const tier = classifyProject(p);
      if (tier === "production") production++;
      else if (tier === "active") active++;
      else inactive++;
    }
    return { total: projects.length, production, active, inactive, platforms };
  }, [projects]);

  return (
    <main className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">סקירה כללית</h1>
          <p className="text-muted-foreground">
            {projects.length} פרויקטים מזוהים אוטומטית
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={loadData} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ml-2 ${loading ? "animate-spin" : ""}`} />
          רענון
        </Button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader><Skeleton className="h-4 w-20" /></CardHeader>
              <CardContent><Skeleton className="h-8 w-32" /></CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <OverviewCards data={summary} />
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle>כל הפרויקטים</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : (
            <>
              <FilterBar filters={filters} onChange={setFilters} counts={counts} />
              <UnifiedTable projects={filtered} />
              {filtered.length === 0 && projects.length > 0 && (
                <p className="text-center text-sm text-muted-foreground py-8">
                  אין תוצאות לפילטרים הנוכחיים
                </p>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
