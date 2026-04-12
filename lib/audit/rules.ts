import type { AuditFinding, AuditContext } from "@/lib/types";
import { mgmt } from "@/lib/utils";
import { discoverDockerProjects } from "@/lib/docker-projects";

export type AuditRule = {
  id: string;
  name: string;
  category: AuditFinding["category"];
  run: (ctx: AuditContext) => AuditFinding[];
};

// ─── HELPERS ──────────────────────────────────────────────────────

function daysSince(date: string | number): number {
  const ts = typeof date === "number" ? date : new Date(date).getTime();
  return Math.floor((Date.now() - ts) / (24 * 60 * 60 * 1000));
}

function safeId(s: string): string {
  return s.replace(/[^a-zA-Z0-9_-]/g, "_").toLowerCase();
}

/** Build set of repo names that are deployed somewhere */
function getDeployedRepoNames(ctx: AuditContext): Set<string> {
  const deployed = new Set<string>();
  // Vercel-linked repos
  for (const p of ctx.vercelProjects) {
    if (p.link?.repo) deployed.add(p.link.repo.toLowerCase());
  }
  // Docker projects (auto-discovered from DNS + GitHub)
  const dockerProjects = discoverDockerProjects({
    dnsRecords: ctx.dnsRecords,
    hetznerServers: ctx.hetznerServers,
    repos: ctx.repos,
    repoCICD: ctx.repoCICD,
    healthResults: ctx.healthResults,
  });
  for (const dp of dockerProjects) {
    if (dp.repo) deployed.add(dp.repo.toLowerCase());
  }
  // Repos with Dockerfile/vercel.json detected by CI/CD scan
  for (const [name, cicd] of Object.entries(ctx.repoCICD)) {
    if (cicd.hasDockerfile || cicd.hasVercelConfig) deployed.add(name.toLowerCase());
  }
  return deployed;
}

/** Get DNS A records pointing to known VPS IPs */
function getDnsToVpsRecords(ctx: AuditContext) {
  const vpsIPs = new Set(
    ctx.hetznerServers.map((s) => s.public_net?.ipv4?.ip).filter(Boolean)
  );
  return ctx.dnsRecords.filter((r) => r.type === "A" && vpsIPs.has(r.content));
}

/** Strict match: does this subdomain clearly match a repo name? */
function strictSubdomainMatch(subdomain: string, repoName: string): boolean {
  const sub = subdomain.toLowerCase();
  const repo = repoName.toLowerCase().replace(/[_-]/g, "");
  const subClean = sub.replace(/[_-]/g, "");
  // Exact match or one contains the other fully (min 4 chars to avoid "a" matching everything)
  if (sub.length < 4 && repo.length < 4) return sub === repo;
  return subClean === repo || (subClean.length >= 4 && repo.includes(subClean)) || (repo.length >= 4 && subClean.includes(repo));
}

// ─── SECURITY ─────────────────────────────────────────────────────

export const publicRepos: AuditRule = {
  id: "public-repos",
  name: "Repos ציבוריים עם קוד production",
  category: "security",
  run(ctx) {
    const findings: AuditFinding[] = [];
    const deployed = getDeployedRepoNames(ctx);

    for (const repo of ctx.repos) {
      if (repo.private) continue;

      // STRICT match: exact repo name linked to Vercel
      const isLinkedToVercel = ctx.vercelProjects.some(
        (p) => p.link?.repo?.toLowerCase() === repo.name.toLowerCase()
      );
      const isDeployed = deployed.has(repo.name.toLowerCase());

      if (isLinkedToVercel || isDeployed) {
        findings.push({
          id: `pub-deployed-${safeId(repo.name)}`,
          category: "security",
          severity: "critical",
          title: `Repo ציבורי עם קוד production: ${repo.name}`,
          description: `${repo.full_name} הוא public ומחובר ל-deployment חי. קוד production חשוף.`,
          resource: { type: "github-repo", name: repo.full_name, platform: "github", url: repo.html_url },
          recommendation: `GitHub → ${repo.full_name} → Settings → Danger Zone → Make private`,
          autoFixable: false,
        });
      } else if (daysSince(repo.pushed_at) > 180) {
        findings.push({
          id: `pub-stale-${safeId(repo.name)}`,
          category: "security",
          severity: "info",
          title: `Repo ציבורי לא פעיל: ${repo.name}`,
          description: `${repo.full_name} ציבורי ולא עודכן ${daysSince(repo.pushed_at)} ימים. ודא שאין secrets ב-commit history.`,
          resource: { type: "github-repo", name: repo.full_name, platform: "github", url: repo.html_url },
          recommendation: `הפוך ל-Private או ארכב`,
          autoFixable: false,
        });
      }
    }
    return findings;
  },
};

