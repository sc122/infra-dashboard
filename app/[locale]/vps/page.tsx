"use client";

import { useEffect, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { MetricsChart } from "@/components/dashboard/metrics-chart";
import { MgmtLink } from "@/components/dashboard/mgmt-link";
import { mgmt } from "@/lib/utils";
import { fetchApi } from "@/lib/fetchers";
import { Server, Cpu, HardDrive, MemoryStick, Globe, MapPin, RefreshCw, Activity } from "lucide-react";
import type { HetznerServer } from "@/lib/types";

interface MetricPoint {
  time: string;
  value: number;
}

export default function VPSPage() {
  const tCommon = useTranslations("Common");
  const tPage = useTranslations("VpsPage");
  const locale = useLocale();
  const [servers, setServers] = useState<HetznerServer[]>([]);
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<Record<number, { cpu: MetricPoint[]; networkIn: MetricPoint[]; networkOut: MetricPoint[]; diskRead: MetricPoint[]; diskWrite: MetricPoint[] }>>({});
  const [metricsLoading, setMetricsLoading] = useState(false);

  async function loadServers() {
    setLoading(true);
    try {
      const data = await fetchApi<HetznerServer[]>("/api/hetzner?action=servers");
      setServers(data);
      // Load metrics for each server
      loadMetrics(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function loadMetrics(serverList: HetznerServer[]) {
    setMetricsLoading(true);
    const metricsMap: typeof metrics = {};
    for (const s of serverList) {
      try {
        const [cpuData, networkData, diskData] = await Promise.allSettled([
          fetchApi<{ metrics: { timeseries: Record<string, { values: [number, string][] }> } }>(`/api/hetzner?action=metrics&serverId=${s.id}&type=cpu&period=24h`),
          fetchApi<{ metrics: { timeseries: Record<string, { values: [number, string][] }> } }>(`/api/hetzner?action=metrics&serverId=${s.id}&type=network&period=24h`),
          fetchApi<{ metrics: { timeseries: Record<string, { values: [number, string][] }> } }>(`/api/hetzner?action=metrics&serverId=${s.id}&type=disk&period=24h`),
        ]);

        const parseTimeseries = (result: PromiseSettledResult<{ metrics: { timeseries: Record<string, { values: [number, string][] }> } }>, key: string): MetricPoint[] => {
          if (result.status !== "fulfilled") return [];
          const ts = result.value?.metrics?.timeseries;
          if (!ts) return [];
          const series = ts[key] ?? Object.values(ts)[0];
          if (!series?.values) return [];
          return series.values.slice(-48).map(([timestamp, val]: [number, string]) => ({
            time: new Date(timestamp * 1000).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" }),
            value: parseFloat(val) || 0,
          }));
        };

        metricsMap[s.id] = {
          cpu: parseTimeseries(cpuData, "cpu"),
          networkIn: parseTimeseries(networkData, "network.0.bandwidth.in"),
          networkOut: parseTimeseries(networkData, "network.0.bandwidth.out"),
          diskRead: parseTimeseries(diskData, "disk.0.iops.read"),
          diskWrite: parseTimeseries(diskData, "disk.0.iops.write"),
        };
      } catch {
        metricsMap[s.id] = { cpu: [], networkIn: [], networkOut: [], diskRead: [], diskWrite: [] };
      }
    }
    setMetrics(metricsMap);
    setMetricsLoading(false);
  }

  useEffect(() => { loadServers(); }, []);

  if (loading) {
    return (
      <main className="p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </main>
    );
  }

  return (
    <main className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Hetzner VPS</h1>
          <p className="text-muted-foreground">{servers.length} servers</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={loadServers}>
            <RefreshCw className="h-4 w-4 me-2" />
            {tCommon("refresh")}
          </Button>
          <a href={mgmt.hetzner.overview()} target="_blank" rel="noopener noreferrer">
            <Button variant="outline" size="sm">
              Hetzner Console
            </Button>
          </a>
        </div>
      </div>

      {servers.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            <Server className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p>{tPage("noServers")}</p>
          </CardContent>
        </Card>
      ) : (
        servers.map((server) => (
          <div key={server.id} className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Server className="h-5 w-5" />
                    {server.name}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={server.status} />
                    <MgmtLink href={mgmt.hetzner.server(server.id)} label={tCommon("manage")} tooltip="Hetzner Server Console" />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Globe className="h-3 w-3" /> IP
                    </p>
                    <p className="font-mono text-sm">{server.public_net?.ipv4?.ip ?? "N/A"}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Cpu className="h-3 w-3" /> CPU
                    </p>
                    <p className="text-sm">{server.server_type?.cores} cores</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <MemoryStick className="h-3 w-3" /> RAM
                    </p>
                    <p className="text-sm">{server.server_type?.memory} GB</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <HardDrive className="h-3 w-3" /> Disk
                    </p>
                    <p className="text-sm">{server.server_type?.disk} GB</p>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <Badge variant="outline">
                    <MapPin className="h-3 w-3 me-1" />
                    {server.datacenter?.description ?? server.datacenter?.name}
                  </Badge>
                  {server.image && (
                    <Badge variant="secondary">
                      {server.image.os_flavor} {server.image.os_version}
                    </Badge>
                  )}
                  <Badge variant="secondary">{server.server_type?.description}</Badge>
                </div>
              </CardContent>
            </Card>

            {/* Metrics Charts */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Activity className="h-4 w-4" />
                  Server Metrics (24h)
                </CardTitle>
              </CardHeader>
              <CardContent>
                {metricsLoading ? (
                  <div className="space-y-4">
                    <Skeleton className="h-[200px] w-full" />
                    <Skeleton className="h-[200px] w-full" />
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <MetricsChart
                      data={metrics[server.id]?.cpu ?? []}
                      title="CPU Usage"
                      unit="%"
                      color="#3b82f6"
                    />
                    <MetricsChart
                      data={metrics[server.id]?.networkIn ?? []}
                      title="Network In"
                      unit=" B/s"
                      color="#10b981"
                    />
                    <MetricsChart
                      data={metrics[server.id]?.networkOut ?? []}
                      title="Network Out"
                      unit=" B/s"
                      color="#f59e0b"
                    />
                    <MetricsChart
                      data={metrics[server.id]?.diskRead ?? []}
                      title="Disk IOPS Read"
                      unit=""
                      color="#8b5cf6"
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        ))
      )}
    </main>
  );
}
