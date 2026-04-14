/**
 * Demo Mode — realistic mock data for all platforms.
 * Activated by NEXT_PUBLIC_DEMO_MODE=true
 * No real API calls, no tokens needed.
 */

export function isDemoMode(): boolean {
  return process.env.NEXT_PUBLIC_DEMO_MODE === "true";
}

// ─── Vercel ──────────────────────────────────────────────────

export const demoVercelProjects = [
  {
    id: "prj_demo1", name: "my-saas-app", framework: "nextjs", nodeVersion: "24.x",
    createdAt: Date.now() - 90 * 86400000, updatedAt: Date.now() - 3600000, live: false,
    latestDeployment: { id: "dpl_1", url: "my-saas-app-demo.vercel.app", createdAt: Date.now() - 3600000, readyState: "READY", target: "production" },
    link: { type: "github", repo: "my-saas-app", org: "demo-user" },
    domains: ["app.example.com", "my-saas-app.vercel.app"],
  },
  {
    id: "prj_demo2", name: "company-website", framework: null, nodeVersion: "24.x",
    createdAt: Date.now() - 180 * 86400000, updatedAt: Date.now() - 86400000 * 7, live: false,
    latestDeployment: { id: "dpl_2", url: "company-website-demo.vercel.app", createdAt: Date.now() - 86400000 * 7, readyState: "READY", target: "production" },
    link: { type: "github", repo: "company-website", org: "demo-user" },
    domains: ["www.example.com", "example.com", "company-website.vercel.app"],
  },
  {
    id: "prj_demo3", name: "admin-panel", framework: "nextjs", nodeVersion: "24.x",
    createdAt: Date.now() - 60 * 86400000, updatedAt: Date.now() - 86400000 * 2, live: false,
    latestDeployment: { id: "dpl_3", url: "admin-panel-demo.vercel.app", createdAt: Date.now() - 86400000 * 2, readyState: "READY", target: "production" },
    link: { type: "github", repo: "admin-panel", org: "demo-user" },
    domains: ["admin.example.com", "admin-panel.vercel.app"],
  },
  {
    id: "prj_demo4", name: "docs-site", framework: "nextjs", nodeVersion: "24.x",
    createdAt: Date.now() - 120 * 86400000, updatedAt: Date.now() - 86400000 * 14, live: false,
    latestDeployment: { id: "dpl_4", url: "docs-site-demo.vercel.app", createdAt: Date.now() - 86400000 * 14, readyState: "READY", target: "production" },
    link: { type: "github", repo: "docs", org: "demo-user" },
    domains: ["docs.example.com", "docs-site.vercel.app"],
  },
  {
    id: "prj_demo5", name: "landing-page-v2", framework: null, nodeVersion: "24.x",
    createdAt: Date.now() - 10 * 86400000, updatedAt: Date.now() - 86400000, live: false,
    latestDeployment: { id: "dpl_5", url: "landing-page-v2-demo.vercel.app", createdAt: Date.now() - 86400000, readyState: "READY", target: null },
    link: { type: "github", repo: "landing-page-v2", org: "demo-user" },
    domains: ["landing-page-v2.vercel.app"],
  },
];

// ─── Netlify ─────────────────────────────────────────────────

export const demoNetlifySites = [
  {
    id: "site_1", name: "team-blog", url: "https://team-blog.netlify.app", ssl_url: "https://team-blog.netlify.app",
    custom_domain: "blog.example.com", default_domain: "team-blog.netlify.app", state: "ready",
    created_at: "2025-06-01T00:00:00Z", updated_at: "2026-04-01T00:00:00Z",
    published_deploy: { id: "d1", state: "ready", created_at: "2026-04-01T00:00:00Z", published_at: "2026-04-01T00:00:00Z" },
    build_settings: { repo_url: "https://github.com/demo-user/team-blog", repo_branch: "main" },
  },
  {
    id: "site_2", name: "status-page", url: "https://status-page.netlify.app", ssl_url: "https://status-page.netlify.app",
    custom_domain: null, default_domain: "status-page.netlify.app", state: "ready",
    created_at: "2025-09-01T00:00:00Z", updated_at: "2026-03-15T00:00:00Z",
    published_deploy: { id: "d2", state: "ready", created_at: "2026-03-15T00:00:00Z", published_at: "2026-03-15T00:00:00Z" },
    build_settings: { repo_url: "https://github.com/demo-user/status-page" },
  },
  {
    id: "site_3", name: "old-marketing-site", url: "https://old-marketing-site.netlify.app", ssl_url: "https://old-marketing-site.netlify.app",
    custom_domain: null, default_domain: "old-marketing-site.netlify.app", state: "ready",
    created_at: "2024-01-01T00:00:00Z", updated_at: "2025-03-01T00:00:00Z",
    published_deploy: { id: "d3", state: "ready", created_at: "2025-03-01T00:00:00Z", published_at: "2025-03-01T00:00:00Z" },
  },
];