export const serverSecurity: AuditRule = {
  id: "server-security",
  name: "אבטחת שרתים",
  category: "security",
  run(ctx) {
    const findings: AuditFinding[] = [];
    for (const server of ctx.hetznerServers) {
      const protection = (server as unknown as Record<string, unknown>).protection as
        | { delete: boolean; rebuild: boolean }
        | undefined;

      if (!protection?.delete) {
        findings.push({
          id: `no-protect-${server.id}`,
          category: "security",
          severity: "warning",
          title: `${server.name} - אין Delete Protection`,
          description: `ניתן למחיקה ללא הגנה. הפעל delete protection למניעת מחיקה בטעות.`,
          resource: { type: "hetzner-server", name: server.name, platform: "hetzner", url: mgmt.hetzner.server(server.id) },
          recommendation: `Hetzner Console → ${server.name} → Enable delete protection`,
          autoFixable: false,
        });
      }

      // Count services per server
      const serviceCount = getDnsToVpsRecords(ctx).filter(
        (r) => r.content === server.public_net?.ipv4?.ip
      ).length;
      if (serviceCount >= 5) {
        findings.push({
          id: `many-services-${server.id}`,
          category: "security",
          severity: "info",
          title: `${server.name} מריץ ${serviceCount} שירותים`,
          description: `${serviceCount} DNS records → שרת זה. ודא שכל השירותים מעודכנים ומאובטחים.`,
          resource: { type: "hetzner-server", name: server.name, platform: "hetzner", url: mgmt.hetzner.server(server.id) },
          recommendation: `סרוק docker ps וודא שאין containers מיותרים`,
          autoFixable: false,
        });
      }
    }
    return findings;
  },
};

// ─── DEPLOYMENT ───────────────────────────────────────────────────

export const duplicateProjects: AuditRule = {
  id: "duplicate-projects",
  name: "כפילויות Vercel",
  category: "deployment",
  run(ctx) {
    const findings: AuditFinding[] = [];
    const repoToProjects = new Map<string, string[]>();

    for (const p of ctx.vercelProjects) {
      const repo = p.link?.repo?.toLowerCase();
      if (!repo) continue;
      if (!repoToProjects.has(repo)) repoToProjects.set(repo, []);
      repoToProjects.get(repo)!.push(p.name);
    }

    for (const [repo, projects] of repoToProjects) {
      if (projects.length > 1) {
        findings.push({
          id: `dup-${safeId(repo)}`,
          category: "deployment",
          severity: "warning",
          title: `כפילות: ${projects.length} Vercel projects ← "${repo}"`,
          description: `${projects.join(", ")} מחוברים לאותו repo. כל push = ${projects.length} builds כפולים.`,
          resource: { type: "vercel-project", name: projects[1], platform: "vercel", url: mgmt.vercel.project(projects[1]) },
          recommendation: `מחק "${projects[1]}" ב-Vercel Dashboard`,
          autoFixable: false,
        });
      }
    }
    return findings;
  },
};

