"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { MgmtLink } from "@/components/dashboard/mgmt-link";
import { LanguageDot, CICDBadge } from "@/components/dashboard/service-icon";
import { fetchApi } from "@/lib/fetchers";
import { mgmt } from "@/lib/utils";
import { GitBranch, RefreshCw, Lock, Globe, Star } from "lucide-react";
import type { GitHubRepo, GitHubWorkflowRun } from "@/lib/types";

interface RepoWithCI extends GitHubRepo {
  lastRun?: GitHubWorkflowRun;
  linkedPlatform?: string;
}

export default function GitHubPage() {
  const [repos, setRepos] = useState<RepoWithCI[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadData() {
    setLoading(true);
    try {
      const repoList = await fetchApi<GitHubRepo[]>("/api/github?action=repos");

      // Fetch last CI run for each repo (in parallel, limited to first 20)
      const enriched = await Promise.all(
        repoList.slice(0, 30).map(async (repo) => {
          try {
            const [owner, name] = repo.full_name.split("/");
            const runs = await fetchApi<GitHubWorkflowRun[]>(
              `/api/github?action=runs&owner=${owner}&repo=${name}`
            );
            return { ...repo, lastRun: runs[0] };
          } catch {
            return repo as RepoWithCI;
          }
        })
      );

      setRepos(enriched);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadData(); }, []);

  const publicRepos = repos.filter((r) => !r.private);
  const privateRepos = repos.filter((r) => r.private);

  return (
    <main className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">GitHub Repositories</h1>
          <p className="text-muted-foreground">
            {repos.length} repos &middot; {publicRepos.length} public &middot; {privateRepos.length} private
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={loadData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ml-2 ${loading ? "animate-spin" : ""}`} />
            רענון
          </Button>
          <MgmtLink href={`https://github.com/${process.env.NEXT_PUBLIC_GITHUB_USERNAME || ""}?tab=repositories`} label="GitHub Profile" />
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Total Repos</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{repos.length}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">With CI/CD</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {repos.filter((r) => r.lastRun).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Languages</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Set(repos.map((r) => r.language).filter(Boolean)).size}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Last Push</CardTitle></CardHeader>
          <CardContent>
            <div className="text-sm font-medium">
              {repos[0]?.name ?? "-"}
            </div>
            <div className="text-xs text-muted-foreground">
              {repos[0] ? timeAgo(repos[0].pushed_at) : ""}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Repos table */}
      <Card>
        <CardHeader><CardTitle>Repositories</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => <Skeleton key={i} className="h-14 w-full" />)}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">שם</TableHead>
                  <TableHead className="text-right">שפה</TableHead>
                  <TableHead className="text-right">Visibility</TableHead>
                  <TableHead className="text-right">CI/CD</TableHead>
                  <TableHead className="text-right">Push אחרון</TableHead>
                  <TableHead className="text-right">תיאור</TableHead>
                  <TableHead className="text-right"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {repos.map((repo) => (
                  <TableRow key={repo.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <GitBranch className="h-4 w-4 text-muted-foreground" />
                        <a
                          href={repo.html_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium text-blue-500 hover:underline"
                        >
                          {repo.name}
                        </a>
                        {repo.stargazers_count > 0 && (
                          <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                            <Star className="h-3 w-3" /> {repo.stargazers_count}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell><LanguageDot language={repo.language} /></TableCell>
                    <TableCell>
                      {repo.private ? (
                        <Badge variant="outline" className="text-xs"><Lock className="h-3 w-3 ml-1" /> Private</Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs"><Globe className="h-3 w-3 ml-1" /> Public</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <CICDBadge conclusion={repo.lastRun?.conclusion ?? (repo.lastRun?.status === "in_progress" ? "in_progress" : undefined)} />
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {timeAgo(repo.pushed_at)}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                      {repo.description ?? "-"}
                    </TableCell>
                    <TableCell>
                      <MgmtLink href={repo.html_url} tooltip="Open in GitHub" iconOnly />
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

function timeAgo(date: string): string {
  const now = Date.now();
  const d = new Date(date).getTime();
  const diff = now - d;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(date).toLocaleDateString("he-IL");
}
