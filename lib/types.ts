// Unified project type across all platforms
export interface UnifiedProject {
  id: string;
  name: string;
  platform: "vercel" | "cloudflare" | "hetzner";
  status: "healthy" | "degraded" | "down" | "unknown";
  url?: string;
  framework?: string;
  lastDeployAt?: string;
  domains: string[];
  gitRepo?: string;
}

// Vercel types
export interface VercelProject {
  id: string;
  name: string;
  framework: string | null;
  nodeVersion: string;
  createdAt: number;
  updatedAt: number;
  live: boolean;
  latestDeployment?: {
    id: string;
    url: string;
    createdAt: number;
    readyState: string;
    target: string | null;
    meta?: {
      githubCommitRepo?: string;
      githubCommitOrg?: string;
    };
  };
  link?: {
    type: string;
    repo: string;
    org: string;
  };
  domains: string[];
}

export interface VercelDeployment {
  uid: string;
  name: string;
  url: string;
  created: number;
  state: string;
  readyState: string;
  target: string | null;
  meta?: {
    githubCommitMessage?: string;
    githubCommitAuthorName?: string;
    githubCommitRepo?: string;
    githubCommitOrg?: string;
    githubCommitRef?: string;
  };
}

// Cloudflare types
export interface CFZone {
  id: string;
  name: string;
  status: string;
  paused: boolean;
  plan: { name: string };
  name_servers: string[];
}

export interface CFDNSRecord {
  id: string;
  type: string;
  name: string;
  content: string;
  proxied: boolean;
  ttl: number;
  comment?: string;
}

export interface CFR2Bucket {
  name: string;
  creation_date: string;
}

// Hetzner types
export interface HetznerServer {
  id: number;
  name: string;
  status: string;
  public_net: {
    ipv4: { ip: string };
    ipv6: { ip: string };
  };
  server_type: {
    name: string;
    cores: number;
    memory: number;
    disk: number;
    description: string;
  };
  datacenter: { name: string; description: string };
  image: { name: string; os_flavor: string; os_version: string } | null;
  created: string;
}

export interface HetznerMetrics {
  cpu: number;
  disk_read: number;
  disk_write: number;
  network_in: number;
  network_out: number;
}

// Health check types
export interface HealthCheck {
  url: string;
  name: string;
  platform: string;
  status: "up" | "down";
  responseTime: number;
  checkedAt: string;
  statusCode?: number;
}

// Alert types
export interface Alert {
  id: string;
  type: "down" | "deploy_fail" | "vps_unreachable" | "ssl_expiring" | "cost_anomaly";
  severity: "critical" | "warning" | "info";
  message: string;
  platform: string;
  projectName?: string;
  createdAt: string;
  resolved: boolean;
}

// Cost types
export interface PlatformCost {
  platform: string;
  month: string;
  amount: number;
  currency: string;
  details: Record<string, number>;
}

// GitHub types
export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  html_url: string;
  description: string | null;
  language: string | null;
  default_branch: string;
  pushed_at: string;
  updated_at: string;
  created_at: string;
  private: boolean;
  fork: boolean;
  topics: string[];
  size: number;
  stargazers_count: number;
  open_issues_count: number;
}

export interface GitHubWorkflowRun {
  id: number;
  name: string;
  status: string;
  conclusion: string | null;
  html_url: string;
  created_at: string;
  updated_at: string;
  head_branch: string;
  head_commit?: { message: string; author: { name: string } };
}

export interface GitHubCommit {
  sha: string;
  commit: {
    message: string;
    author: { name: string; date: string };
  };
  html_url: string;
}

// Audit types
export interface AuditFinding {
  id: string;
  category: "security" | "deployment" | "cicd" | "cleanup" | "performance";
  severity: "critical" | "warning" | "info";
  title: string;
  description: string;
  resource: { type: string; name: string; platform: string; url?: string };
  recommendation: string;
  autoFixable: boolean;
}

export interface AuditReport {
  generatedAt: string;
  score: number;
  findings: AuditFinding[];
  summary: { critical: number; warning: number; info: number; total: number };
}

export interface AuditContext {
  repos: GitHubRepo[];
  repoCICD: Record<string, { hasActions: boolean; hasDockerfile: boolean; hasVercelConfig: boolean; lastRun?: GitHubWorkflowRun }>;
  vercelProjects: VercelProject[];
  cfZones: CFZone[];
  dnsRecords: CFDNSRecord[];
  hetznerServers: HetznerServer[];
  healthResults: HealthCheck[];
}

// Code Map - unified view
export interface CodeProject {
  repo: GitHubRepo;
  platform: "vercel" | "hetzner" | "none";
  vercelProject?: VercelProject;
  domains: string[];
  cicd: {
    hasActions: boolean;
    lastRun?: GitHubWorkflowRun;
    hasDockerfile: boolean;
    hasVercelConfig: boolean;
  };
  lastCommit?: GitHubCommit;
}
