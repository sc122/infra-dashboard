"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { fetchApi } from "@/lib/fetchers";
import { Activity, RefreshCw, Clock } from "lucide-react";
import type { HealthCheck } from "@/lib/types";

interface HealthResponse {
  checkedAt: string;
  total: number;
  up: number;
  down: number;
  results: HealthCheck[];
}

export default function HealthPage() {
  const [data, setData] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState(true);

  async function runCheck() {
    setLoading(true);
    try {
      const result = await fetchApi<HealthResponse>("/api/health");
      setData(result);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    runCheck();
  }, []);

  return (
    <main className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Health Monitor</h1>
          <p className="text-muted-foreground">בדיקת זמינות לכל השירותים</p>
        </div>
        <Button variant="outline" size="sm" onClick={runCheck} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ml-2 ${loading ? "animate-spin" : ""}`} />
          בדוק עכשיו
        </Button>
      </div>

      {loading ? (
        <Skeleton className="h-64 w-full" />
      ) : data ? (
        <>
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Total Checks</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data.total}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-green-600">Up</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{data.up}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-red-600">Down</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{data.down}</div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  תוצאות
                </CardTitle>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {new Date(data.checkedAt).toLocaleString("he-IL")}
                </p>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">שם</TableHead>
                    <TableHead className="text-right">פלטפורמה</TableHead>
                    <TableHead className="text-right">סטטוס</TableHead>
                    <TableHead className="text-right">Status Code</TableHead>
                    <TableHead className="text-right">Response Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.results.map((r, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">
                        <a
                          href={r.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-500 hover:underline"
                        >
                          {r.name}
                        </a>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{r.platform}</Badge>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={r.status} />
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {r.statusCode ?? "-"}
                      </TableCell>
                      <TableCell>
                        <span className={`font-mono text-sm ${
                          r.responseTime > 3000 ? "text-red-500" :
                          r.responseTime > 1000 ? "text-yellow-500" : "text-green-500"
                        }`}>
                          {r.responseTime}ms
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      ) : (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            <p>לא הצלחתי לטעון נתוני health check</p>
          </CardContent>
        </Card>
      )}
    </main>
  );
}
