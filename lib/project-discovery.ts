/**
 * Project Discovery Engine
 *
 * A "project" = any URL that a user accesses.
 * This engine auto-discovers all projects by aggregating:
 *   1. Vercel projects (with their domains)
 *   2. Netlify sites (with their domains)
 *   3. DNS A records pointing to VPS IPs (Docker containers)
 *   4. GitHub repos (linked by name matching or platform config)
 *
 * Zero config. Add a project on any platform → it appears automatically.
 */

import type {
  VercelProject, CFDNSRecord, HetznerServer,
  GitHubRepo, GitHubWorkflowRun, HealthCheck,
} from "@/lib/types";
import type { NetlifySite } from "@/lib/api/netlify";
import { config } from "@/lib/config";

// ─── Project Model ────────────────────────────────────────────

export interface Project {
  /** Unique ID (domain-based) */
  id: string;
  /** Display name (auto-extracted or from project config) */
  name: string;
  /** Primary URL users access */
  url: string;
  /** Primary domain */
  domain: string;
  /** Additional domains (aliases) */
  aliases: string[];

  /** Where it runs */
  hosting: {
    platform: "vercel" | "netlify" | "docker-vps";
    vercelProjectId?: string;
    vercelProjectName?: string;
    netlifySiteId?: string;
    netlifySiteName?: string;
    serverName?: string;
    serverIP?: string;
  };

  /** Source code repositories */
  repos: {
    name: string;
    fullName: string;
    url: string;
    language: string | null;
  }[];

  /** Live status */
  status: "up" | "down" | "protected" | "redirect" | "unknown";
  responseTime?: number;

  /** CI/CD info */
  cicd: {
    hasActions: boolean;
    hasDockerfile: boolean;
    lastRunConclusion?: string | null;
  };

  /** Custom domain (not .vercel.app) */
  hasCustomDomain: boolean;

  /** Cloudflare Access protection */
  cfAccessProtected: boolean;

  /** Last deployment or push time */
  lastActivity?: string;
}

// ─── Discovery Context ────────────────────────────────────────

export interface DiscoveryInput {
  vercelProjects: VercelProject[];
  netlifySites?: NetlifySite[];
  dnsRecords: CFDNSRecord[];
  hetznerServers: HetznerServer[];
  repos: GitHubRepo[];
  repoCICD: Record<string, {
    hasDockerfile: boolean;
    hasActions: boolean;
    hasVercelConfig: boolean;
    lastRun?: GitHubWorkflowRun;
  }>;
  healthResults: HealthCheck[];
  /** Repo → domains found inside repo config files (docker-compose, deploy scripts) */
  repoDeployTargets?: Record<string, string[]>;
}

// ─── Main Discovery Function ──────────────────────────────────

