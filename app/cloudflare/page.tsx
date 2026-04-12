"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { fetchApi } from "@/lib/fetchers";
import { Globe, HardDrive, Cloud, Shield } from "lucide-react";
import type { CFZone, CFDNSRecord, CFR2Bucket } from "@/lib/types";

export default function CloudflarePage() {
  const [zones, setZones] = useState<CFZone[]>([]);
  const [dnsRecords, setDnsRecords] = useState<Record<string, CFDNSRecord[]>>({});
  const [r2Buckets, setR2Buckets] = useState<CFR2Bucket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const overview = await fetchApi<{
          zones: CFZone[];
          r2Buckets: CFR2Bucket[];
          workers: unknown[];
        }>("/api/cloudflare?action=overview");

        setZones(overview.zones);
        setR2Buckets(overview.r2Buckets);

        // Load DNS records for each zone
        const dnsMap: Record<string, CFDNSRecord[]> = {};
        for (const zone of overview.zones) {
          try {
            const records = await fetchApi<CFDNSRecord[]>(
              `/api/cloudflare?action=dns&zoneId=${zone.id}`
            );
            dnsMap[zone.id] = records;
          } catch {
            dnsMap[zone.id] = [];
          }
        }
        setDnsRecords(dnsMap);
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
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-32" />)}
        </div>
        <Skeleton className="h-64 w-full" />
      </main>
    );
  }

  return (
    <main className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Cloudflare</h1>
        <p className="text-muted-foreground">דומיינים, DNS, ו-R2 Storage</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm">Zones</CardTitle>
            <Globe className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{zones.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm">R2 Buckets</CardTitle>
            <HardDrive className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{r2Buckets.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm">Total DNS Records</CardTitle>
            <Cloud className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Object.values(dnsRecords).reduce((sum, r) => sum + r.length, 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="dns" className="space-y-4">
        <TabsList>
          <TabsTrigger value="dns">DNS Records</TabsTrigger>
          <TabsTrigger value="r2">R2 Storage</TabsTrigger>
        </TabsList>

        <TabsContent value="dns">
          {zones.map((zone) => (
            <Card key={zone.id} className="mb-4">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  {zone.name}
                  <Badge variant={zone.status === "active" ? "default" : "secondary"}>
                    {zone.status}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right">Type</TableHead>
                      <TableHead className="text-right">Name</TableHead>
                      <TableHead className="text-right">Content</TableHead>
                      <TableHead className="text-right">Proxy</TableHead>
                      <TableHead className="text-right">TTL</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(dnsRecords[zone.id] ?? []).map((record) => (
                      <TableRow key={record.id}>
                        <TableCell>
                          <Badge variant="outline">{record.type}</Badge>
                        </TableCell>
                        <TableCell className="font-mono text-sm">{record.name}</TableCell>
                        <TableCell className="font-mono text-sm max-w-[200px] truncate">
                          {record.content}
                        </TableCell>
                        <TableCell>
                          {record.proxied ? (
                            <Shield className="h-4 w-4 text-orange-500" />
                          ) : (
                            <span className="text-muted-foreground text-xs">DNS only</span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs">
                          {record.ttl === 1 ? "Auto" : `${record.ttl}s`}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="r2">
          <Card>
            <CardHeader><CardTitle>R2 Buckets</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">שם</TableHead>
                    <TableHead className="text-right">תאריך יצירה</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {r2Buckets.map((bucket) => (
                    <TableRow key={bucket.name}>
                      <TableCell className="font-medium">{bucket.name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(bucket.creation_date).toLocaleDateString("he-IL")}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </main>
  );
}