// ─── Cloudflare ──────────────────────────────────────────────

export const demoCloudflareZones = [
  { id: "zone_1", name: "example.com", status: "active", paused: false, plan: { name: "Free" }, name_servers: ["ns1.cloudflare.com", "ns2.cloudflare.com"] },
];

export const demoCloudflareDNS = [
  { id: "r1", type: "A", name: "example.com", content: "185.199.108.1", proxied: true, ttl: 1 },
  { id: "r2", type: "A", name: "www.example.com", content: "185.199.108.1", proxied: true, ttl: 1 },
  { id: "r3", type: "A", name: "api.example.com", content: "95.216.100.50", proxied: true, ttl: 1 },
  { id: "r4", type: "A", name: "ws.example.com", content: "95.216.100.50", proxied: true, ttl: 1 },
  { id: "r5", type: "A", name: "monitor.example.com", content: "95.216.100.50", proxied: true, ttl: 1 },
  { id: "r6", type: "A", name: "staging.example.com", content: "95.216.100.50", proxied: true, ttl: 1 },
  { id: "r7", type: "CNAME", name: "app.example.com", content: "cname.vercel-dns.com", proxied: true, ttl: 1 },
  { id: "r8", type: "CNAME", name: "admin.example.com", content: "cname.vercel-dns.com", proxied: true, ttl: 1 },
  { id: "r9", type: "CNAME", name: "docs.example.com", content: "cname.vercel-dns.com", proxied: true, ttl: 1 },
  { id: "r10", type: "CNAME", name: "blog.example.com", content: "demo-user-blog.netlify.app", proxied: false, ttl: 1 },
  { id: "r11", type: "MX", name: "example.com", content: "route1.mx.cloudflare.net", proxied: false, ttl: 1 },
  { id: "r12", type: "TXT", name: "example.com", content: "v=spf1 include:_spf.mx.cloudflare.net ~all", proxied: false, ttl: 1 },
];

export const demoR2Buckets = [{ name: "uploads", creation_date: "2025-08-15T00:00:00Z" }];

// ─── Hetzner ─────────────────────────────────────────────────

export const demoHetznerServers = [
  {
    id: 12345, name: "prod-server", status: "running",
    public_net: { ipv4: { ip: "95.216.100.50" }, ipv6: { ip: "2a01:4f8::1" } },
    server_type: { name: "cx31", cores: 2, memory: 8, disk: 80, description: "CX31" },
    datacenter: { name: "nbg1-dc3", description: "Nuremberg 1 DC3" },
    image: { name: "ubuntu-24.04", os_flavor: "ubuntu", os_version: "24.04" },
    created: "2025-03-01T00:00:00Z",
  },
];

// ─── GitHub ──────────────────────────────────────────────────

const now = new Date().toISOString();
const daysAgo = (d: number) => new Date(Date.now() - d * 86400000).toISOString();

