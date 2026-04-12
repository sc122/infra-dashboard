import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Management console URL helpers
const VERCEL_TEAM_SLUG = "sc122s-projects";
const CF_ACCOUNT_ID = "2ca3a08ea8923300e5667acecada4604";

export const mgmt = {
  vercel: {
    project: (name: string) => `https://vercel.com/${VERCEL_TEAM_SLUG}/${name}`,
    deployment: (name: string, id: string) => `https://vercel.com/${VERCEL_TEAM_SLUG}/${name}/${id}`,
    domains: (name: string) => `https://vercel.com/${VERCEL_TEAM_SLUG}/${name}/settings/domains`,
    envVars: (name: string) => `https://vercel.com/${VERCEL_TEAM_SLUG}/${name}/settings/environment-variables`,
    logs: (name: string) => `https://vercel.com/${VERCEL_TEAM_SLUG}/${name}/logs`,
    analytics: (name: string) => `https://vercel.com/${VERCEL_TEAM_SLUG}/${name}/analytics`,
    usage: () => `https://vercel.com/${VERCEL_TEAM_SLUG}/~/usage`,
  },
  cloudflare: {
    zone: (domain: string) => `https://dash.cloudflare.com/${CF_ACCOUNT_ID}/${domain}`,
    dns: (domain: string) => `https://dash.cloudflare.com/${CF_ACCOUNT_ID}/${domain}/dns/records`,
    r2Bucket: (name: string) => `https://dash.cloudflare.com/${CF_ACCOUNT_ID}/r2/default/buckets/${name}`,
    r2Overview: () => `https://dash.cloudflare.com/${CF_ACCOUNT_ID}/r2/overview`,
    analytics: (domain: string) => `https://dash.cloudflare.com/${CF_ACCOUNT_ID}/${domain}/analytics`,
  },
  hetzner: {
    server: (id: number) => `https://console.hetzner.cloud/projects/default/servers/${id}`,
    overview: () => `https://console.hetzner.cloud/projects/default/servers`,
    firewall: () => `https://console.hetzner.cloud/projects/default/firewalls`,
  },
  github: {
    repo: (org: string, repo: string) => `https://github.com/${org}/${repo}`,
    actions: (org: string, repo: string) => `https://github.com/${org}/${repo}/actions`,
    settings: (org: string, repo: string) => `https://github.com/${org}/${repo}/settings`,
    profile: (user: string) => `https://github.com/${user}`,
  },
};
