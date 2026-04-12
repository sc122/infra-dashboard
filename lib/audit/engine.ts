import type { AuditReport, AuditContext, AuditFinding } from "@/lib/types";
import { listRepos, getRepoCICD } from "@/lib/api/github";
import { listProjectsBasic } from "@/lib/api/vercel";
import { listZones, listDNSRecords } from "@/lib/api/cloudflare";
import { listServers } from "@/lib/api/hetzner";
import { allRules } from "./rules";

export async function runAudit(): Promise<AuditReport> {
  // Phase 1: Gather all data in parallel
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

  // Get DNS records for first zone
  let dnsRecords: AuditContext["dnsRecords"] = [];
  if (cfZones.length > 0) {
    try {
      dnsRecords = await listDNSRecords(cfZones[0].id);
    } catch { /* ignore */ }
  }

  // Phase 2: Get CI/CD info for repos (limit to 20 most recent)
  const repoCICD: AuditContext["repoCICD"] = {};
  const reposToCheck = repos.slice(0, 20);
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

  // Phase 3: Build context and run all rules
  const ctx: AuditContext = {
    repos,
    repoCICD,
    vercelProjects,
    cfZones,
    dnsRecords,
    hetznerServers,
    healthResults,
  };

  const findings: AuditFinding[] = [];
  for (const rule of allRules) {
    try {
      findings.push(...rule(ctx));
    } catch {
      // Individual rule failure shouldn't break the audit
    }
  }

  // Sort by severity
  const severityOrder = { critical: 0, warning: 1, info: 2 };
  findings.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  // Calculate health score
  const critical = findings.filter((f) => f.severity === "critical").length;
  const warning = findings.filter((f) => f.severity === "warning").length;
  const info = findings.filter((f) => f.severity === "info").length;
  const score = Math.max(0, 100 - critical * 15 - warning * 5 - info * 1);

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
