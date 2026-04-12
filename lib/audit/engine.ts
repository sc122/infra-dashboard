import type { AuditReport, AuditContext, AuditFinding } from "@/lib/types";
import { listRepos, getRepoCICD } from "@/lib/api/github";
import { listProjectsBasic } from "@/lib/api/vercel";
import { listZones, listDNSRecords } from "@/lib/api/cloudflare";
import { listServers } from "@/lib/api/hetzner";
import { allRules } from "./rules";

export async function runAudit(): Promise<AuditReport> {
  // Phase 1: Gather all platform data in parallel
  const [reposResult, vercelResult, zonesResult, hetznerResult, healthResult] =
    await Promise.allSettled([
      listRepos(),
      listProjectsBasic(),
      listZones(),
      listServers(),
      fetchHealthData(),
    ]);

  const repos = reposResult.status === "fulfilled" ? reposResult.value : [];
  const vercelProjects = vercelResult.status === "fulfilled" ? vercelResult.value : [];
  const cfZones = zonesResult.status === "fulfilled" ? zonesResult.value : [];
  const hetznerServers = hetznerResult.status === "fulfilled" ? hetznerResult.value : [];
  const healthResults = healthResult.status === "fulfilled" ? healthResult.value : [];

  // Phase 1b: Get DNS records for ALL zones
  let dnsRecords: AuditContext["dnsRecords"] = [];
  for (const zone of cfZones) {
    try {
      const records = await listDNSRecords(zone.id);
      dnsRecords.push(...records);
    } catch { /* zone might not be accessible */ }
  }

  // Phase 2: Get CI/CD info for repos in parallel (batch of 20)
  const repoCICD: AuditContext["repoCICD"] = {};
  const reposToCheck = repos.slice(0, 25);
  const cicdResults = await Promise.allSettled(
    reposToCheck.map(async (r) => {
      const [owner, name] = r.full_name.split("/");
      const cicd = await getRepoCICD(owner, name);
      return { name: r.name, cicd };
    })
  );

  for (const result of cicdResults) {
    if (result.status === "fulfilled") {
      repoCICD[result.value.name] = result.value.cicd;
    }
  }

  // Phase 3: Build unified context
  const ctx: AuditContext = {
    repos,
    repoCICD,
    vercelProjects,
    cfZones,
    dnsRecords,
    hetznerServers,
    healthResults,
  };

  // Phase 4: Run all rules, collect findings
  const findings: AuditFinding[] = [];
  const ruleErrors: string[] = [];

  for (const rule of allRules) {
    try {
      const ruleFindings = rule.run(ctx);
      findings.push(...ruleFindings);
    } catch (err) {
      // Don't let one rule break the whole audit
      ruleErrors.push(`Rule "${rule.id}" failed: ${err instanceof Error ? err.message : "unknown"}`);
    }
  }

  // Phase 5: Sort by severity, then by category
  const severityOrder: Record<string, number> = { critical: 0, warning: 1, info: 2 };
  findings.sort((a, b) => {
    const sevDiff = severityOrder[a.severity] - severityOrder[b.severity];
    if (sevDiff !== 0) return sevDiff;
    return a.category.localeCompare(b.category);
  });

  // Phase 6: Calculate health score
  const critical = findings.filter((f) => f.severity === "critical").length;
  const warning = findings.filter((f) => f.severity === "warning").length;
  const info = findings.filter((f) => f.severity === "info").length;

  // Weighted score: criticals hurt most, info barely matters
  // Max deduction: 100 points. Criticals = 20pts, warnings = 5pts, info = 1pt
  const deduction = Math.min(100, critical * 20 + warning * 5 + info * 1);
  const score = Math.max(0, 100 - deduction);

  return {
    generatedAt: new Date().toISOString(),
    score,
    findings,
    summary: { critical, warning, info, total: findings.length },
  };
}

async function fetchHealthData() {
  try {
    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000";
    const res = await fetch(`${baseUrl}/api/health`, { cache: "no-store" });
    const data = await res.json();
    return data.results ?? [];
  } catch {
    return [];
  }
}
