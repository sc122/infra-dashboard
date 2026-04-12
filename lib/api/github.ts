import type { GitHubRepo, GitHubCommit, GitHubWorkflowRun } from "@/lib/types";

const GITHUB_API = "https://api.github.com";

async function ghFetch<T>(path: string): Promise<T> {
  const token = process.env.GITHUB_TOKEN;
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${GITHUB_API}${path}`, {
    headers,
    next: { revalidate: 120 },
  });

  if (!res.ok) {
    throw new Error(`GitHub API error: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

export async function listRepos(): Promise<GitHubRepo[]> {
  // Get user repos (owned, not forks, sorted by push date)
  const repos = await ghFetch<GitHubRepo[]>(
    "/user/repos?type=owner&sort=pushed&per_page=100"
  );
  return repos.filter((r) => !r.fork);
}

export async function getRepo(owner: string, repo: string): Promise<GitHubRepo> {
  return ghFetch<GitHubRepo>(`/repos/${owner}/${repo}`);
}

export async function getRepoCommits(
  owner: string,
  repo: string,
  limit = 5
): Promise<GitHubCommit[]> {
  return ghFetch<GitHubCommit[]>(`/repos/${owner}/${repo}/commits?per_page=${limit}`);
}

export async function listWorkflowRuns(
  owner: string,
  repo: string,
  limit = 5
): Promise<GitHubWorkflowRun[]> {
  try {
    const data = await ghFetch<{ workflow_runs: GitHubWorkflowRun[] }>(
      `/repos/${owner}/${repo}/actions/runs?per_page=${limit}`
    );
    return data.workflow_runs;
  } catch {
    return [];
  }
}

export async function checkFileExists(
  owner: string,
  repo: string,
  path: string
): Promise<boolean> {
  try {
    const token = process.env.GITHUB_TOKEN;
    const headers: Record<string, string> = {
      Accept: "application/vnd.github+json",
    };
    if (token) headers.Authorization = `Bearer ${token}`;

    const res = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/contents/${path}`, {
      headers,
      next: { revalidate: 300 },
    });
    return res.ok;
  } catch {
    return false;
  }
}

// Read file content from a repo (for domain/config detection)
export async function getFileContent(
  owner: string,
  repo: string,
  path: string
): Promise<string | null> {
  try {
    const data = await ghFetch<{ content: string; encoding: string }>(
      `/repos/${owner}/${repo}/contents/${path}`
    );
    if (data.encoding === "base64") {
      return Buffer.from(data.content, "base64").toString("utf-8");
    }
    return data.content;
  } catch {
    return null;
  }
}

// Extract domains/subdomains mentioned in repo config files
export async function extractRepoDeployTarget(
  owner: string,
  repo: string
): Promise<string[]> {
  const domains: string[] = [];

  // Check docker-compose.yml for container_name
  const compose = await getFileContent(owner, repo, "docker-compose.yml");
  if (compose) {
    // Look for domain references in comments or labels
    const domainMatches = compose.match(/[\w-]+\.keepit-ai\.com/g);
    if (domainMatches) domains.push(...domainMatches);
    // Extract container_name as a hint
    const containerMatch = compose.match(/container_name:\s*(\S+)/);
    if (containerMatch) domains.push(containerMatch[1]);
  }

  // Check deploy scripts for domain references
  for (const script of ["deploy.sh", "deploy-camp.sh", "deploy-prod.sh"]) {
    const content = await getFileContent(owner, repo, script);
    if (content) {
      const matches = content.match(/[\w-]+\.keepit-ai\.com/g);
      if (matches) domains.push(...matches);
    }
  }

  // Check package.json homepage field
  const pkg = await getFileContent(owner, repo, "package.json");
  if (pkg) {
    try {
      const parsed = JSON.parse(pkg);
      if (parsed.homepage) {
        const match = parsed.homepage.match(/([\w-]+\.(?:keepit-ai\.com|vercel\.app))/);
        if (match) domains.push(match[1]);
      }
    } catch { /* invalid JSON */ }
  }

  // Deduplicate
  return [...new Set(domains)];
}

// Get CI/CD info for a repo
export async function getRepoCICD(owner: string, repo: string) {
  const [hasActions, hasDockerfile, hasVercelConfig, runs] = await Promise.allSettled([
    checkFileExists(owner, repo, ".github/workflows"),
    checkFileExists(owner, repo, "Dockerfile"),
    checkFileExists(owner, repo, "vercel.json"),
    listWorkflowRuns(owner, repo, 1),
  ]);

  return {
    hasActions: hasActions.status === "fulfilled" ? hasActions.value : false,
    hasDockerfile: hasDockerfile.status === "fulfilled" ? hasDockerfile.value : false,
    hasVercelConfig: hasVercelConfig.status === "fulfilled" ? hasVercelConfig.value : false,
    lastRun: runs.status === "fulfilled" && runs.value.length > 0 ? runs.value[0] : undefined,
  };
}
