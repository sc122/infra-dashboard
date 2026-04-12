import type { AuditFinding, AuditContext } from "@/lib/types";
import { mgmt } from "@/lib/utils";

export type AuditRule = {
  id: string;
  name: string;
  category: AuditFinding["category"];
  run: (ctx: AuditContext) => AuditFinding[];
};

// ─── HELPERS ──────────────────────────────────────────────────────

function daysSince(date: string): number {
  return Math.floor((Date.now() - new Date(date).getTime()) / (24 * 60 * 60 * 1000));
}

/** Build set of repo names that are deployed somewhere */
function getDeployedRepoNames(ctx: AuditContext): Set<string> {
  const deployed = new Set<string>();
  // Vercel-linked repos
  for (const p of ctx.vercelProjects) {
    if (p.link?.repo) deployed.add(p.link.repo.toLowerCase());
  }
  // Repos with Docker (likely on VPS)
  for (const [name, cicd] of Object.entries(ctx.repoCICD)) {
    if (cicd.hasDockerfile || cicd.hasVercelConfig) deployed.add(name.toLowerCase());
  }
  return deployed;
}

/** Build mapping of DNS A records pointing to known VPS IPs */
function getDnsToVpsMap(ctx: AuditContext) {
  const vpsIPs = new Set(
    ctx.hetznerServers.map((s) => s.public_net?.ipv4?.ip).filter(Boolean)
  );
  return ctx.dnsRecords.filter(
    (r) => r.type === "A" && vpsIPs.has(r.content)
  );
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

      // Check if this public repo is related to any deployed project
      const isDeployed = deployed.has(repo.name.toLowerCase());
      // Also check if name matches a Vercel project
      const matchesVercel = ctx.vercelProjects.some(
        (p) => p.name.toLowerCase().includes(repo.name.toLowerCase())
      );

      if (isDeployed || matchesVercel) {
        findings.push({
          id: `pub-deployed-${repo.name}`,
          category: "security",
          severity: "critical",
          title: `Repo ציבורי עם קוד production: ${repo.name}`,
          description: `${repo.full_name} הוא public אבל מחובר ל-deployment חי. קוד production חשוף.`,
          resource: { type: "github-repo", name: repo.full_name, platform: "github", url: repo.html_url },
          recommendation: `GitHub → ${repo.full_name} → Settings → Danger Zone → Make private`,
          autoFixable: false,
        });
      } else if (daysSince(repo.pushed_at) > 180) {
        findings.push({
          id: `pub-stale-${repo.name}`,
          category: "security",
          severity: "info",
          title: `Repo ציבורי לא פעיל: ${repo.name}`,
          description: `${repo.full_name} ציבורי ולא עודכן ${daysSince(repo.pushed_at)} ימים. ודא שאין בו secrets ב-commit history.`,
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
      // Check backups via rescue_enabled or protection fields
      const hasProtection = (server as unknown as Record<string, unknown>).protection as
        | { delete: boolean; rebuild: boolean }
        | undefined;
      if (!hasProtection?.delete) {
        findings.push({
          id: `no-delete-protect-${server.id}`,
          category: "security",
          severity: "warning",
          title: `${server.name} - אין Delete Protection`,
          description: `שרת ${server.name} ניתן למחיקה ללא הגנה. הפעל delete protection כדי למנוע מחיקה בטעות.`,
          resource: { type: "hetzner-server", name: server.name, platform: "hetzner", url: mgmt.hetzner.server(server.id) },
          recommendation: `Hetzner Console → ${server.name} → Networking → Enable delete protection`,
          autoFixable: false,
        });
      }

      // Check if server has many Docker services running (based on DNS records pointing to it)
      const vpsRecords = getDnsToVpsMap(ctx).filter(
        (r) => r.content === server.public_net?.ipv4?.ip
      );
      if (vpsRecords.length >= 5) {
        findings.push({
          id: `many-services-${server.id}`,
          category: "security",
          severity: "info",
          title: `${server.name} מריץ ${vpsRecords.length} שירותים`,
          description: `${vpsRecords.length} DNS records מצביעים לשרת זה. ודא שכל השירותים עדכניים ומאובטחים.`,
          resource: { type: "hetzner-server", name: server.name, platform: "hetzner", url: mgmt.hetzner.server(server.id) },
          recommendation: `בדוק תקינות כל container וודא שאין services מיותרים`,
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
          id: `dup-${repo}`,
          category: "deployment",
          severity: "warning",
          title: `כפילות: ${projects.length} Vercel projects מ-repo "${repo}"`,
          description: `${projects.join(", ")} מחוברים לאותו repo. כל push → ${projects.length} builds כפולים, בזבוז build minutes.`,
          resource: { type: "vercel-project", name: projects.slice(1).join(", "), platform: "vercel", url: mgmt.vercel.project(projects[1]) },
          recommendation: `מחק את "${projects[1]}" ב-Vercel Dashboard`,
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
          id: `no-repo-${p.name}`,
          category: "deployment",
          severity: "warning",
          title: `"${p.name}" ללא GitHub repo`,
          description: `Deploy ידני בלבד. אין PR previews, rollback קשה, אין version control.`,
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
  name: "תקינות DNS records",
  category: "deployment",
  run(ctx) {
    const findings: AuditFinding[] = [];
    const vpsRecords = getDnsToVpsMap(ctx);

    for (const record of vpsRecords) {
      // Skip root domain and www (they're redirects)
      const rootDomain = record.name.split(".").slice(-2).join(".");
      if (record.name === rootDomain || record.name === `www.${rootDomain}`) continue;

      // Check health
      const health = ctx.healthResults.find((h) => h.url?.includes(record.name));

      if (health?.status === "down") {
        findings.push({
          id: `dns-down-${record.name}`,
          category: "deployment",
          severity: "warning",
          title: `${record.name} לא מגיב (DNS → VPS)`,
          description: `DNS record מצביע ל-${record.content} אבל השירות לא מגיב. ייתכן container כבוי.`,
          resource: { type: "dns-record", name: record.name, platform: "cloudflare", url: mgmt.cloudflare.dns(rootDomain) },
          recommendation: `בדוק docker ps על ה-VPS או מחק DNS record מיותר`,
          autoFixable: false,
        });
      }

      // Check if we can identify the source repo
      const subdomain = record.name.split(".")[0];
      const matchingRepo = ctx.repos.find((r) =>
        r.name.toLowerCase().includes(subdomain) ||
        subdomain.includes(r.name.toLowerCase().replace(/[^a-z0-9]/g, ""))
      );

      if (!matchingRepo) {
        // Try matching via CI/CD context (repos with Dockerfiles)
        const dockerRepos = Object.entries(ctx.repoCICD).filter(([, c]) => c.hasDockerfile);
        const hasAnyMatch = dockerRepos.some(([name]) =>
          name.toLowerCase().includes(subdomain) || subdomain.includes(name.toLowerCase().replace(/[^a-z0-9]/g, ""))
        );

        if (!hasAnyMatch) {
          findings.push({
            id: `dns-no-repo-${record.name}`,
            category: "deployment",
            severity: "info",
            title: `${record.name} - לא מזוהה repo מקור`,
            description: `DNS record פעיל אבל לא מצאנו GitHub repo תואם. קשה לדעת מה הקוד שרץ שם.`,
            resource: { type: "dns-record", name: record.name, platform: "cloudflare", url: mgmt.cloudflare.dns(rootDomain) },
            recommendation: `תעד איזה repo/container מגיש את ${record.name}`,
            autoFixable: false,
          });
        }
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
          id: `no-domain-${p.name}`,
          category: "deployment",
          severity: "info",
          title: `"${p.name}" ללא custom domain`,
          description: `רץ רק על .vercel.app. לפרויקט user-facing שקול סאב-דומיין מ-keepit-ai.com.`,
          resource: { type: "vercel-project", name: p.name, platform: "vercel", url: mgmt.vercel.domains(p.name) },
          recommendation: `Vercel → ${p.name} → Settings → Domains`,
          autoFixable: false,
        });
      }
    }
    return findings;
  },
};

export const staleDeployments: AuditRule = {
  id: "stale-deployments",
  name: "Deployments ישנים",
  category: "deployment",
  run(ctx) {
    const findings: AuditFinding[] = [];
    const thirtyDays = 30 * 24 * 60 * 60 * 1000;

    for (const p of ctx.vercelProjects) {
      if (!p.latestDeployment?.createdAt) continue;
      const deployAge = Date.now() - p.latestDeployment.createdAt;
      if (deployAge > thirtyDays) {
        findings.push({
          id: `stale-deploy-${p.name}`,
          category: "deployment",
          severity: "info",
          title: `"${p.name}" - deploy ישן (${daysSince(new Date(p.latestDeployment.createdAt).toISOString())} ימים)`,
          description: `ה-deployment האחרון היה ב-${new Date(p.latestDeployment.createdAt).toLocaleDateString("he-IL")}. ודא שהקוד עדכני.`,
          resource: { type: "vercel-project", name: p.name, platform: "vercel", url: mgmt.vercel.project(p.name) },
          recommendation: `בדוק אם יש commits שלא deployed, או שהפרויקט מיושן`,
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

      if (cicd.hasDockerfile && !cicd.hasActions) {
        findings.push({
          id: `no-cicd-${repoName}`,
          category: "cicd",
          severity: "warning",
          title: `"${repoName}" - Dockerfile ללא CI/CD pipeline`,
          description: `ל-repo יש Dockerfile אבל אין GitHub Actions. כל deploy דורש SSH ידני.`,
          resource: { type: "github-repo", name: repo.full_name, platform: "github", url: `${repo.html_url}/actions` },
          recommendation: `הוסף .github/workflows/deploy.yml עם SSH deploy אוטומטי`,
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
      if (!cicd.lastRun) continue;

      if (cicd.lastRun.conclusion === "failure") {
        findings.push({
          id: `fail-${repoName}`,
          category: "cicd",
          severity: "warning",
          title: `CI/CD נכשל: ${repoName}`,
          description: `Workflow "${cicd.lastRun.name}" נכשל ב-branch ${cicd.lastRun.head_branch} (${new Date(cicd.lastRun.created_at).toLocaleDateString("he-IL")}).`,
          resource: { type: "github-workflow", name: repoName, platform: "github", url: cicd.lastRun.html_url },
          recommendation: `בדוק logs ב-GitHub Actions ותקן`,
          autoFixable: false,
        });
      }
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
    for (const repo of ctx.repos) {
      const days = daysSince(repo.pushed_at);
      if (days < 90) continue;

      const isPublic = !repo.private;
      findings.push({
        id: `stale-${repo.name}`,
        category: "cleanup",
        severity: isPublic ? "warning" : "info",
        title: `Repo ישן: "${repo.name}" (${days} ימים)`,
        description: `לא עודכן מאז ${new Date(repo.pushed_at).toLocaleDateString("he-IL")}.${isPublic ? " ⚠ PUBLIC - שקול להפוך ל-Private." : ""}`,
        resource: { type: "github-repo", name: repo.full_name, platform: "github", url: repo.html_url },
        recommendation: isPublic ? `הפוך ל-Private או ארכב` : `ארכב אם לא בשימוש`,
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
      if (daysSince(repo.pushed_at) > 60) continue; // Only check active repos
      if (deployed.has(repo.name.toLowerCase())) continue;

      findings.push({
        id: `undeployed-${repo.name}`,
        category: "cleanup",
        severity: "info",
        title: `Repo אקטיבי ללא deployment: "${repo.name}"`,
        description: `עודכן ${new Date(repo.pushed_at).toLocaleDateString("he-IL")} אבל לא מחובר לשום פלטפורמה. ${repo.language ?? ""}`,
        resource: { type: "github-repo", name: repo.full_name, platform: "github", url: repo.html_url },
        recommendation: `פרויקט web? → חבר ל-Vercel. כלי CLI? → תקין, התעלם.`,
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

    // Separate VPS vs Vercel for comparison
    const vpsEndpoints = ctx.healthResults.filter((h) => h.platform === "cloudflare" || h.platform === "hetzner");
    const vercelEndpoints = ctx.healthResults.filter((h) => h.platform === "vercel");
    const avgVercel = vercelEndpoints.length > 0
      ? vercelEndpoints.reduce((s, h) => s + h.responseTime, 0) / vercelEndpoints.length
      : 100;

    for (const h of ctx.healthResults) {
      if (h.status !== "up") continue;
      if (h.responseTime <= 500) continue;

      const isVps = vpsEndpoints.includes(h);
      const slowFactor = isVps ? (h.responseTime / avgVercel).toFixed(1) : "";

      findings.push({
        id: `slow-${h.name}`,
        category: "performance",
        severity: h.responseTime > 1000 ? "warning" : "info",
        title: `${h.name} - ${h.responseTime}ms${isVps ? ` (x${slowFactor} מ-Vercel)` : ""}`,
        description: `${h.url} response time: ${h.responseTime}ms.${isVps ? ` ה-VPS ב-Helsinki איטי פי ${slowFactor} מ-Vercel.` : ""}`,
        resource: { type: "endpoint", name: h.name, platform: h.platform, url: h.url },
        recommendation: isVps
          ? `שקול Cloudflare caching, CDN, או העברה ל-Vercel/CF Pages`
          : `בדוק server-side bottlenecks`,
        autoFixable: false,
      });
    }
    return findings;
  },
};

// ─── ALL RULES REGISTRY ──────────────────────────────────────────
// To add a new rule: create it above, add here. That's it.

export const allRules: AuditRule[] = [
  // Security
  publicRepos,
  serverSecurity,
  // Deployment
  duplicateProjects,
  noRepoLinked,
  dnsIntegrity,
  missingCustomDomain,
  staleDeployments,
  // CI/CD
  noCICD,
  failedWorkflows,
  // Cleanup
  staleRepos,
  undeployedRepos,
  // Performance
  slowEndpoints,
];