export const demoGitHubRepos = [
  { id: 1, name: "my-saas-app", full_name: "demo-user/my-saas-app", html_url: "https://github.com/demo-user/my-saas-app", homepage: "https://app.example.com", description: "SaaS application with auth, billing, dashboard", language: "TypeScript", default_branch: "main", pushed_at: daysAgo(1), updated_at: daysAgo(1), created_at: daysAgo(200), private: true, fork: false, topics: ["nextjs", "saas"], size: 4500, stargazers_count: 0, open_issues_count: 2 },
  { id: 2, name: "company-website", full_name: "demo-user/company-website", html_url: "https://github.com/demo-user/company-website", homepage: "https://www.example.com", description: "Company marketing website", language: "HTML", default_branch: "main", pushed_at: daysAgo(7), updated_at: daysAgo(7), created_at: daysAgo(365), private: true, fork: false, topics: [], size: 800, stargazers_count: 0, open_issues_count: 0 },
  { id: 3, name: "admin-panel", full_name: "demo-user/admin-panel", html_url: "https://github.com/demo-user/admin-panel", homepage: "https://admin.example.com", description: "Internal admin dashboard", language: "TypeScript", default_branch: "main", pushed_at: daysAgo(2), updated_at: daysAgo(2), created_at: daysAgo(120), private: true, fork: false, topics: ["admin"], size: 3200, stargazers_count: 0, open_issues_count: 1 },
  { id: 4, name: "api-server", full_name: "demo-user/api-server", html_url: "https://github.com/demo-user/api-server", homepage: "https://api.example.com", description: "REST API server — Express + PostgreSQL", language: "TypeScript", default_branch: "main", pushed_at: daysAgo(1), updated_at: daysAgo(1), created_at: daysAgo(300), private: true, fork: false, topics: ["api", "express"], size: 5600, stargazers_count: 0, open_issues_count: 3 },
  { id: 5, name: "realtime-service", full_name: "demo-user/realtime-service", html_url: "https://github.com/demo-user/realtime-service", homepage: "https://ws.example.com", description: "WebSocket server for real-time features", language: "TypeScript", default_branch: "main", pushed_at: daysAgo(5), updated_at: daysAgo(5), created_at: daysAgo(90), private: true, fork: false, topics: ["websocket"], size: 1200, stargazers_count: 0, open_issues_count: 0 },
  { id: 6, name: "docs", full_name: "demo-user/docs", html_url: "https://github.com/demo-user/docs", homepage: "https://docs.example.com", description: "Product documentation", language: "TypeScript", default_branch: "main", pushed_at: daysAgo(14), updated_at: daysAgo(14), created_at: daysAgo(200), private: false, fork: false, topics: ["docs"], size: 2100, stargazers_count: 5, open_issues_count: 0 },
  { id: 7, name: "landing-page-v2", full_name: "demo-user/landing-page-v2", html_url: "https://github.com/demo-user/landing-page-v2", homepage: null, description: "New landing page (WIP)", language: "HTML", default_branch: "main", pushed_at: daysAgo(1), updated_at: daysAgo(1), created_at: daysAgo(10), private: true, fork: false, topics: [], size: 400, stargazers_count: 0, open_issues_count: 0 },
  { id: 8, name: "team-blog", full_name: "demo-user/team-blog", html_url: "https://github.com/demo-user/team-blog", homepage: "https://blog.example.com", description: "Team engineering blog", language: "TypeScript", default_branch: "main", pushed_at: daysAgo(3), updated_at: daysAgo(3), created_at: daysAgo(180), private: false, fork: false, topics: ["blog"], size: 1500, stargazers_count: 12, open_issues_count: 0 },
  { id: 9, name: "monitoring-stack", full_name: "demo-user/monitoring-stack", html_url: "https://github.com/demo-user/monitoring-stack", homepage: "https://monitor.example.com", description: "Grafana + Prometheus monitoring", language: "Python", default_branch: "main", pushed_at: daysAgo(30), updated_at: daysAgo(30), created_at: daysAgo(150), private: true, fork: false, topics: ["monitoring"], size: 900, stargazers_count: 0, open_issues_count: 0 },
  { id: 10, name: "status-page", full_name: "demo-user/status-page", html_url: "https://github.com/demo-user/status-page", homepage: null, description: "Public status page", language: "JavaScript", default_branch: "main", pushed_at: daysAgo(45), updated_at: daysAgo(45), created_at: daysAgo(200), private: false, fork: false, topics: [], size: 300, stargazers_count: 2, open_issues_count: 0 },
  { id: 11, name: "ml-pipeline", full_name: "demo-user/ml-pipeline", html_url: "https://github.com/demo-user/ml-pipeline", homepage: null, description: "Machine learning data pipeline", language: "Python", default_branch: "main", pushed_at: daysAgo(60), updated_at: daysAgo(60), created_at: daysAgo(120), private: true, fork: false, topics: ["ml"], size: 7800, stargazers_count: 0, open_issues_count: 0 },
  { id: 12, name: "old-prototype", full_name: "demo-user/old-prototype", html_url: "https://github.com/demo-user/old-prototype", homepage: null, description: "Early prototype (archived)", language: "JavaScript", default_branch: "main", pushed_at: daysAgo(300), updated_at: daysAgo(300), created_at: daysAgo(500), private: true, fork: false, topics: [], size: 200, stargazers_count: 0, open_issues_count: 0 },
];

export const demoDeployTargets = {
  "api-server": ["api.example.com"],
  "realtime-service": ["ws.example.com"],
  "monitoring-stack": ["monitor.example.com"],
};

