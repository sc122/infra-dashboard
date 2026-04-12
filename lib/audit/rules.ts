import type { AuditFinding, AuditContext } from "@/lib/types";
import { mgmt } from "@/lib/utils";

type AuditRule = (ctx: AuditContext) => AuditFinding[];

// ─── SECURITY RULES ───────────────────────────────────────────────

const checkPublicRepos: AuditRule = (ctx) => {
  const findings: AuditFinding[] = [];
  // Repos that are deployed (have a Vercel project or Dockerfile) shouldn't be public
  const deployedRepoNames = new Set(
    ctx.vercelProjects
      .filter((p) => p.link?.repo)
      .map((p) => p.link!.repo.toLowerCase())
  );
  // Also check repos with Dockerfiles
  for (const [repoName, cicd] of Object.entries(ctx.repoCICD)) {
    if (cicd.hasDockerfile) deployedRepoNames.add(repoName.toLowerCase());
  }

  for (const repo of ctx.repos) {
    if (!repo.private && deployedRepoNames.has(repo.name.toLowerCase())) {
      findings.push({
        id: `pub-${repo.name}`,
        category: "security",
        severity: "critical",
        title: `Repo ציבורי עם קוד production: ${repo.name}`,
        description: `${repo.full_name} הוא public אבל מחובר ל-deployment חי. קוד production חשוף לכולם.`,
        resource: { type: "github-repo", name: repo.full_name, platform: "github", url: repo.html_url },
        recommendation: `הפוך ל-Private ב-GitHub → Settings → Danger Zone`,
        autoFixable: false,
      });
    }
  }
  return findings;
};

const checkNoFirewall: AuditRule = (ctx) => {
  const findings: AuditFinding[] = [];
  for (const server of ctx.hetznerServers) {
    // Hetzner API doesn't expose firewall in list, but we know from earlier audit
    // This rule flags servers that have public IPs
    if (server.public_net?.ipv4?.ip) {
      findings.push({
        id: `fw-${server.id}`,
        category: "security",
        severity: "critical",
        title: `שרת ${server.name} - בדוק הגדרות Firewall`,
        description: `השרת ${server.name} (${server.public_net.ipv4.ip}) חשוף עם IP ציבורי. ודא שיש Cloud Firewall מוגדר.`,
        resource: { type: "hetzner-server", name: server.name, platform: "hetzner", url: mgmt.hetzner.server(server.id) },
        recommendation: `הפעל Hetzner Cloud Firewall → פתח רק ports 80, 443, 22`,
        autoFixable: false,
      });
    }
  }
  return findings;
};

// ─── DEPLOYMENT RULES ─────────────────────────────────────────────

const checkDuplicateProjects: AuditRule = (ctx) => {
  const findings: AuditFinding[] = [];
  const repoMap = new Map<string, string[]>();

  for (const p of ctx.vercelProjects) {
    const repo = p.link?.repo?.toLowerCase();
    if (!repo) continue;
    if (!repoMap.has(repo)) repoMap.set(repo, []);
    repoMap.get(repo)!.push(p.name);
  }

  for (const [repo, projects] of repoMap) {
    if (projects.length > 1) {
      findings.push({
        id: `dup-${repo}`,
        category: "deployment",
        severity: "warning",
        title: `כפילות: ${projects.length} Vercel projects מ-repo "${repo}"`,
        description: `Projects: ${projects.join(", ")} מחוברים לאותו repo. כל push מייצר ${projects.length} builds.`,
        resource: { type: "vercel-project", name: projects[1], platform: "vercel", url: mgmt.vercel.project(projects[1]) },
        recommendation: `מחק את "${projects[1]}" ב-Vercel Dashboard`,
        autoFixable: false,
      });
    }
  }
  return findings;
};

const checkNoRepoLinked: AuditRule = (ctx) => {
  const findings: AuditFinding[] = [];
  for (const p of ctx.vercelProjects) {
    if (!p.link?.repo) {
      findings.push({
        id: `no-repo-${p.name}`,
        category: "deployment",
        severity: "warning",
        title: `"${p.name}" ללא GitHub repo`,
        description: `Vercel project "${p.name}" לא מחובר ל-GitHub. Deploy רק ידני, ללא PR previews ו-rollbacks.`,
        resource: { type: "vercel-project", name: p.name, platform: "vercel", url: mgmt.vercel.project(p.name) },
        recommendation: `צור repo ב-GitHub וחבר ב-Vercel → Settings → Git`,
        autoFixable: false,
      });
    }
  }
  return findings;
};

