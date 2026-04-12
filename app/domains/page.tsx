"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchApi } from "@/lib/fetchers";
import { Globe, ArrowLeft, Server, Triangle, Cloud, ExternalLink } from "lucide-react";
import type { VercelProject, CFZone, CFDNSRecord, HetznerServer } from "@/lib/types";

interface DomainMapping {
  domain: string;
  type: "root" | "subdomain";
  target: string;
  platform: "vercel" | "cloudflare-vps" | "cloudflare-other" | "unknown";
  projectName?: string;
  proxied?: boolean;
  recordType?: string;
}

export default function DomainsPage() {
  const [mappings, setMappings] = useState<DomainMapping[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [vercelProjects, cfOverview, hetznerServers] = await Promise.allSettled([
          fetchApi<VercelProject[]>("/api/vercel?action=projects"),
          fetchApi<{ zones: CFZone[]; r2Buckets: unknown[] }>("/api/cloudflare?action=overview"),
          fetchApi<HetznerServer[]>("/api/hetzner?action=servers"),
        ]);

        const maps: DomainMapping[] = [];

        // Get Hetzner IPs for matching
        const hetznerIPs = new Set<string>();
        if (hetznerServers.status === "fulfilled") {
          for (const s of hetznerServers.value) {
            if (s.public_net?.ipv4?.ip) hetznerIPs.add(s.public_net.ipv4.ip);
          }
        }

        // Vercel domain mappings
        if (vercelProjects.status === "fulfilled") {
          for (const p of vercelProjects.value) {
            for (const d of p.domains ?? []) {
              // Skip vercel.app default domains
              if (d.endsWith(".vercel.app")) continue;
              maps.push({
                domain: d,
                type: d.startsWith("www.") ? "subdomain" : "root",
                target: `Vercel: ${p.name}`,
                platform: "vercel",
                projectName: p.name,
              });
            }
          }
        }

        // Cloudflare DNS mappings
        if (cfOverview.status === "fulfilled") {
          for (const zone of cfOverview.value.zones) {
            try {
              const records = await fetchApi<CFDNSRecord[]>(
                `/api/cloudflare?action=dns&zoneId=${zone.id}`
              );
              for (const r of records) {
                if (r.type !== "A" && r.type !== "AAAA" && r.type !== "CNAME") continue;
                const isVPS = r.type === "A" && hetznerIPs.has(r.content);
                maps.push({
                  domain: r.name,
                  type: r.name === zone.name ? "root" : "subdomain",
                  target: isVPS ? `Hetzner VPS (${r.content})` : r.content,
                  platform: isVPS ? "cloudflare-vps" : "cloudflare-other",
                  proxied: r.proxied,
                  recordType: r.type,
                });
              }
            } catch {
              // ignore
            }
          }
        }

        // Deduplicate: prefer CF records over Vercel for same domain
        const seen = new Set<string>();
        const deduped = maps.filter((m) => {
          if (seen.has(m.domain)) return false;
          seen.add(m.domain);
          return true;
        });

        setMappings(deduped);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <main className="p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96 w-full" />
      </main>
    );
  }

  const platformIcon = (platform: string) => {
    switch (platform) {
      case "vercel": return <Triangle className="h-4 w-4" />;
      case "cloudflare-vps": return <Server className="h-4 w-4 text-red-500" />;
      default: return <Cloud className="h-4 w-4 text-orange-500" />;
    }
  };

  // Group by root domain
  const grouped: Record<string, DomainMapping[]> = {};
  for (const m of mappings) {
    const root = m.domain.split(".").slice(-2).join(".");
    if (!grouped[root]) grouped[root] = [];
    grouped[root].push(m);
  }

  return (
    <main className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">מפת דומיינים</h1>
        <p className="text-muted-foreground">
          {mappings.length} records מוגדרים &middot; מיפוי domain → platform → service
        </p>
      </div>

      {Object.entries(grouped).map(([root, items]) => (
        <Card key={root}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              {root}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {items.map((m, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-2 min-w-[200px]">
                    <a
                      href={`https://${m.domain}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-sm text-blue-500 hover:underline flex items-center gap-1"
                    >
                      {m.domain}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                  <ArrowLeft className="h-4 w-4 text-muted-foreground" />
                  <div className="flex items-center gap-2">
                    {platformIcon(m.platform)}
                    <span className="text-sm">{m.target}</span>
                  </div>
                  <div className="flex gap-1 mr-auto">
                    {m.recordType && (
                      <Badge variant="outline" className="text-xs">{m.recordType}</Badge>
                    )}
                    {m.proxied && (
                      <Badge variant="outline" className="text-xs text-orange-500">Proxied</Badge>
                    )}
                    {m.projectName && (
                      <Badge variant="secondary" className="text-xs">{m.projectName}</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </main>
  );
}
