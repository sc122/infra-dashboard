import type { HetznerServer } from "@/lib/types";

const HETZNER_API = "https://api.hetzner.cloud/v1";

async function hetznerFetch<T>(path: string): Promise<T> {
  const token = process.env.HETZNER_API_TOKEN;
  if (!token) throw new Error("HETZNER_API_TOKEN is not set");

  const res = await fetch(`${HETZNER_API}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    next: { revalidate: 30 },
  });

  if (!res.ok) {
    throw new Error(`Hetzner API error: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

export async function listServers(): Promise<HetznerServer[]> {
  const data = await hetznerFetch<{ servers: HetznerServer[] }>("/servers");
  return data.servers;
}

export async function getServer(serverId: number): Promise<HetznerServer> {
  const data = await hetznerFetch<{ server: HetznerServer }>(`/servers/${serverId}`);
  return data.server;
}

export async function getServerMetrics(
  serverId: number,
  type: "cpu" | "disk" | "network" = "cpu",
  period = "1h"
) {
  const end = new Date().toISOString();
  const start = new Date(Date.now() - parsePeriod(period)).toISOString();
  const data = await hetznerFetch<{ metrics: unknown }>(
    `/servers/${serverId}/metrics?type=${type}&start=${start}&end=${end}`
  );
  return data.metrics;
}

export async function rebootServer(serverId: number) {
  const token = process.env.HETZNER_API_TOKEN;
  if (!token) throw new Error("HETZNER_API_TOKEN is not set");

  const res = await fetch(`${HETZNER_API}/servers/${serverId}/actions/reboot`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    throw new Error(`Hetzner reboot error: ${res.status}`);
  }
  return res.json();
}

function parsePeriod(period: string): number {
  const match = period.match(/^(\d+)(m|h|d)$/);
  if (!match) return 3600000;
  const [, num, unit] = match;
  const multipliers: Record<string, number> = { m: 60000, h: 3600000, d: 86400000 };
  return parseInt(num) * (multipliers[unit] ?? 3600000);
}
