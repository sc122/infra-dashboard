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
