"use client";

import { useEffect, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HealthScore } from "@/components/dashboard/health-score";
import { MgmtLink } from "@/components/dashboard/mgmt-link";
import { fetchApi } from "@/lib/fetchers";
import {
  Shield, Rocket, Settings, Trash2, Zap, RefreshCw,
  AlertTriangle, Info, XCircle, CheckCircle,
} from "lucide-react";
import type { AuditReport, AuditFinding } from "@/lib/types";

const categoryConfig = {
  security: { icon: Shield, color: "text-red-500" },
  deployment: { icon: Rocket, color: "text-blue-500" },
  cicd: { icon: Settings, color: "text-purple-500" },
  cleanup: { icon: Trash2, color: "text-orange-500" },
  performance: { icon: Zap, color: "text-yellow-500" },
} as const;

const severityConfig = {
  critical: { icon: XCircle, className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200" },
  warning: { icon: AlertTriangle, className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200" },
  info: { icon: Info, className: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" },
} as const;

export default function AuditPage() {
  const t = useTranslations("AuditPage");
  const tCommon = useTranslations("Common");
  const locale = useLocale();
  const [report, setReport] = useState<AuditReport | null>(null);
  const [loading, setLoading] = useState(true);

  async function runAudit() {
    setLoading(true);
    try {
      const data = await fetchApi<AuditReport>("/api/audit");
      setReport(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { runAudit(); }, []);

  if (loading) {
    return (
      <main className="p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="flex gap-6">
          <Skeleton className="h-40 w-40 rounded-full" />
          <Skeleton className="h-40 flex-1" />
        </div>
        <Skeleton className="h-96 w-full" />
      </main>
    );
  }

  if (!report) {
    return (
      <main className="p-6">
        <p className="text-muted-foreground">{t("loadError")}</p>
        <Button onClick={runAudit} className="mt-4">{tCommon("retry")}</Button>
      </main>
    );
  }

  const categories = Object.keys(categoryConfig) as (keyof typeof categoryConfig)[];
  const findingsByCategory: Record<string, AuditFinding[]> = {};
  for (const cat of categories) findingsByCategory[cat] = [];
  for (const f of report.findings) {
    findingsByCategory[f.category]?.push(f);
  }

  return (
    <main className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t("title")}</h1>
          <p className="text-muted-foreground">
            {t("subtitleFmt", { when: new Date(report.generatedAt).toLocaleString(locale), rules: report.rulesRun ?? 0 })}
          </p>
          {/* Data source indicators */}
          {report.dataSources && (
            <div className="flex gap-2 mt-1">
              {Object.entries(report.dataSources).map(([name, src]) => (
                <span key={name} className={`text-[10px] px-1.5 py-0.5 rounded ${
                  (src as {ok:boolean}).ok ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                }`}>
                  {name}: {(src as {ok:boolean}).ok ? (src as {count:number}).count : "ERR"}
                </span>
              ))}
            </div>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={runAudit} disabled={loading}>
          <RefreshCw className={`h-4 w-4 me-2 ${loading ? "animate-spin" : ""}`} />
          {t("runAudit")}
        </Button>
      </div>

      {/* Score + Summary */}
      <div className="flex flex-col sm:flex-row gap-6">
        <Card className="flex items-center justify-center p-6">
          <HealthScore score={report.score} size={140} />
        </Card>

        <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4 text-center">
              <div className="text-3xl font-bold">{report.summary.total}</div>
              <p className="text-xs text-muted-foreground">{t("summary.total")}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 text-center">
              <div className="text-3xl font-bold text-red-500">{report.summary.critical}</div>
              <p className="text-xs text-muted-foreground">{t("summary.critical")}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 text-center">
              <div className="text-3xl font-bold text-yellow-500">{report.summary.warning}</div>
              <p className="text-xs text-muted-foreground">{t("summary.warning")}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 text-center">
              <div className="text-3xl font-bold text-blue-500">{report.summary.info}</div>
              <p className="text-xs text-muted-foreground">{t("summary.info")}</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Findings by Category */}
      <Tabs defaultValue="all" className="space-y-4">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="all">
            {t("all")} ({report.findings.length})
          </TabsTrigger>
          {categories.map((cat) => {
            const config = categoryConfig[cat];
            const count = findingsByCategory[cat].length;
            if (count === 0) return null;
            return (
              <TabsTrigger key={cat} value={cat} className="gap-1">
                <config.icon className={`h-3 w-3 ${config.color}`} />
                {t(`categories.${cat}`)} ({count})
              </TabsTrigger>
            );
          })}
        </TabsList>

        <TabsContent value="all">
          <div className="space-y-3">
            {report.findings.map((f) => (
              <FindingCard key={f.id} finding={f} />
            ))}
          </div>
        </TabsContent>

        {categories.map((cat) => (
          <TabsContent key={cat} value={cat}>
            <div className="space-y-3">
              {findingsByCategory[cat].map((f) => (
                <FindingCard key={f.id} finding={f} />
              ))}
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </main>
  );
}

function FindingCard({ finding: f }: { finding: AuditFinding }) {
  const t = useTranslations("AuditPage");
  const sev = severityConfig[f.severity];
  const cat = categoryConfig[f.category];
  const SevIcon = sev.icon;

  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-start gap-3">
          <div className="mt-0.5">
            <SevIcon className={`h-5 w-5 ${
              f.severity === "critical" ? "text-red-500" :
              f.severity === "warning" ? "text-yellow-500" : "text-blue-500"
            }`} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h3 className="font-semibold text-sm">{f.title}</h3>
              <Badge variant="outline" className={sev.className}>
                {t(`severity.${f.severity}`)}
              </Badge>
              <Badge variant="secondary" className="text-[10px] gap-1">
                <cat.icon className="h-3 w-3" />
                {t(`categories.${f.category}`)}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mb-2">{f.description}</p>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-1 text-xs bg-muted px-2 py-1 rounded">
                <CheckCircle className="h-3 w-3 text-green-500" />
                <span>{f.recommendation}</span>
              </div>
              {f.resource.url && (
                <MgmtLink href={f.resource.url} label={t("open")} tooltip={`${f.resource.platform}: ${f.resource.name}`} />
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