export const noRepoLinked: AuditRule = {
  id: "no-repo-linked",
  name: "Vercel ללא GitHub",
  category: "deployment",
  run(ctx) {
    const findings: AuditFinding[] = [];
    for (const p of ctx.vercelProjects) {
      if (!p.link?.repo) {
        findings.push({
          id: `no-repo-${safeId(p.name)}`,
          category: "deployment",
          severity: "warning",
          title: `"${p.name}" ללא GitHub repo`,
          description: `Deploy ידני בלבד. אין PR previews, אין rollback קל, אין version history.`,
          resource: { type: "vercel-project", name: p.name, platform: "vercel", url: mgmt.vercel.project(p.name) },
          recommendation: `צור repo ב-GitHub → חבר ב-Vercel Settings → Git`,
          autoFixable: false,
        });
      }
    }
    return findings;
  },
};

export const dnsIntegrity: AuditRule = {
  id: "dns-integrity",
  name: "תקינות DNS",
  category: "deployment",
  run(ctx) {
    const findings: AuditFinding[] = [];
    const vpsRecords = getDnsToVpsRecords(ctx);

    for (const record of vpsRecords) {
      const rootDomain = record.name.split(".").slice(-2).join(".");
      // Skip root and www (known redirects)
      if (record.name === rootDomain || record.name === `www.${rootDomain}`) continue;

      const subdomain = record.name.split(".")[0];

      // Health check
      const health = ctx.healthResults.find((h) => h.url?.includes(record.name));
      if (health?.status === "down") {
        findings.push({
          id: `dns-down-${safeId(record.name)}`,
          category: "deployment",
          severity: "warning",
          title: `${record.name} לא מגיב`,
          description: `DNS → ${record.content} אבל HTTP לא מגיב. Container כבוי?`,
          resource: { type: "dns-record", name: record.name, platform: "cloudflare", url: mgmt.cloudflare.dns(rootDomain) },
          recommendation: `בדוק docker ps על VPS, או מחק DNS record`,
          autoFixable: false,
        });
      }

      // Try to identify source repo via auto-discovery matching
      const matchingRepo = ctx.repos.find((r) => strictSubdomainMatch(subdomain, r.name));
      const matchingDocker = Object.keys(ctx.repoCICD).find((name) => strictSubdomainMatch(subdomain, name));

      if (!matchingRepo && !matchingDocker) {
        findings.push({
          id: `dns-unknown-${safeId(record.name)}`,
          category: "deployment",
          severity: "info",
          title: `${record.name} - repo מקור לא מזוהה`,
          description: `DNS record פעיל ללא GitHub repo תואם. הוסף מיפוי ב-docker-projects.ts.`,
          resource: { type: "dns-record", name: record.name, platform: "cloudflare", url: mgmt.cloudflare.dns(rootDomain) },
          recommendation: `הוסף entry ב-lib/docker-projects.ts`,
          autoFixable: false,
        });
      }
    }
    return findings;
  },
};

export const missingCustomDomain: AuditRule = {
  id: "missing-custom-domain",
  name: "חסר custom domain",
  category: "deployment",
  run(ctx) {
    const findings: AuditFinding[] = [];
    for (const p of ctx.vercelProjects) {
      const hasCustom = p.domains?.some((d) => !d.endsWith(".vercel.app"));
      if (!hasCustom && p.latestDeployment?.target === "production") {
        findings.push({
          id: `no-domain-${safeId(p.name)}`,
          category: "deployment",
          severity: "info",
          title: `"${p.name}" ללא custom domain`,
          description: `רץ רק על .vercel.app. שקול סאב-דומיין מ-keepit-ai.com.`,
          resource: { type: "vercel-project", name: p.name, platform: "vercel", url: mgmt.vercel.domains(p.name) },
          recommendation: `Vercel → ${p.name} → Settings → Domains`,
          autoFixable: false,
        });
      }
    }
    return findings;
  },
};