export const demoCICD: Record<string, { hasDockerfile: boolean; hasActions: boolean; hasVercelConfig: boolean; lastConclusion: string | null }> = {
  "my-saas-app": { hasDockerfile: false, hasActions: true, hasVercelConfig: true, lastConclusion: "success" },
  "company-website": { hasDockerfile: false, hasActions: true, hasVercelConfig: false, lastConclusion: "success" },
  "admin-panel": { hasDockerfile: false, hasActions: true, hasVercelConfig: true, lastConclusion: "success" },
  "api-server": { hasDockerfile: true, hasActions: true, hasVercelConfig: false, lastConclusion: "success" },
  "realtime-service": { hasDockerfile: true, hasActions: true, hasVercelConfig: false, lastConclusion: "failure" },
  "docs": { hasDockerfile: false, hasActions: true, hasVercelConfig: true, lastConclusion: "success" },
  "team-blog": { hasDockerfile: false, hasActions: false, hasVercelConfig: false, lastConclusion: null },
  "monitoring-stack": { hasDockerfile: true, hasActions: false, hasVercelConfig: false, lastConclusion: null },
  "status-page": { hasDockerfile: false, hasActions: false, hasVercelConfig: false, lastConclusion: null },
};

// ─── Health ──────────────────────────────────────────────────

export const demoHealthResults = [
  { url: "https://app.example.com", name: "my-saas-app", platform: "vercel", status: "up" as const, responseTime: 45, checkedAt: now, statusCode: 200 },
  { url: "https://www.example.com", name: "company-website", platform: "vercel", status: "up" as const, responseTime: 38, checkedAt: now, statusCode: 200 },
  { url: "https://admin.example.com", name: "admin-panel", platform: "vercel", status: "up" as const, responseTime: 62, checkedAt: now, statusCode: 200 },
  { url: "https://docs.example.com", name: "docs-site", platform: "vercel", status: "up" as const, responseTime: 41, checkedAt: now, statusCode: 200 },
  { url: "https://blog.example.com", name: "team-blog", platform: "netlify", status: "up" as const, responseTime: 120, checkedAt: now, statusCode: 200 },
  { url: "https://api.example.com", name: "api.example.com", platform: "cloudflare", status: "up" as const, responseTime: 380, checkedAt: now, statusCode: 200 },
  { url: "https://ws.example.com", name: "ws.example.com", platform: "cloudflare", status: "down" as const, responseTime: 5000, checkedAt: now },
  { url: "https://monitor.example.com", name: "monitor.example.com", platform: "cloudflare", status: "up" as const, responseTime: 520, checkedAt: now, statusCode: 200 },
  { url: "https://staging.example.com", name: "staging.example.com", platform: "cloudflare", status: "down" as const, responseTime: 10000, checkedAt: now },
  { url: "https://status-page.netlify.app", name: "status-page", platform: "netlify", status: "up" as const, responseTime: 95, checkedAt: now, statusCode: 200 },
];

// ─── Settings ────────────────────────────────────────────────

export const demoSettings = {
  platforms: [
    { id: "vercel", name: "Vercel", connected: true, tokenVar: "MY_VERCEL_TOKEN", guideUrl: "https://vercel.com/account/tokens", description: "Next.js & static site deployments" },
    { id: "netlify", name: "Netlify", connected: true, tokenVar: "NETLIFY_TOKEN", guideUrl: "https://app.netlify.com/user/applications#personal-access-tokens", description: "Static & JAMstack sites" },
    { id: "cloudflare", name: "Cloudflare", connected: true, tokenVar: "CF_API_TOKEN", guideUrl: "https://dash.cloudflare.com/profile/api-tokens", description: "DNS, R2, Workers" },
    { id: "hetzner", name: "Hetzner", connected: true, tokenVar: "HETZNER_API_TOKEN", guideUrl: "https://console.hetzner.cloud", description: "VPS / Docker containers" },
    { id: "github", name: "GitHub", connected: true, tokenVar: "GITHUB_TOKEN", guideUrl: "https://github.com/settings/tokens", description: "Repositories & CI/CD" },
    { id: "telegram", name: "Telegram", connected: false, tokenVar: "TELEGRAM_BOT_TOKEN", guideUrl: "https://t.me/BotFather", description: "Notifications & alerts" },
  ],
  config: { dashboardName: "Infra Dashboard (Demo)", deployDomain: "example.com", githubUsername: "demo-user", vercelTeamSlug: "demo-team" },
};
