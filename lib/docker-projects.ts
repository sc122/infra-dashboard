/**
 * Auto-discovery engine for Docker projects.
 *
 * Discovers VPS Docker projects automatically by cross-referencing:
 * 1. Cloudflare DNS A records pointing to Hetzner VPS IPs
 * 2. GitHub repos with Dockerfiles
 * 3. Health check responses (page titles, meta tags)
 *
 * NO HARDCODED MAPPINGS. Everything is inferred from live data.
 */

import type { CFDNSRecord, GitHubRepo, HetznerServer, HealthCheck } from "@/lib/types";

export interface DockerProject {
  subdomain: string;
  repo: string | null;
  name: string;
  description: string;
  status: "up" | "down" | "protected" | "unknown";
  responseTime?: number;
  hasDockerfile: boolean;
  hasCICD: boolean;
  repoUrl?: string;
}

interface DiscoveryContext {
  dnsRecords: CFDNSRecord[];
  hetznerServers: HetznerServer[];
  repos: GitHubRepo[];
  repoCICD: Record<string, { hasDockerfile: boolean; hasActions: boolean }>;
  healthResults: HealthCheck[];
}

/**
 * Discover all Docker projects running on VPS by cross-referencing data sources.
 * Returns list of discovered projects with auto-matched repos.
 */
export function discoverDockerProjects(ctx: DiscoveryContext): DockerProject[] {
  const vpsIPs = new Set(
    ctx.hetznerServers.map((s) => s.public_net?.ipv4?.ip).filter(Boolean)
  );

  // Step 1: Find all DNS A records pointing to VPS
  const vpsSubdomains = ctx.dnsRecords.filter((r) => {
    if (r.type !== "A" || !vpsIPs.has(r.content)) return false;
    // Skip root domain and www (they're redirects, not projects)
    const root = r.name.split(".").slice(-2).join(".");
    return r.name !== root && r.name !== `www.${root}`;
  });

  // Step 2: Build index of repos with Dockerfiles for matching
  const dockerRepos = ctx.repos.filter((r) => ctx.repoCICD[r.name]?.hasDockerfile);

  // Step 3: For each subdomain, try to auto-match a repo
  return vpsSubdomains.map((dns) => {
    const subdomain = dns.name.split(".")[0]; // e.g. "camp", "edu-analytics"

    // Try multiple matching strategies
    const matchedRepo = findBestRepoMatch(subdomain, dns.name, dockerRepos, ctx);

    // Get health status
    const health = ctx.healthResults.find((h) => h.url?.includes(dns.name));
    const isProtected = health?.statusCode === 302 || health?.statusCode === 403;

    return {
      subdomain: dns.name,
      repo: matchedRepo?.name ?? null,
      name: extractProjectName(subdomain, health),
      description: matchedRepo?.description ?? "",
      status: isProtected ? "protected" : health?.status === "up" ? "up" : health?.status === "down" ? "down" : "unknown",
      responseTime: health?.responseTime,
      hasDockerfile: matchedRepo ? (ctx.repoCICD[matchedRepo.name]?.hasDockerfile ?? false) : false,
      hasCICD: matchedRepo ? (ctx.repoCICD[matchedRepo.name]?.hasActions ?? false) : false,
      repoUrl: matchedRepo?.html_url,
    };
  });
}

/**
 * Match a subdomain to a GitHub repo using multiple strategies:
 * 1. Exact name match (subdomain === repo name)
 * 2. Subdomain contained in repo name or vice versa (min 4 chars)
 * 3. Repo name with hyphens/underscores removed matches subdomain
 */
function findBestRepoMatch(
  subdomain: string,
  _fullDomain: string,
  dockerRepos: GitHubRepo[],
  ctx: DiscoveryContext
): GitHubRepo | null {
  const subClean = subdomain.toLowerCase().replace(/[-_]/g, "");

  // Strategy 1: Check ALL repos (not just Docker ones) for exact/close match
  for (const repo of ctx.repos) {
    const repoClean = repo.name.toLowerCase().replace(/[-_]/g, "");

    // Exact match
    if (repoClean === subClean) return repo;

    // Contained match (both directions, min 4 chars to avoid false positives)
    if (subClean.length >= 4 && repoClean.includes(subClean)) return repo;
    if (repoClean.length >= 4 && subClean.includes(repoClean)) return repo;
  }

  // Strategy 2: Check Docker repos specifically (they're more likely to be deployed)
  for (const repo of dockerRepos) {
    const repoClean = repo.name.toLowerCase().replace(/[-_]/g, "");
    if (subClean.length >= 3 && repoClean.includes(subClean)) return repo;
    if (repoClean.length >= 3 && subClean.includes(repoClean)) return repo;
  }

  return null;
}

/**
 * Try to extract a human-readable project name from subdomain or health data.
 */
function extractProjectName(subdomain: string, health?: HealthCheck): string {
  // Capitalize subdomain as fallback
  return subdomain
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/** Get set of repo names that are deployed as Docker projects */
export function getDockerDeployedRepos(ctx: DiscoveryContext): Set<string> {
  const projects = discoverDockerProjects(ctx);
  return new Set(
    projects.filter((p) => p.repo).map((p) => p.repo!.toLowerCase())
  );
}