export function discoverAllProjects(input: DiscoveryInput): Project[] {
  const projects: Project[] = [];
  const seenDomains = new Set<string>();

  // ── Source 1: Vercel Projects ──
  for (const vp of input.vercelProjects) {
    // Pick the best domain (custom first, then .vercel.app)
    const allDomains = vp.domains ?? [];
    const customDomains = allDomains.filter((d) => !d.endsWith(".vercel.app"));
    const vercelDomains = allDomains.filter((d) =>
      d.endsWith(".vercel.app") && !d.includes(`-${config.vercelTeamSlug?.replace("-projects", "").replace(/s$/, "")}s-`) && !d.includes("-git-")
    );
    const primaryDomain = customDomains[0] ?? vercelDomains[0] ?? `${vp.name}.vercel.app`;

    if (seenDomains.has(primaryDomain)) continue;
    seenDomains.add(primaryDomain);

    // Find linked repo
    const linkedRepo = vp.link?.repo
      ? input.repos.find((r) => r.name.toLowerCase() === vp.link!.repo.toLowerCase())
      : null;

    // Health status
    const health = input.healthResults.find((h) =>
      h.name === vp.name || h.url?.includes(primaryDomain)
    );

    // CI/CD
    const cicdInfo = linkedRepo ? input.repoCICD[linkedRepo.name] : undefined;

    projects.push({
      id: `vercel-${vp.name}`,
      name: formatProjectName(vp.name),
      url: `https://${primaryDomain}`,
      domain: primaryDomain,
      aliases: allDomains.filter((d) => d !== primaryDomain && !d.includes(`-${config.vercelTeamSlug?.replace("-projects", "").replace(/s$/, "")}s-`) && !d.includes("-git-")),
      hosting: {
        platform: "vercel",
        vercelProjectId: vp.id,
        vercelProjectName: vp.name,
      },
      repos: linkedRepo ? [{
        name: linkedRepo.name,
        fullName: linkedRepo.full_name,
        url: linkedRepo.html_url,
        language: linkedRepo.language,
      }] : [],
      status: health?.status === "up" ? "up" : health?.status === "down" ? "down" : "unknown",
      responseTime: health?.responseTime,
      cicd: {
        hasActions: cicdInfo?.hasActions ?? false,
        hasDockerfile: cicdInfo?.hasDockerfile ?? false,
        lastRunConclusion: cicdInfo?.lastRun?.conclusion,
      },
      hasCustomDomain: customDomains.length > 0,
      cfAccessProtected: false,
      lastActivity: vp.latestDeployment?.createdAt
        ? new Date(vp.latestDeployment.createdAt).toISOString()
        : linkedRepo?.pushed_at,
    });
  }

  // ── Source 2: Netlify Sites ──
  for (const site of input.netlifySites ?? []) {
    const domain = site.custom_domain ?? site.default_domain ?? `${site.name}.netlify.app`;
    if (seenDomains.has(domain)) continue;
    seenDomains.add(domain);

    // Extract repo from build_settings
    const repoUrl = site.build_settings?.repo_url;
    let linkedRepo: GitHubRepo | null = null;
    if (repoUrl) {
      const repoName = repoUrl.split("/").pop()?.replace(/\.git$/, "");
      if (repoName) {
        linkedRepo = input.repos.find((r) => r.name.toLowerCase() === repoName.toLowerCase()) ?? null;
      }
    }

    const health = input.healthResults.find((h) => h.url?.includes(domain) || h.name === site.name);
    const cicdInfo = linkedRepo ? input.repoCICD[linkedRepo.name] : undefined;

    projects.push({
      id: `netlify-${site.id}`,
      name: formatProjectName(site.name),
      url: site.ssl_url || `https://${domain}`,
      domain,
      aliases: [],
      hosting: {
        platform: "netlify",
        netlifySiteId: site.id,
        netlifySiteName: site.name,
      },
      repos: linkedRepo ? [{
        name: linkedRepo.name,
        fullName: linkedRepo.full_name,
        url: linkedRepo.html_url,
        language: linkedRepo.language,
      }] : [],
      status: site.published_deploy?.state === "ready" ? "up" : health?.status ?? "unknown",
      responseTime: health?.responseTime,
      cicd: {
        hasActions: cicdInfo?.hasActions ?? false,
        hasDockerfile: cicdInfo?.hasDockerfile ?? false,
        lastRunConclusion: cicdInfo?.lastRun?.conclusion,
      },
      hasCustomDomain: !!site.custom_domain,
      cfAccessProtected: false,
      lastActivity: site.published_deploy?.published_at ?? site.updated_at,
    });
  }

  // ── Source 3: DNS → VPS (Docker projects) ──
  const vpsIPs = new Set(
    input.hetznerServers.map((s) => s.public_net?.ipv4?.ip).filter(Boolean)
  );
  const vpsServer = input.hetznerServers[0]; // Primary server

  const vpsDnsRecords = input.dnsRecords.filter((r) => {
    if (r.type !== "A" || !vpsIPs.has(r.content)) return false;
    const root = r.name.split(".").slice(-2).join(".");
    // Skip root and www (they're redirects, not projects)
    return r.name !== root && r.name !== `www.${root}`;
  });

  for (const dns of vpsDnsRecords) {
    if (seenDomains.has(dns.name)) continue;
    seenDomains.add(dns.name);

    const subdomain = dns.name.split(".")[0];

    // Try to match repos (name match + deploy target match)
    const matchedRepos = findMatchingRepos(subdomain, dns.name, input.repos, input.repoCICD, input.repoDeployTargets);

    // Health
    const health = input.healthResults.find((h) => h.url?.includes(dns.name));
    const isProtected = health?.statusCode === 302 || health?.statusCode === 403;

    // CI/CD from matched repo
    const primaryRepo = matchedRepos[0];
    const cicdInfo = primaryRepo ? input.repoCICD[primaryRepo.name] : undefined;

    projects.push({
      id: `docker-${subdomain}`,
      name: formatProjectName(subdomain),
      url: `https://${dns.name}`,
      domain: dns.name,
      aliases: [],
      hosting: {
        platform: "docker-vps",
        serverName: vpsServer?.name,
        serverIP: dns.content,
      },
      repos: matchedRepos.map((r) => ({
        name: r.name,
        fullName: r.full_name,
        url: r.html_url,
        language: r.language,
      })),
      status: isProtected ? "protected" : health?.status ?? "unknown",
      responseTime: health?.responseTime,
      cicd: {
        hasActions: cicdInfo?.hasActions ?? false,
        hasDockerfile: cicdInfo?.hasDockerfile ?? false,
        lastRunConclusion: cicdInfo?.lastRun?.conclusion,
      },
      hasCustomDomain: true, // All VPS subdomains are custom domains
      cfAccessProtected: isProtected,
      lastActivity: primaryRepo?.pushed_at,
    });
  }

  // Sort: UP first, then by name
  projects.sort((a, b) => {
    const statusOrder: Record<string, number> = { up: 0, protected: 1, unknown: 2, redirect: 3, down: 4 };
    const sDiff = (statusOrder[a.status] ?? 5) - (statusOrder[b.status] ?? 5);
    if (sDiff !== 0) return sDiff;
    return a.name.localeCompare(b.name, "he");
  });

  return projects;
}

