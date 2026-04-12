import type { AuditReport, AuditContext } from "@/lib/types";
import { listRepos, getRepoCICD } from "@/lib/api/github";
import { listProjectsBasic } from "@/lib/api/vercel";
import { listZones, listDNSRecords } from "@/lib/api/cloudflare";
import { listServers } from "@/lib/api/hetzner";
import { allRules } from "./rules";

export async function runAudit(): Promise<AuditReport> {
  // ── Phase 1: Gather platform data ──
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

  // Track data source health
  const dataSources = {
    github: { ok: reposResult.status === "fulfilled", count: repos.length },
    vercel: { ok: vercelResult.status === "fulfilled", count: vercelProjects.length },
    cloudflare: { ok: zonesResult.status === "fulfilled", count: cfZones.length },
    hetzner: { ok: hetznerResult.status === "fulfilled", count: hetznerServers.length },
    health: { ok: healthResult.status === "fulfilled", count: healthResults.length },
  };

  // ── Phase 1b: DNS records for all zones ──
  let dnsRecords: AuditContext["dnsRecords"] = [];
  for (const zone of cfZones) {
    try {
      const records = await listDNSRecords(zone.id);
      dnsRecords.push(...records);
    } catch { /* skip inaccessible zone */ }
  }

  // ── Phase 2: CI/CD detection ──
  const repoCICD: AuditContext["repoCICD"] = {};
  const cicdResults = await Promise.allSettled(
    repos.slice(0, 25).map(async (r) => {
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

  // ── Phase 3: Run rules ──
  const ctx: AuditContext = {
    repos, repoCICD, vercelProjects, cfZones, dnsRecords, hetznerServers, healthResults,
  };

  const findings: AuditReport["findings"] = [];
  const ruleErrors: string[] = [];

  for (const rule of allRules) {
    try {
      findings.push(...rule.run(ctx));
    } catch (err) {
      ruleErrors.push(`${rule.id}: ${err instanceof Error ? err.message : "unknown"}`);
    }
  }

  // ── Phase 4: Sort + Score ──
  const sev = { critical: 0, warning: 1, info: 2 };
  findings.sort((a, b) => sev[a.severity] - sev[b.severity] || a.category.localeCompare(b.category));

  const critical = findings.filter((f) => f.severity === "critical").length;
  const warning = findings.filter((f) => f.severity === "warning").length;
  const info = findings.filter((f) => f.severity === "info").length;

  // Weighted score with diminishing returns on info findings
  const deduction = Math.min(100,
    critical * 20 +
    warning * 5 +
    Math.min(info * 1, 15) // Cap info deduction at 15 points
  );
  const score = Math.max(0, 100 - deduction);

  return {
    generatedAt: new Date().toISOString(),
    score,
    findings,
    summary: { critical, warning, info, total: findings.length },
    dataSources,
    rulesRun: allRules.length,
    ruleErrors,
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
