import type { VercelProject, VercelDeployment } from "@/lib/types";

const VERCEL_API = "https://api.vercel.com";

async function vercelFetch<T>(path: string, noCache = false): Promise<T> {
  const token = process.env.MY_VERCEL_TOKEN;
  const teamId = process.env.VERCEL_TEAM_ID;
  if (!token) throw new Error("MY_VERCEL_TOKEN is not set");

  const separator = path.includes("?") ? "&" : "?";
  const url = `${VERCEL_API}${path}${teamId ? `${separator}teamId=${teamId}` : ""}`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    ...(noCache ? { cache: "no-store" } : { next: { revalidate: 60 } }),
  });

  if (!res.ok) {
    throw new Error(`Vercel API error: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

export async function listProjects(): Promise<VercelProject[]> {
  const data = await vercelFetch<{ projects: VercelProject[] }>("/v9/projects?limit=100");

  // Fetch domains for each project via the project domains endpoint
  const enriched = await Promise.all(
    data.projects.map(async (p) => {
      try {
        const domainData = await vercelFetch<{ domains: { name: string }[] }>(
          `/v9/projects/${p.id}/domains`,
          true
        );
        const domainNames = domainData.domains?.map((d) => d.name) ?? [];
        // Also fetch project details for the link (GitHub repo)
        const detail = await vercelFetch<VercelProject>(`/v9/projects/${p.id}`, true);
        return { ...p, domains: domainNames, link: detail.link };
      } catch {
        return { ...p, domains: [] };
      }
    })
  );
  return enriched;
}

export async function listProjectsBasic(): Promise<VercelProject[]> {
  // Lightweight version without domain enrichment (for health checks)
  const data = await vercelFetch<{ projects: VercelProject[] }>("/v9/projects?limit=100", true);
  return data.projects;
}

export async function getProject(projectId: string): Promise<VercelProject> {
  const project = await vercelFetch<VercelProject>(`/v9/projects/${projectId}`);
  // Also get domains
  try {
    const domainData = await vercelFetch<{ domains: { name: string }[] }>(
      `/v9/projects/${projectId}/domains`,
      true
    );
    project.domains = domainData.domains?.map((d) => d.name) ?? [];
  } catch {
    project.domains = [];
  }
  return project;
}

export async function listDeployments(
  projectId: string,
  limit = 10
): Promise<VercelDeployment[]> {
  const data = await vercelFetch<{ deployments: VercelDeployment[] }>(
    `/v6/deployments?projectId=${projectId}&limit=${limit}`
  );
  return data.deployments;
}

export async function getDeploymentEvents(deploymentId: string) {
  return vercelFetch<unknown[]>(`/v3/deployments/${deploymentId}/events`);
}

export async function getDomains() {
  const data = await vercelFetch<{ domains: { name: string; configured: boolean; verified: boolean }[] }>(
    "/v5/domains"
  );
  return data.domains;
}

// Usage / billing data
export interface VercelUsage {
  bandwidth: { used: number; limit: number; unit: string };
  buildMinutes: { used: number; limit: number; unit: string };
  serverlessFunctions: { used: number; limit: number; unit: string };
  sourceImages: { used: number; limit: number; unit: string };
}

export async function getUsage(): Promise<VercelUsage> {
  try {
    // Try the usage endpoint
    const data = await vercelFetch<{
      usage?: {
        bandwidth?: { value: number };
        buildExecution?: { value: number };
        serverlessFunctionExecution?: { value: number };
        sourceImages?: { value: number };
      };
      billing?: { plan?: string };
    }>("/v6/usage", true);

    const u = data.usage ?? {};
    return {
      bandwidth: { used: (u.bandwidth?.value ?? 0) / (1024 * 1024 * 1024), limit: 100, unit: "GB" },
      buildMinutes: { used: (u.buildExecution?.value ?? 0) / 60, limit: 6000, unit: "min" },
      serverlessFunctions: { used: (u.serverlessFunctionExecution?.value ?? 0) / 3600, limit: 100, unit: "GB-Hrs" },
      sourceImages: { used: u.sourceImages?.value ?? 0, limit: 100, unit: "images" },
    };
  } catch {
    // If usage API not available, return zeros
    return {
      bandwidth: { used: 0, limit: 100, unit: "GB" },
      buildMinutes: { used: 0, limit: 6000, unit: "min" },
      serverlessFunctions: { used: 0, limit: 100, unit: "GB-Hrs" },
      sourceImages: { used: 0, limit: 100, unit: "images" },
    };
  }
}
