/**
 * Docker projects running on VPS (Hetzner).
 * Each subdomain = one Docker container = one project.
 *
 * To add a new Docker project:
 * 1. Add entry here
 * 2. Create DNS A record in Cloudflare → VPS IP
 * 3. Deploy container on VPS
 * That's it — the dashboard, audit, health checks, and Telegram
 * will automatically pick it up.
 */

export interface DockerProject {
  /** Subdomain (e.g. "camp.keepit-ai.com") */
  subdomain: string;
  /** GitHub repo name (e.g. "Zoom-class-assignments") */
  repo: string;
  /** Display name */
  name: string;
  /** Short description */
  description: string;
  /** Is it behind Cloudflare Access? */
  cfAccessProtected: boolean;
}

export const dockerProjects: DockerProject[] = [
  {
    subdomain: "camp.keepit-ai.com",
    repo: "Zoom-class-assignments",
    name: "קיפי",
    description: "פלטפורמת למידה לילדים, הורים ומורים",
    cfAccessProtected: false,
  },
  {
    subdomain: "edu-analytics.keepit-ai.com",
    repo: "edu-analytics",
    name: "EduAnalytics",
    description: "מערכת ניתוח השתתפות תלמידים",
    cfAccessProtected: false,
  },
  {
    subdomain: "guard.keepit-ai.com",
    repo: "parentguard",
    name: "ParentGuard",
    description: "ניטור והגנת הורים",
    cfAccessProtected: true,
  },
  {
    subdomain: "keep.keepit-ai.com",
    repo: "keepit-prod",
    name: "Keepit",
    description: "ניהול ושמירת קבלות",
    cfAccessProtected: false,
  },
  {
    subdomain: "saad.keepit-ai.com",
    repo: "holiday-attendance",
    name: "נוכחות סעד",
    description: "מערכת נוכחות לקבוצת סעד",
    cfAccessProtected: false,
  },
  {
    subdomain: "trade.keepit-ai.com",
    repo: "algo",
    name: "Trade",
    description: "מערכת מסחר אלגוריתמית",
    cfAccessProtected: true,
  },
];

/** Find Docker project by subdomain */
export function findDockerBySubdomain(subdomain: string): DockerProject | undefined {
  return dockerProjects.find((p) => p.subdomain === subdomain);
}

/** Find Docker project by repo name */
export function findDockerByRepo(repoName: string): DockerProject | undefined {
  return dockerProjects.find((p) => p.repo.toLowerCase() === repoName.toLowerCase());
}
