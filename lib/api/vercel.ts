import type { VercelProject, VercelDeployment } from "@/lib/types";

const VERCEL_API = "https://api.vercel.com";

async function vercelFetch<T>(path: string): Promise<T> {
  const token = process.env.VERCEL_TOKEN;
  const teamId = process.env.VERCEL_TEAM_ID;
  if (!token) throw new Error("VERCEL_TOKEN is not set");

  const separator = path.includes("?") ? "&" : "?";
  const url = `${VERCEL_API}${path}${teamId ? `${separator}teamId=${teamId}` : ""}`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    next: { revalidate: 60 },
  });

  if (!res.ok) {
    throw new Error(`Vercel API error: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

export async function listProjects(): Promise<VercelProject[]> {
  const data = await vercelFetch<{ projects: VercelProject[] }>("/v9/projects?limit=100");
  return data.projects;
}

export async function getProject(projectId: string): Promise<VercelProject> {
  return vercelFetch<VercelProject>(`/v9/projects/${projectId}`);
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
