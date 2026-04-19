"use client";

import { useEffect, useState } from "react";
import { Link } from "@/i18n/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchApi } from "@/lib/fetchers";
import { ExternalLink, GitBranch, Settings } from "lucide-react";
import { MgmtLink } from "@/components/dashboard/mgmt-link";
import { mgmt } from "@/lib/utils";
import type { VercelProject } from "@/lib/types";

export default function VercelPage() {
  const [projects, setProjects] = useState<VercelProject[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchApi<VercelProject[]>("/api/vercel?action=projects")
      .then(setProjects)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Vercel Projects</h1>
        <p className="text-muted-foreground">{projects.length} פרויקטים</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>פרויקטים</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5, 6].map((i) => <Skeleton key={i} className="h-14 w-full" />)}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">שם</TableHead>
                  <TableHead className="text-right">Framework</TableHead>
                  <TableHead className="text-right">סטטוס</TableHead>
                  <TableHead className="text-right">Node</TableHead>
                  <TableHead className="text-right">דומיינים</TableHead>
                  <TableHead className="text-right">Deploy אחרון</TableHead>
                  <TableHead className="text-right">GitHub</TableHead>
                  <TableHead className="text-right"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {projects.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell>
                      {p.framework ? (
                        <Badge variant="secondary">{p.framework}</Badge>
                      ) : "-"}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={p.latestDeployment?.readyState ?? "unknown"} />
                    </TableCell>
                    <TableCell className="text-sm">{p.nodeVersion}</TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        {p.domains?.slice(0, 2).map((d) => (
                          <a
                            key={d}
                            href={`https://${d}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-500 hover:underline flex items-center gap-1"
                          >
                            {d} <ExternalLink className="h-3 w-3" />
                          </a>
                        ))}
                        {(p.domains?.length ?? 0) > 2 && (
                          <span className="text-xs text-muted-foreground">
                            +{p.domains.length - 2} more
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {p.latestDeployment
                        ? new Date(p.latestDeployment.createdAt).toLocaleDateString("he-IL", {
                            day: "2-digit",
                            month: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "-"}
                    </TableCell>
                    <TableCell>
                      {p.link ? (
                        <a
                          href={`https://github.com/${p.link.org}/${p.link.repo}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-500 hover:underline flex items-center gap-1"
                        >
                          <GitBranch className="h-3 w-3" />
                          {p.link.repo}
                        </a>
                      ) : "-"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Link href={`/vercel/${p.id}`} className="text-xs text-blue-500 hover:underline">
                          פרטים
                        </Link>
                        <MgmtLink href={mgmt.vercel.project(p.name)} tooltip="Vercel Dashboard" iconOnly />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
