import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { config } from "./config"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Management console URL helpers — all derived from config (no hardcoded values)
export const mgmt = {
  vercel: {
    project: (name: string) => `https://vercel.com/${config.vercelTeamSlug}/${name}`,
    deployment: (name: string, id: string) => `https://vercel.com/${config.vercelTeamSlug}/${name}/${id}`,
    domains: (name: string) => `https://vercel.com/${config.vercelTeamSlug}/${name}/settings/domains`,
    envVars: (name: string) => `https://vercel.com/${config.vercelTeamSlug}/${name}/settings/environment-variables`,
    logs: (name: string) => `https://vercel.com/${config.vercelTeamSlug}/${name}/logs`,
    analytics: (name: string) => `https://vercel.com/${config.vercelTeamSlug}/${name}/analytics`,
    usage: () => `https://vercel.com/${config.vercelTeamSlug}/~/usage`,
  },
  cloudflare: {
    zone: (domain: string) => `https://dash.cloudflare.com/${config.cfAccountId}/${domain}`,
    dns: (domain: string) => `https://dash.cloudflare.com/${config.cfAccountId}/${domain}/dns/records`,
    r2Bucket: (name: string) => `https://dash.cloudflare.com/${config.cfAccountId}/r2/default/buckets/${name}`,
    r2Overview: () => `https://dash.cloudflare.com/${config.cfAccountId}/r2/overview`,
    analytics: (domain: string) => `https://dash.cloudflare.com/${config.cfAccountId}/${domain}/analytics`,
  },
  hetzner: {
    server: (id: number) => `https://console.hetzner.cloud/projects/default/servers/${id}`,
    overview: () => `https://console.hetzner.cloud/projects/default/servers`,
    firewall: () => `https://console.hetzner.cloud/projects/default/firewalls`,
  },
  netlify: {
    site: (name: string) => `https://app.netlify.com/sites/${name}`,
    deploys: (name: string) => `https://app.netlify.com/sites/${name}/deploys`,
    settings: (name: string) => `https://app.netlify.com/sites/${name}/settings/general`,
    overview: () => `https://app.netlify.com`,
  },
  github: {
    repo: (org: string, repo: string) => `https://github.com/${org}/${repo}`,
    actions: (org: string, repo: string) => `https://github.com/${org}/${repo}/actions`,
    settings: (org: string, repo: string) => `https://github.com/${org}/${repo}/settings`,
    profile: (user: string) => `https://github.com/${user}`,
  },
};
