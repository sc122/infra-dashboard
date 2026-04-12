import { listProjectsBasic } from "@/lib/api/vercel";
import { listZones, listDNSRecords } from "@/lib/api/cloudflare";
import { listSites } from "@/lib/api/netlify";
import type { HealthCheck } from "@/lib/types";

async function checkEndpoint(name: string, url: string, platform: string): Promise<HealthCheck> {
  const start = Date.now();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
    });
    clearTimeout(timeout);
    return {
      url, name, platform,
      status: res.ok ? "up" : "down",
      responseTime: Date.now() - start,
      checkedAt: new Date().toISOString(),
      statusCode: res.status,
    };
  } catch {
    return {
      url, name, platform,
      status: "down",
      responseTime: Date.now() - start,
      checkedAt: new Date().toISOString(),
    };
  }
}

export async function runHealthChecks(): Promise<HealthCheck[]> {
  const endpoints: { name: string; url: string; platform: string }[] = [];

  // Vercel projects
  try {
    const projects = await listProjectsBasic();
    for (const p of projects) {
      const url = p.latestDeployment?.url
        ? `https://${p.latestDeployment.url}`
        : `https://${p.name}.vercel.app`;
      endpoints.push({ name: p.name, url, platform: "vercel" });
    }
  } catch { /* not configured */ }

  // Netlify sites
  try {
    const sites = await listSites();
    for (const s of sites) {
      const url = s.ssl_url || `https://${s.name}.netlify.app`;
      endpoints.push({ name: s.name, url, platform: "netlify" });
    }
  } catch { /* not configured */ }

  // Cloudflare subdomains
  try {
    const zones = await listZones();
    for (const zone of zones) {
      const records = await listDNSRecords(zone.id);
      for (const r of records) {
        if ((r.type === "A" || r.type === "CNAME") && r.name !== zone.name) {
          endpoints.push({ name: r.name, url: `https://${r.name}`, platform: "cloudflare" });
        }
      }
    }
  } catch { /* not configured */ }

  return Promise.all(endpoints.map((ep) => checkEndpoint(ep.name, ep.url, ep.platform)));
}