const checkOrphanDNS: AuditRule = (ctx) => {
  const findings: AuditFinding[] = [];
  const hetznerIPs = new Set(ctx.hetznerServers.map((s) => s.public_net?.ipv4?.ip).filter(Boolean));

  for (const record of ctx.dnsRecords) {
    if (record.type !== "A") continue;
    if (!hetznerIPs.has(record.content)) continue;
    // Check if any health check found this domain down
    const health = ctx.healthResults.find((h) => h.url?.includes(record.name));
    if (health && health.status === "down") {
      findings.push({
        id: `orphan-${record.name}`,
        category: "deployment",
        severity: "warning",
        title: `DNS record "${record.name}" מצביע לשירות שלא מגיב`,
        description: `${record.name} → ${record.content} מחזיר שגיאה. ייתכן שה-container לא רץ.`,
        resource: { type: "dns-record", name: record.name, platform: "cloudflare", url: mgmt.cloudflare.dns(record.name.split(".").slice(-2).join(".")) },
        recommendation: `בדוק שה-Docker container רץ על ה-VPS, או מחק את ה-DNS record`,
        autoFixable: false,
      });
    }
  }
  return findings;
};

const checkMissingCustomDomain: AuditRule = (ctx) => {
  const findings: AuditFinding[] = [];
  for (const p of ctx.vercelProjects) {
    const hasCustom = p.domains?.some((d) => !d.endsWith(".vercel.app"));
    if (!hasCustom && p.latestDeployment?.target === "production") {
      findings.push({
        id: `no-domain-${p.name}`,
        category: "deployment",
        severity: "info",
        title: `"${p.name}" ללא custom domain`,
        description: `הפרויקט רץ רק על ${p.name}.vercel.app. שקול להוסיף סאב-דומיין מ-keepit-ai.com.`,
        resource: { type: "vercel-project", name: p.name, platform: "vercel", url: mgmt.vercel.domains(p.name) },
        recommendation: `הוסף domain ב-Vercel → Settings → Domains`,
        autoFixable: false,
      });
    }
  }
  return findings;
};

// ─── CI/CD RULES ──────────────────────────────────────────────────

const checkNoCICD: AuditRule = (ctx) => {
  const findings: AuditFinding[] = [];
  for (const [repoName, cicd] of Object.entries(ctx.repoCICD)) {
    if (cicd.hasDockerfile && !cicd.hasActions) {
      findings.push({
        id: `no-cicd-${repoName}`,
        category: "cicd",
        severity: "warning",
        title: `"${repoName}" - Dockerfile ללא CI/CD`,
        description: `ל-repo יש Dockerfile אבל אין GitHub Actions. Deploy ידני דרך SSH.`,
        resource: { type: "github-repo", name: repoName, platform: "github", url: `https://github.com/sc122/${repoName}` },
        recommendation: `הוסף GitHub Actions workflow עם SSH deploy אוטומטי`,
        autoFixable: false,
      });
    }
  }
  return findings;
};

const checkFailedWorkflows: AuditRule = (ctx) => {
  const findings: AuditFinding[] = [];
  for (const [repoName, cicd] of Object.entries(ctx.repoCICD)) {
    if (cicd.lastRun?.conclusion === "failure") {
      findings.push({
        id: `fail-${repoName}`,
        category: "cicd",
        severity: "warning",
        title: `CI/CD נכשל: ${repoName}`,
        description: `Workflow "${cicd.lastRun.name}" נכשל. Branch: ${cicd.lastRun.head_branch}.`,
        resource: { type: "github-workflow", name: repoName, platform: "github", url: cicd.lastRun.html_url },
        recommendation: `בדוק את הלוגים ותקן את ה-build`,
        autoFixable: false,
      });
    }
  }
  return findings;
};

