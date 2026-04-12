"use client";

import { useEffect, useState } from "react";
import { OverviewCards, type PlatformSummary } from "@/components/dashboard/overview-cards";
import { UnifiedTable } from "@/components/dashboard/unified-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchApi } from "@/lib/fetchers";
import { discoverAllProjects, type Project, type DiscoveryInput } from "@/lib/project-discovery";
import type { VercelProject, CFDNSRecord, CFZone, HetznerServer, GitHubRepo, HealthCheck } from "@/lib/types";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<Project[]>([]);
  const [summary, setSummary] = useState<PlatformSummary>({
    vercelProjects: 0, cloudflareZones: 0, cloudflareBuckets: 0,
    hetznerServers: 0, healthUp: 0, healthDown: 0, healthTotal: 0,
  });

  async function loadData() {
    setLoading(true);
    try {
      // Fetch all data sources in parallel
      const [vercelData, cfData, hetznerData, healthData, githubData] = await Promise.allSettled([
        fetchApi<VercelProject[]>("/api/vercel?action=projects"),
        fetchApi<{ zones: CFZone[]; r2Buckets: unknown[] }>("/api/cloudflare?action=overview"),
        fetchApi<HetznerServer[]>("/api/hetzner?action=servers"),
        fetchApi<{ results: HealthCheck[] }>("/api/health"),
        fetchApi<GitHubRepo[]>("/api/github?action=repos"),
      ]);

      const vercelProjects = vercelData.status === "fulfilled" ? vercelData.value : [];
      const cfZones = cfData.status === "fulfilled" ? cfData.value.zones : [];
      const servers = hetznerData.status === "fulfilled" ? hetznerData.value : [];
      const healthResults = healthData.status === "fulfilled" ? healthData.value.results ?? [] : [];
      const repos = githubData.status === "fulfilled" ? githubData.value : [];

      // Fetch DNS records
      let dnsRecords: CFDNSRecord[] = [];
      if (cfZones.length > 0) {
        try {
          dnsRecords = await fetchApi<CFDNSRecord[]>(`/api/cloudflare?action=dns&zoneId=${cfZones[0].id}`);
        } catch { /* ignore */ }
      }

      // Discover all projects automatically
      const input: DiscoveryInput = {
        vercelProjects, dnsRecords, hetznerServers: servers,
        repos, repoCICD: {}, healthResults,
      };
      const discovered = discoverAllProjects(input);

      setProjects(discovered);
      setSummary({
        vercelProjects: discovered.filter((p) => p.hosting.platform === "vercel").length,
        cloudflareZones: cfZones.length,
        cloudflareBuckets: cfData.status === "fulfilled" ? cfData.value.r2Buckets.length : 0,
        hetznerServers: servers.length,
        healthUp: discovered.filter((p) => p.status === "up" || p.status === "protected").length,
        healthDown: discovered.filter((p) => p.status === "down").length,
        healthTotal: discovered.length,
      });
    } catch (err) {
      console.error("Failed to load dashboard data:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadData(); }, []);

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
        <CardHeader>
          <CardTitle>כל הפרויקטים</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <UnifiedTable projects={projects} />
          )}
        </CardContent>
      </Card>
    </main>
  );
}
