import type { CFZone, CFDNSRecord, CFR2Bucket } from "@/lib/types";

const CF_API = "https://api.cloudflare.com/client/v4";

async function cfFetch<T>(path: string): Promise<T> {
  const token = process.env.CF_API_TOKEN;
  if (!token) throw new Error("CF_API_TOKEN is not set");

  const res = await fetch(`${CF_API}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    next: { revalidate: 60 },
  });

  if (!res.ok) {
    throw new Error(`Cloudflare API error: ${res.status} ${res.statusText}`);
  }
  const data = await res.json();
  return data.result;
}

export async function listZones(): Promise<CFZone[]> {
  return cfFetch<CFZone[]>("/zones?per_page=50");
}

export async function getZone(zoneId: string): Promise<CFZone> {
  return cfFetch<CFZone>(`/zones/${zoneId}`);
}

export async function listDNSRecords(zoneId: string): Promise<CFDNSRecord[]> {
  return cfFetch<CFDNSRecord[]>(`/zones/${zoneId}/dns_records?per_page=100`);
}

export async function listR2Buckets(): Promise<CFR2Bucket[]> {
  const accountId = process.env.CF_ACCOUNT_ID;
  if (!accountId) throw new Error("CF_ACCOUNT_ID is not set");
  const data = await cfFetch<{ buckets: CFR2Bucket[] }>(
    `/accounts/${accountId}/r2/buckets`
  );
  return (data as unknown as { buckets: CFR2Bucket[] }).buckets ?? (data as unknown as CFR2Bucket[]);
}

export async function listWorkers(): Promise<{ id: string; name: string; created_on: string }[]> {
  const accountId = process.env.CF_ACCOUNT_ID;
  if (!accountId) throw new Error("CF_ACCOUNT_ID is not set");
  return cfFetch(`/accounts/${accountId}/workers/scripts`);
}

// Zone analytics
export interface CFZoneAnalytics {
  requests: { all: number; cached: number; uncached: number };
  bandwidth: { all: number; cached: number; uncached: number };
  threats: { all: number };
  pageviews: { all: number };
}

export async function getZoneAnalytics(zoneId: string): Promise<CFZoneAnalytics> {
  try {
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const data = await cfFetch<{ totals: CFZoneAnalytics }>(
      `/zones/${zoneId}/analytics/dashboard?since=${since}&continuous=true`
    );
    return (data as unknown as { totals: CFZoneAnalytics }).totals ?? data as unknown as CFZoneAnalytics;
  } catch {
    return {
      requests: { all: 0, cached: 0, uncached: 0 },
      bandwidth: { all: 0, cached: 0, uncached: 0 },
      threats: { all: 0 },
      pageviews: { all: 0 },
    };
  }
}