export const deploymentDrift: AuditRule = {
  id: "deployment-drift",
  name: "פער בין קוד ל-deployment",
  category: "deployment",
  run(ctx) {
    const findings: AuditFinding[] = [];

    for (const p of ctx.vercelProjects) {
      if (!p.link?.repo || !p.latestDeployment?.createdAt) continue;
      const repo = ctx.repos.find((r) => r.name.toLowerCase() === p.link!.repo.toLowerCase());
      if (!repo) continue;

      const deployTime = p.latestDeployment.createdAt;
      const pushTime = new Date(repo.pushed_at).getTime();
      const driftHours = (pushTime - deployTime) / (1000 * 60 * 60);

      // If repo was pushed > 24h after last deploy → drift
      if (driftHours > 24) {
        findings.push({
          id: `drift-${safeId(p.name)}`,
          category: "deployment",
          severity: "warning",
          title: `"${p.name}" - קוד חדש לא deployed`,
          description: `Last push: ${new Date(repo.pushed_at).toLocaleDateString("he-IL")}. Last deploy: ${new Date(deployTime).toLocaleDateString("he-IL")}. פער של ${Math.floor(driftHours / 24)} ימים.`,
          resource: { type: "vercel-project", name: p.name, platform: "vercel", url: mgmt.vercel.project(p.name) },
          recommendation: `בדוק למה commits חדשים לא triggered deploy`,
          autoFixable: false,
        });
      }
    }
    return findings;
  },
};

// ─── CI/CD ────────────────────────────────────────────────────────

export const noCICD: AuditRule = {
  id: "no-cicd",
  name: "Repos ללא CI/CD",
  category: "cicd",
  run(ctx) {
    const findings: AuditFinding[] = [];
    for (const [repoName, cicd] of Object.entries(ctx.repoCICD)) {
      const repo = ctx.repos.find((r) => r.name === repoName);
      if (!repo) continue;
      // Only flag if repo has Docker but no Actions (and is active)
      if (cicd.hasDockerfile && !cicd.hasActions && daysSince(repo.pushed_at) < 180) {
        findings.push({
          id: `no-cicd-${safeId(repoName)}`,
          category: "cicd",
          severity: "warning",
          title: `"${repoName}" - Dockerfile ללא CI/CD`,
          description: `Dockerfile קיים אבל אין GitHub Actions. Deploy ידני בלבד.`,
          resource: { type: "github-repo", name: repo.full_name, platform: "github", url: `${repo.html_url}/actions` },
          recommendation: `הוסף .github/workflows/deploy.yml`,
          autoFixable: false,
        });
      }
    }
    return findings;
  },
};

export const failedWorkflows: AuditRule = {
  id: "failed-workflows",
  name: "Workflows שנכשלו",
  category: "cicd",
  run(ctx) {
    const findings: AuditFinding[] = [];
    for (const [repoName, cicd] of Object.entries(ctx.repoCICD)) {
      if (!cicd.lastRun || cicd.lastRun.conclusion !== "failure") continue;
      // Only flag recent failures (last 14 days)
      if (daysSince(cicd.lastRun.created_at) > 14) continue;

      findings.push({
        id: `fail-${safeId(repoName)}`,
        category: "cicd",
        severity: "warning",
        title: `CI/CD נכשל: ${repoName}`,
        description: `"${cicd.lastRun.name}" נכשל ב-${cicd.lastRun.head_branch} (${new Date(cicd.lastRun.created_at).toLocaleDateString("he-IL")}).`,
        resource: { type: "github-workflow", name: repoName, platform: "github", url: cicd.lastRun.html_url },
        recommendation: `בדוק logs ב-GitHub Actions ותקן`,
        autoFixable: false,
      });
    }
    return findings;
  },
};

// ─── CLEANUP ──────────────────────────────────────────────────────

