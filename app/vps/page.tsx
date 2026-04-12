"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchApi } from "@/lib/fetchers";
import { Server, Cpu, HardDrive, MemoryStick, Globe, MapPin } from "lucide-react";
import type { HetznerServer } from "@/lib/types";

export default function VPSPage() {
  const [servers, setServers] = useState<HetznerServer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchApi<HetznerServer[]>("/api/hetzner?action=servers")
      .then(setServers)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

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
      <div>
        <h1 className="text-2xl font-bold">Hetzner VPS</h1>
        <p className="text-muted-foreground">{servers.length} servers</p>
      </div>

      {servers.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            <Server className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p>לא נמצאו שרתים. וודא שה-HETZNER_API_TOKEN מוגדר נכון.</p>
          </CardContent>
        </Card>
      ) : (
        servers.map((server) => (
          <Card key={server.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Server className="h-5 w-5" />
                  {server.name}
                </CardTitle>
                <StatusBadge status={server.status} />
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
                  <MapPin className="h-3 w-3 ml-1" />
                  {server.datacenter?.description ?? server.datacenter?.name}
                </Badge>
                {server.image && (
                  <Badge variant="secondary">
                    {server.image.os_flavor} {server.image.os_version}
                  </Badge>
                )}
                <Badge variant="secondary">{server.server_type?.description}</Badge>
              </div>

              <p className="text-xs text-muted-foreground mt-3">
                נוצר: {new Date(server.created).toLocaleDateString("he-IL")}
              </p>
            </CardContent>
          </Card>
        ))
      )}
    </main>
  );
}