// ─── Helpers ──────────────────────────────────────────────────

/** Find repos that match a subdomain using multiple strategies */
function findMatchingRepos(
  subdomain: string,
  fullDomain: string,
  repos: GitHubRepo[],
  repoCICD: DiscoveryInput["repoCICD"],
  repoDeployTargets?: Record<string, string[]>
): GitHubRepo[] {
  const subClean = subdomain.toLowerCase().replace(/[-_]/g, "");
  const matches: GitHubRepo[] = [];
  const matchedNames = new Set<string>();

  // Strategy 0: GitHub homepage field (most accurate — set by user)
  for (const repo of repos) {
    if (repo.homepage && (repo.homepage.includes(fullDomain))) {
      if (!matchedNames.has(repo.name)) {
        matches.push(repo);
        matchedNames.add(repo.name);
      }
    }
  }
  if (matches.length > 0) return matches;

  // Strategy 1: Repo deploy targets (docker-compose, deploy scripts mentioning this domain)
  // IMPORTANT: match the full domain exactly, or the subdomain against the TARGET's subdomain
  // (not against the full target string, because short subdomains would match the domain suffix)
  if (repoDeployTargets) {
    for (const [repoName, targets] of Object.entries(repoDeployTargets)) {
      const domainMatch = targets.some((t) => {
        // Exact full domain match
        if (t === fullDomain) return true;
        // Target is a full domain — extract its subdomain and compare
        if (t.includes(".")) {
          const targetSub = t.split(".")[0];
          return targetSub === subdomain;
        }
        // Target is a container name — match against subdomain
        return t.toLowerCase().replace(/[-_]/g, "") === subClean;
      });
      if (domainMatch) {
        const repo = repos.find((r) => r.name === repoName);
        if (repo && !matchedNames.has(repo.name)) {
          matches.push(repo);
          matchedNames.add(repo.name);
        }
      }
    }
  }
  if (matches.length > 0) return matches;

  // Strategy 2: Exact or contained name match
  for (const repo of repos) {
    const repoClean = repo.name.toLowerCase().replace(/[-_]/g, "");
    if (repoClean === subClean) {
      matches.push(repo); matchedNames.add(repo.name); continue;
    }
    if (subClean.length >= 4 && repoClean.includes(subClean)) {
      matches.push(repo); matchedNames.add(repo.name); continue;
    }
    if (repoClean.length >= 4 && subClean.includes(repoClean)) {
      matches.push(repo); matchedNames.add(repo.name); continue;
    }
  }
  if (matches.length > 0) return matches;

  // Strategy 3: Docker repos fuzzy match
  for (const repo of repos) {
    if (!repoCICD[repo.name]?.hasDockerfile) continue;
    const repoClean = repo.name.toLowerCase().replace(/[-_]/g, "");
    if (subClean.length >= 3 && repoClean.includes(subClean)) {
      if (!matchedNames.has(repo.name)) matches.push(repo);
    }
  }

  return matches;
}

/** Format a project name for display */
function formatProjectName(slug: string): string {
  return slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/** Get set of all deployed repo names (for audit) */
export function getDeployedRepoNames(input: DiscoveryInput): Set<string> {
  const projects = discoverAllProjects(input);
  const deployed = new Set<string>();
  for (const p of projects) {
    for (const r of p.repos) {
      deployed.add(r.name.toLowerCase());
    }
  }
  return deployed;
}
