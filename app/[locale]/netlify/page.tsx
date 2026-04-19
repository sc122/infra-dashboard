"use client";

import { useEffect, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { MgmtLink } from "@/components/dashboard/mgmt-link";
import { fetchApi } from "@/lib/fetchers";
import { Hexagon, RefreshCw, GitBranch, ExternalLink } from "lucide-react";
import type { NetlifySite } from "@/lib/api/netlify";

export default function NetlifyPage() {
  const t = useTranslations("NetlifyPage");
  const tCommon = useTranslations("Common");
  const tTable = useTranslations("UnifiedTable");
  const locale = useLocale();
  const [sites, setSites] = useState<NetlifySite[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadData() {
    setLoading(true);
    try {
      const data = await fetchApi<NetlifySite[]>("/api/netlify?action=sites");
      setSites(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadData(); }, []);

  const withRepo = sites.filter((s) => s.build_settings?.repo_url);
  const withoutRepo = sites.filter((s) => !s.build_settings?.repo_url);

  return (
    <main className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t("title")}</h1>
          <p className="text-muted-foreground">
            {sites.length} sites &middot; {withRepo.length} with repo &middot; {withoutRepo.length} manual
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={loadData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 me-2 ${loading ? "animate-spin" : ""}`} />
            {tCommon("refresh")}
          </Button>
          <MgmtLink href="https://app.netlify.com" label="Netlify Dashboard" />
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>Sites</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-14 w-full" />)}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-start">{tCommon("name")}</TableHead>
                  <TableHead className="text-start">{tCommon("status")}</TableHead>
                  <TableHead className="text-start">URL</TableHead>
                  <TableHead className="text-start">Repo</TableHead>
                  <TableHead className="text-start">{t("lastDeploy")}</TableHead>
                  <TableHead className="text-start"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sites.map((site) => {
                  const repoName = site.build_settings?.repo_url?.split("/").pop()?.replace(/\.git$/, "");
                  return (
                    <TableRow key={site.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Hexagon className="h-4 w-4 text-teal-500" />
                          <span className="font-medium">{site.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={
                          site.published_deploy?.state === "ready" ? "healthy" : "unknown"
                        } />
                      </TableCell>
                      <TableCell>
                        <a href={site.ssl_url || site.url} target="_blank" rel="noopener noreferrer"
                          className="text-xs text-blue-500 hover:underline flex items-center gap-1">
                          {site.custom_domain ?? site.name + ".netlify.app"}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </TableCell>
                      <TableCell>
                        {repoName ? (
                          <a href={site.build_settings?.repo_url} target="_blank" rel="noopener noreferrer"
                            className="text-xs text-blue-500 hover:underline flex items-center gap-1">
                            <GitBranch className="h-3 w-3" />
                            {repoName}
                          </a>
                        ) : (
                          <Badge variant="outline" className="text-[10px]">{tTable("manual")}</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {site.published_deploy?.published_at
                          ? new Date(site.published_deploy.published_at).toLocaleDateString(locale, {
                              day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
                            })
                          : "-"}
                      </TableCell>
                      <TableCell>
                        <MgmtLink
                          href={`https://app.netlify.com/sites/${site.name}`}
                          tooltip="Netlify Dashboard"
                          iconOnly
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