export const staleRepos: AuditRule = {
  id: "stale-repos",
  name: "Repos מיושנים",
  category: "cleanup",
  run(ctx) {
    const findings: AuditFinding[] = [];
    // Track which repos were already flagged by other rules to reduce noise
    const alreadyFlagged = new Set<string>();

    for (const repo of ctx.repos) {
      const days = daysSince(repo.pushed_at);
      if (days < 90) continue;
      if (alreadyFlagged.has(repo.name)) continue;
      alreadyFlagged.add(repo.name);

      findings.push({
        id: `stale-${safeId(repo.name)}`,
        category: "cleanup",
        severity: !repo.private ? "warning" : "info",
        title: `Repo ישן: "${repo.name}" (${days} ימים)`,
        description: `לא עודכן מאז ${new Date(repo.pushed_at).toLocaleDateString("he-IL")}.${!repo.private ? " PUBLIC." : ""}`,
        resource: { type: "github-repo", name: repo.full_name, platform: "github", url: repo.html_url },
        recommendation: !repo.private ? `הפוך ל-Private או ארכב` : `ארכב אם לא בשימוש`,
        autoFixable: false,
      });
    }
    return findings;
  },
};

export const undeployedRepos: AuditRule = {
  id: "undeployed-repos",
  name: "Repos ללא deployment",
  category: "cleanup",
  run(ctx) {
    const findings: AuditFinding[] = [];
    const deployed = getDeployedRepoNames(ctx);

    for (const repo of ctx.repos) {
      if (daysSince(repo.pushed_at) > 90) continue; // staleRepos handles old ones
      if (deployed.has(repo.name.toLowerCase())) continue;
      // Skip repos that might be tools/scripts (no web framework indicators)
      if (repo.language === "Shell" || repo.language === "Vim Script") continue;

      findings.push({
        id: `undeployed-${safeId(repo.name)}`,
        category: "cleanup",
        severity: "info",
        title: `Repo פעיל ללא deployment: "${repo.name}"`,
        description: `עודכן ${new Date(repo.pushed_at).toLocaleDateString("he-IL")}. ${repo.language ?? ""} · לא מחובר לשום פלטפורמה.`,
        resource: { type: "github-repo", name: repo.full_name, platform: "github", url: repo.html_url },
        recommendation: `פרויקט web → חבר ל-Vercel. כלי CLI → תקין.`,
        autoFixable: false,
      });
    }
    return findings;
  },
};

// ─── PERFORMANCE ──────────────────────────────────────────────────

export const slowEndpoints: AuditRule = {
  id: "slow-endpoints",
  name: "Endpoints איטיים",
  category: "performance",
  run(ctx) {
    const findings: AuditFinding[] = [];
    if (ctx.healthResults.length === 0) return findings;

    const vercelTimes = ctx.healthResults
      .filter((h) => h.platform === "vercel" && h.status === "up")
      .map((h) => h.responseTime);
    const avgVercel = vercelTimes.length > 0
      ? vercelTimes.reduce((s, t) => s + t, 0) / vercelTimes.length
      : 100;

    for (const h of ctx.healthResults) {
      if (h.status !== "up" || h.responseTime <= 500) continue;

      const isVps = h.platform !== "vercel";
      const factor = isVps && avgVercel > 0 ? (h.responseTime / avgVercel).toFixed(1) : "";

      findings.push({
        id: `slow-${safeId(h.name)}`,
        category: "performance",
        severity: h.responseTime > 2000 ? "warning" : "info",
        title: `${h.name} - ${h.responseTime}ms${factor ? ` (x${factor})` : ""}`,
        description: `Response: ${h.responseTime}ms.${factor ? ` פי ${factor} מממוצע Vercel (${Math.round(avgVercel)}ms).` : ""}`,
        resource: { type: "endpoint", name: h.name, platform: h.platform, url: h.url },
        recommendation: isVps
          ? `שקול CF caching, CDN, או העברה ל-serverless`
          : `בדוק bottlenecks בצד שרת`,
        autoFixable: false,
      });
    }
    return findings;
  },
};

// ─── REGISTRY ─────────────────────────────────────────────────────
// To add a new rule: 1) write it above, 2) add to this array.

export const allRules: AuditRule[] = [
  publicRepos,
  serverSecurity,
  duplicateProjects,
  noRepoLinked,
  dnsIntegrity,
  missingCustomDomain,
  deploymentDrift,
  noCICD,
  failedWorkflows,
  staleRepos,
  undeployedRepos,
  slowEndpoints,
];
