import { NextResponse } from "next/server";
import { listProjectsBasic } from "@/lib/api/vercel";
import { listZones, listDNSRecords } from "@/lib/api/cloudflare";
import type { HealthCheck } from "@/lib/types";

export const dynamic = "force-dynamic";

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
      url,
      name,
      platform,
      status: res.ok ? "up" : "down",
      responseTime: Date.now() - start,
      checkedAt: new Date().toISOString(),
      statusCode: res.status,
    };
  } catch {
    return {
      url,
      name,
      platform,
      status: "down",
      responseTime: Date.now() - start,
      checkedAt: new Date().toISOString(),
    };
  }
}

export async function GET() {
  try {
    // Build list of endpoints to check
    const endpoints: { name: string; url: string; platform: string }[] = [];

    // Vercel projects - use latest deployment URL or construct from project name
    try {
      const projects = await listProjectsBasic();
      for (const p of projects) {
        // Use the latestDeployment URL if available, otherwise construct from name
        const url = p.latestDeployment?.url
          ? `https://${p.latestDeployment.url}`
          : `https://${p.name}.vercel.app`;
        endpoints.push({
          name: p.name,
          url,
          platform: "vercel",
        });
      }
    } catch {
      // Vercel API might not be configured
    }

    // Cloudflare subdomains (from DNS records pointing to VPS)
    try {
      const zones = await listZones();
      for (const zone of zones) {
        const records = await listDNSRecords(zone.id);
        const aRecords = records.filter(
          (r) => (r.type === "A" || r.type === "CNAME") && r.name !== zone.name
        );
        for (const record of aRecords) {
          endpoints.push({
            name: record.name,
            url: `https://${record.name}`,
            platform: "cloudflare",
          });
        }
      }
    } catch {
      // CF API might not be configured
    }

    // Run all checks in parallel
    const results = await Promise.all(
      endpoints.map((ep) => checkEndpoint(ep.name, ep.url, ep.platform))
    );

    return NextResponse.json({
      checkedAt: new Date().toISOString(),
      total: results.length,
      up: results.filter((r) => r.status === "up").length,
      down: results.filter((r) => r.status === "down").length,
      results,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
