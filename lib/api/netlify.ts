const NETLIFY_API = "https://api.netlify.com/api/v1";

async function netlifyFetch<T>(path: string): Promise<T> {
  const token = process.env.NETLIFY_TOKEN;
  if (!token) throw new Error("NETLIFY_TOKEN is not set");

  const res = await fetch(`${NETLIFY_API}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    next: { revalidate: 120 },
  });

  if (!res.ok) {
    throw new Error(`Netlify API error: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

export interface NetlifySite {
  id: string;
  name: string;
  url: string;
  ssl_url: string;
  custom_domain: string | null;
  default_domain: string;
  state: string;
  created_at: string;
  updated_at: string;
  published_deploy?: {
    id: string;
    state: string;
    created_at: string;
    published_at: string;
    title?: string;
    branch?: string;
    commit_ref?: string;
    commit_url?: string;
  };
  build_settings?: {
    repo_url?: string;
    repo_branch?: string;
    cmd?: string;
    dir?: string;
  };
  capabilities?: Record<string, unknown>;
}

export async function listSites(): Promise<NetlifySite[]> {
  return netlifyFetch<NetlifySite[]>("/sites?per_page=100");
}

export async function getSite(siteId: string): Promise<NetlifySite> {
  return netlifyFetch<NetlifySite>(`/sites/${siteId}`);
}

export async function listDeploys(siteId: string, limit = 10) {
  return netlifyFetch<Array<{
    id: string;
    state: string;
    created_at: string;
    published_at: string | null;
    title: string | null;
    branch: string | null;
    commit_ref: string | null;
    deploy_url: string;
    context: string;
  }>>(`/sites/${siteId}/deploys?per_page=${limit}`);
}