// ─── CLEANUP RULES ────────────────────────────────────────────────

const checkStaleRepos: AuditRule = (ctx) => {
  const findings: AuditFinding[] = [];
  const threeMonthsAgo = Date.now() - 90 * 24 * 60 * 60 * 1000;

  for (const repo of ctx.repos) {
    const pushed = new Date(repo.pushed_at).getTime();
    if (pushed < threeMonthsAgo) {
      const daysSince = Math.floor((Date.now() - pushed) / (24 * 60 * 60 * 1000));
      findings.push({
        id: `stale-${repo.name}`,
        category: "cleanup",
        severity: "info",
        title: `Repo ישן: "${repo.name}" (${daysSince} ימים)`,
        description: `לא עודכן מאז ${new Date(repo.pushed_at).toLocaleDateString("he-IL")}. ${repo.private ? "Private" : "⚠️ Public"}.`,
        resource: { type: "github-repo", name: repo.full_name, platform: "github", url: repo.html_url },
        recommendation: `ארכב (Archive) אם לא בשימוש, או הפוך ל-Private אם ציבורי`,
        autoFixable: false,
      });
    }
  }
  return findings;
};

const checkUndeployedRepos: AuditRule = (ctx) => {
  const findings: AuditFinding[] = [];
  const twoMonthsAgo = Date.now() - 60 * 24 * 60 * 60 * 1000;

  // Build set of deployed repo names
  const deployedRepos = new Set<string>();
  for (const p of ctx.vercelProjects) {
    if (p.link?.repo) deployedRepos.add(p.link.repo.toLowerCase());
  }
  // Repos with Dockerfiles are also "deployed"
  for (const [repoName, cicd] of Object.entries(ctx.repoCICD)) {
    if (cicd.hasDockerfile || cicd.hasVercelConfig) deployedRepos.add(repoName.toLowerCase());
  }

  for (const repo of ctx.repos) {
    const pushed = new Date(repo.pushed_at).getTime();
    if (pushed > twoMonthsAgo && !deployedRepos.has(repo.name.toLowerCase())) {
      findings.push({
        id: `undeployed-${repo.name}`,
        category: "cleanup",
        severity: "info",
        title: `Repo אקטיבי ללא deployment: "${repo.name}"`,
        description: `Repo פעיל (עודכן ${new Date(repo.pushed_at).toLocaleDateString("he-IL")}) אבל לא מחובר ל-Vercel או Docker.`,
        resource: { type: "github-repo", name: repo.full_name, platform: "github", url: repo.html_url },
        recommendation: `אם זה פרויקט web - חבר ל-Vercel. אם כלי CLI - תקין.`,
        autoFixable: false,
      });
    }
  }
  return findings;
};

// ─── PERFORMANCE RULES ────────────────────────────────────────────

const checkSlowEndpoints: AuditRule = (ctx) => {
  const findings: AuditFinding[] = [];
  for (const h of ctx.healthResults) {
    if (h.status === "up" && h.responseTime > 500) {
      findings.push({
        id: `slow-${h.name}`,
        category: "performance",
        severity: h.responseTime > 1000 ? "warning" : "info",
        title: `Endpoint איטי: ${h.name} (${h.responseTime}ms)`,
        description: `${h.url} מגיב ב-${h.responseTime}ms. מעל 500ms מומלץ לבדוק.`,
        resource: { type: "endpoint", name: h.name, platform: h.platform, url: h.url },
        recommendation: h.platform === "cloudflare"
          ? `שרתי VPS איטיים יותר מ-Vercel. שקול להעביר לשרות serverless.`
          : `בדוק את ה-server logs ואופטימיזציה.`,
        autoFixable: false,
      });
    }
  }
  return findings;
};

// ─── ALL RULES ────────────────────────────────────────────────────

export const allRules: AuditRule[] = [
  checkPublicRepos,
  checkNoFirewall,
  checkDuplicateProjects,
  checkNoRepoLinked,
  checkOrphanDNS,
  checkMissingCustomDomain,
  checkNoCICD,
  checkFailedWorkflows,
  checkStaleRepos,
  checkUndeployedRepos,
  checkSlowEndpoints,
];
