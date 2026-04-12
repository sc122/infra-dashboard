"use client";

import { useEffect, useState } from "react";
import { OverviewCards } from "@/components/dashboard/overview-cards";
import { UnifiedTable } from "@/components/dashboard/unified-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchApi } from "@/lib/fetchers";
import type { VercelProject, UnifiedProject, HealthCheck } from "@/lib/types";
import { dockerProjects } from "@/lib/docker-projects";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<UnifiedProject[]>([]);
  const [summary, setSummary] = useState({
    vercelProjects: 0,
    cloudflareZones: 0,
    cloudflareBuckets: 0,
    hetznerServers: 0,
    healthUp: 0,
    healthDown: 0,
    healthTotal: 0,
  });

  async function loadData() {
    setLoading(true);
    try {
      const [vercelData, cfData, hetznerData, healthData] = await Promise.allSettled([
        fetchApi<VercelProject[]>("/api/vercel?action=projects"),
        fetchApi<{ zones: unknown[]; r2Buckets: unknown[]; workers: unknown[] }>("/api/cloudflare?action=overview"),
        fetchApi<{ id: number; name: string; status: string }[]>("/api/hetzner?action=servers"),
        fetchApi<{ results: HealthCheck[] }>("/api/health"),
      ]);

      const healthResults: HealthCheck[] =
        healthData.status === "fulfilled" ? healthData.value.results ?? [] : [];

      const unified: UnifiedProject[] = [];

      // Vercel projects
      if (vercelData.status === "fulfilled") {
        for (const p of vercelData.value) {
          unified.push({
            id: p.id,
            name: p.name,
            platform: "vercel",
            status: p.latestDeployment?.readyState === "READY" ? "healthy" : "degraded",
            url: p.domains?.[0] ? `https://${p.domains[0]}` : undefined,
            framework: p.framework ?? undefined,
            lastDeployAt: p.latestDeployment
              ? new Date(p.latestDeployment.createdAt).toISOString()
              : undefined,
            domains: p.domains ?? [],
            gitRepo: p.link ? `${p.link.org}/${p.link.repo}` : undefined,
          });
        }
      }

      // Docker projects (from config + health check status)
      for (const dp of dockerProjects) {
        const health = healthResults.find((h) => h.url?.includes(dp.subdomain));
        unified.push({
          id: `docker-${dp.repo}`,
          name: dp.name,
          platform: "docker",
          status: health?.status === "up" ? "healthy" : health?.status === "down" ? "down" : "unknown",
          url: `https://${dp.subdomain}`,
          framework: "Docker",
          domains: [dp.subdomain],
          gitRepo: `sc122/${dp.repo}`,
        });
      }

      setProjects(unified);
      setSummary({
        vercelProjects: vercelData.status === "fulfilled" ? vercelData.value.length : 0,
        cloudflareZones: cfData.status === "fulfilled" ? cfData.value.zones.length : 0,
        cloudflareBuckets: cfData.status === "fulfilled" ? cfData.value.r2Buckets.length : 0,
        hetznerServers: hetznerData.status === "fulfilled" ? hetznerData.value.length : 0,
        healthUp: unified.filter((p) => p.status === "healthy").length,
        healthDown: unified.filter((p) => p.status === "down").length,
        healthTotal: unified.length,
      });
    } catch (err) {
      console.error("Failed to load dashboard data:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  return (
    <main className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">סקירה כללית</h1>
          <p className="text-muted-foreground">מבט על כל התשתיות שלך</p>
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
