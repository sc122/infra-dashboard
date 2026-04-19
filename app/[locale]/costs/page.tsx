"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { UsageBar } from "@/components/dashboard/usage-bar";
import { MgmtLink } from "@/components/dashboard/mgmt-link";
import { fetchApi } from "@/lib/fetchers";
import { mgmt } from "@/lib/utils";
import { DollarSign, Triangle, Cloud, Server, Hexagon, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { VercelUsage } from "@/lib/api/vercel";
import type { NetlifySite } from "@/lib/api/netlify";
import type { CFZone } from "@/lib/types";

interface HetznerServerInfo {
  id: number;
  name: string;
  server_type: { name: string; cores: number; memory: number; disk: number; description: string };
}

// Known Hetzner pricing (EUR/month)
const HETZNER_PRICES: Record<string, number> = {
  cx22: 3.29, cx32: 5.39, cx42: 15.59, cx52: 28.19,
  cx23: 4.51, cx33: 7.59, cx43: 20.79, cx53: 38.59,
  cpx11: 3.85, cpx21: 7.09, cpx31: 13.09, cpx41: 24.49, cpx51: 47.39,
  cax11: 3.29, cax21: 5.69, cax31: 9.49, cax41: 17.49,
};

export default function CostsPage() {
  const [loading, setLoading] = useState(true);
  const [vercelUsage, setVercelUsage] = useState<VercelUsage | null>(null);
  const [cfZones, setCfZones] = useState<CFZone[]>([]);
  const [hetznerServers, setHetznerServers] = useState<HetznerServerInfo[]>([]);
  const [netlifySites, setNetlifySites] = useState<NetlifySite[]>([]);

  async function loadData() {
    setLoading(true);
    try {
      const [usage, cfData, hetzner, netlify] = await Promise.allSettled([
        fetchApi<VercelUsage>("/api/vercel?action=usage"),
        fetchApi<{ zones: CFZone[] }>("/api/cloudflare?action=overview"),
        fetchApi<HetznerServerInfo[]>("/api/hetzner?action=servers"),
        fetchApi<NetlifySite[]>("/api/netlify?action=sites"),
      ]);
      if (usage.status === "fulfilled") setVercelUsage(usage.value);
      if (cfData.status === "fulfilled") setCfZones(cfData.value.zones);
      if (hetzner.status === "fulfilled") setHetznerServers(hetzner.value);
      if (netlify.status === "fulfilled") setNetlifySites(netlify.value);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadData(); }, []);

  const hetznerTotal = hetznerServers.reduce((sum, s) => {
    const price = HETZNER_PRICES[s.server_type?.name?.toLowerCase()] ?? 0;
    return sum + price;
  }, 0);

  const totalCost = hetznerTotal; // Vercel Hobby + CF Free = $0

  if (loading) {
    return (
      <main className="p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </main>
    );
  }

  return (
    <main className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">עלויות וניצולת</h1>
          <p className="text-muted-foreground">מעקב עלויות וניצולת משאבים לכל הפלטפורמות</p>
        </div>
        <Button variant="outline" size="sm" onClick={loadData}>
          <RefreshCw className="h-4 w-4 ml-2" />
          רענון
        </Button>
      </div>

      {/* Total */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>עלות חודשית כוללת (משוערת)</CardTitle>
          <DollarSign className="h-5 w-5 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-4xl font-bold">
            €{hetznerTotal.toFixed(2)}
            <span className="text-sm font-normal text-muted-foreground mr-2">/חודש</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Vercel Hobby (חינם) + Netlify Free (חינם) + Cloudflare Free (חינם) + Hetzner €{hetznerTotal.toFixed(2)}
          </p>
        </CardContent>
      </Card>

      {/* Vercel */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Triangle className="h-4 w-4" />
              Vercel
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">Hobby (Free)</Badge>
              <MgmtLink href={mgmt.vercel.usage()} label="ניהול" tooltip="Vercel Usage Dashboard" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {vercelUsage ? (
            <>
              <UsageBar
                label="Bandwidth"
                used={vercelUsage.bandwidth.used}
                limit={vercelUsage.bandwidth.limit}
                unit={vercelUsage.bandwidth.unit}
                formatUsed={(n) => n.toFixed(2)}
              />
              <UsageBar
                label="Build Minutes"
                used={vercelUsage.buildMinutes.used}
                limit={vercelUsage.buildMinutes.limit}
                unit={vercelUsage.buildMinutes.unit}
                formatUsed={(n) => n.toFixed(0)}
              />
              <UsageBar
                label="Serverless Function Execution"
                used={vercelUsage.serverlessFunctions.used}
                limit={vercelUsage.serverlessFunctions.limit}
                unit={vercelUsage.serverlessFunctions.unit}
                formatUsed={(n) => n.toFixed(2)}
              />
              <UsageBar
                label="Source Images (OG)"
                used={vercelUsage.sourceImages.used}
                limit={vercelUsage.sourceImages.limit}
                unit={vercelUsage.sourceImages.unit}
              />
            </>
          ) : (
            <p className="text-sm text-muted-foreground">לא הצלחתי לטעון נתוני usage. ייתכן שה-API לא תומך ב-Hobby plan.</p>
          )}
        </CardContent>
      </Card>

      {/* Netlify */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Hexagon className="h-4 w-4 text-teal-500" />
              Netlify
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">Free ({netlifySites.length} sites)</Badge>
              <MgmtLink href={mgmt.netlify.overview()} label="ניהול" tooltip="Netlify Dashboard" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <UsageBar label="Bandwidth" used={0} limit={100} unit="GB/mo" formatUsed={() => "Free tier"} />
          <UsageBar label="Build Minutes" used={0} limit={300} unit="min/mo" formatUsed={() => "Free tier"} />
          <UsageBar label="Concurrent Builds" used={0} limit={1} unit="" formatUsed={() => "1 (Free)"} />
          <UsageBar label="Serverless Functions" used={0} limit={125000} unit="req/mo" formatUsed={() => "Free tier"} />
          <div className="text-xs text-muted-foreground">
            {netlifySites.filter((s) => s.build_settings?.repo_url).length} sites עם repo מקושר · {netlifySites.filter((s) => !s.build_settings?.repo_url).length} manual deploys
          </div>
        </CardContent>
      </Card>

      {/* Cloudflare */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Cloud className="h-4 w-4 text-orange-500" />
              Cloudflare
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">
                {cfZones[0]?.plan?.name ?? "Free"}
              </Badge>
              <MgmtLink
                href={mgmt.cloudflare.zone(cfZones[0]?.name ?? "")}
                label="ניהול"
                tooltip="Cloudflare Dashboard"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <UsageBar label="R2 Storage" used={0} limit={10} unit="GB"
            formatUsed={() => "Free tier"} />
          <UsageBar label="R2 Class A Operations" used={0} limit={1000000} unit="ops/mo"
            formatUsed={() => "Free tier"} />
          <UsageBar label="R2 Class B Operations" used={0} limit={10000000} unit="ops/mo"
            formatUsed={() => "Free tier"} />
          <UsageBar label="DNS Queries" used={0} limit={0} unit="Unlimited"
            formatUsed={() => "Unlimited"} formatLimit={() => "∞"} />
        </CardContent>
      </Card>

      {/* Hetzner */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Server className="h-4 w-4 text-red-500" />
              Hetzner VPS
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">€{hetznerTotal.toFixed(2)}/mo</Badge>
              <MgmtLink href={mgmt.hetzner.overview()} label="ניהול" tooltip="Hetzner Console" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {hetznerServers.map((s) => {
            const price = HETZNER_PRICES[s.server_type?.name?.toLowerCase()] ?? 0;
            return (
              <div key={s.id} className="flex items-center justify-between py-3 border-b last:border-0">
                <div className="flex items-center gap-3">
                  <div>
                    <p className="font-medium">{s.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {s.server_type?.description} &middot; {s.server_type?.cores} cores &middot; {s.server_type?.memory}GB RAM &middot; {s.server_type?.disk}GB disk
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono font-bold">€{price.toFixed(2)}/mo</span>
                  <MgmtLink href={mgmt.hetzner.server(s.id)} tooltip="Manage server" iconOnly />
                </div>
              </div>
            );
          })}
          <div className="mt-3 space-y-3">
            <UsageBar label="Bandwidth (included)" used={0} limit={20} unit="TB/mo"
              formatUsed={() => "Included"} />
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
