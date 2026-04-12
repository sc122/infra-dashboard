"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { fetchApi } from "@/lib/fetchers";
import { ArrowRight, ExternalLink, GitCommit } from "lucide-react";
import type { VercelProject, VercelDeployment } from "@/lib/types";
import Link from "next/link";

export default function VercelProjectPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const [project, setProject] = useState<VercelProject | null>(null);
  const [deployments, setDeployments] = useState<VercelDeployment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetchApi<VercelProject>(`/api/vercel?action=project&projectId=${projectId}`),
      fetchApi<VercelDeployment[]>(`/api/vercel?action=deployments&projectId=${projectId}&limit=20`),
    ])
      .then(([proj, deps]) => {
        setProject(proj);
        setDeployments(deps);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [projectId]);

  if (loading) {
    return (
      <main className="p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </main>
    );
  }

  if (!project) {
    return (
      <main className="p-6">
        <p>Project not found</p>
      </main>
    );
  }

  return (
    <main className="p-6 space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/vercel" className="hover:underline">Vercel</Link>
        <ArrowRight className="h-3 w-3" />
        <span className="text-foreground font-medium">{project.name}</span>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{project.name}</h1>
          <p className="text-muted-foreground">
            {project.framework ?? "Static"} &middot; Node {project.nodeVersion}
          </p>
        </div>
        <div className="flex gap-2">
          {project.domains?.[0] && (
            <a href={`https://${project.domains[0]}`} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm">
                <ExternalLink className="h-4 w-4 ml-2" />
                פתח אתר
              </Button>
            </a>
          )}
        </div>
      </div>

      {/* Domains */}
      <Card>
        <CardHeader><CardTitle>דומיינים</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {project.domains?.map((d) => (
              <Badge key={d} variant="outline">
                <a href={`https://${d}`} target="_blank" rel="noopener noreferrer"
                   className="flex items-center gap-1">
                  {d} <ExternalLink className="h-3 w-3" />
                </a>
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Deployments */}
      <Card>
        <CardHeader><CardTitle>Deployments ({deployments.length})</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">סטטוס</TableHead>
                <TableHead className="text-right">Target</TableHead>
                <TableHead className="text-right">Commit</TableHead>
                <TableHead className="text-right">תאריך</TableHead>
                <TableHead className="text-right">URL</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {deployments.map((d) => (
                <TableRow key={d.uid}>
                  <TableCell>
                    <StatusBadge status={d.readyState ?? d.state} />
                  </TableCell>
                  <TableCell>
                    <Badge variant={d.target === "production" ? "default" : "secondary"}>
                      {d.target ?? "preview"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs">
                    {d.meta?.githubCommitMessage ? (
                      <div className="flex items-center gap-1 max-w-[200px]">
                        <GitCommit className="h-3 w-3 shrink-0" />
                        <span className="truncate">{d.meta.githubCommitMessage}</span>
                      </div>
                    ) : "-"}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(d.created).toLocaleDateString("he-IL", {
                      day: "2-digit",
                      month: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </TableCell>
                  <TableCell>
                    <a
                      href={`https://${d.url}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-500 hover:underline"
                    >
                      Preview
                    </a>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </main>
  );
}
