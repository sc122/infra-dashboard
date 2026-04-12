import { describe, it, expect } from "vitest";
import { discoverAllProjects, type DiscoveryInput } from "@/lib/project-discovery";
import vercelProjects from "@/__mocks__/fixtures/vercel-projects.json";
import githubRepos from "@/__mocks__/fixtures/github-repos.json";

function makeInput(overrides: Partial<DiscoveryInput> = {}): DiscoveryInput {
  return {
    vercelProjects: vercelProjects as DiscoveryInput["vercelProjects"],
    netlifySites: [],
    dnsRecords: [],
    hetznerServers: [],
    repos: githubRepos as DiscoveryInput["repos"],
    repoCICD: {},
    healthResults: [],
    ...overrides,
  };
}

describe("discoverAllProjects", () => {
  it("discovers Vercel projects", () => {
    const projects = discoverAllProjects(makeInput());
    const vercel = projects.filter((p) => p.hosting.platform === "vercel");
    expect(vercel.length).toBe(2);
    expect(vercel.find((p) => p.name.toLowerCase().includes("my app"))).toBeTruthy();
  });

  it("uses custom domain when available", () => {
    const projects = discoverAllProjects(makeInput());
    const landing = projects.find((p) => p.hosting.vercelProjectName === "landing-page");
    expect(landing?.domain).toBe("example.com");
    expect(landing?.hasCustomDomain).toBe(true);
  });

  it("links repos via Vercel link.repo", () => {
    const projects = discoverAllProjects(makeInput());
    const app = projects.find((p) => p.hosting.vercelProjectName === "my-app");
    expect(app?.repos.length).toBe(1);
    expect(app?.repos[0].name).toBe("my-app");
  });

  it("discovers Docker VPS projects from DNS records", () => {
    const projects = discoverAllProjects(makeInput({
      dnsRecords: [
        { id: "1", type: "A", name: "api.example.com", content: "1.2.3.4", proxied: true, ttl: 1 },
      ],
      hetznerServers: [
        { id: 1, name: "vps-1", status: "running", public_net: { ipv4: { ip: "1.2.3.4" }, ipv6: { ip: "" } }, server_type: { name: "cx23", cores: 2, memory: 4, disk: 40, description: "CX23" }, datacenter: { name: "fsn1", description: "Falkenstein" }, image: null, created: "2025-01-01" },
      ] as DiscoveryInput["hetznerServers"],
    }));
    const docker = projects.filter((p) => p.hosting.platform === "docker-vps");
    expect(docker.length).toBe(1);
    expect(docker[0].domain).toBe("api.example.com");
  });

  it("matches repos via homepage field", () => {
    const projects = discoverAllProjects(makeInput({
      vercelProjects: [], // No Vercel projects — so VPS can claim the domain
      dnsRecords: [
        { id: "1", type: "A", name: "app.example.com", content: "1.2.3.4", proxied: true, ttl: 1 },
      ],
      hetznerServers: [
        { id: 1, name: "vps-1", status: "running", public_net: { ipv4: { ip: "1.2.3.4" }, ipv6: { ip: "" } }, server_type: { name: "cx23", cores: 2, memory: 4, disk: 40, description: "CX23" }, datacenter: { name: "fsn1", description: "Falkenstein" }, image: null, created: "2025-01-01" },
      ] as DiscoveryInput["hetznerServers"],
    }));
    // "my-app" repo has homepage "https://app.example.com" — should match via homepage
    const docker = projects.find((p) => p.hosting.platform === "docker-vps");
    expect(docker).toBeTruthy();
    expect(docker?.repos.length).toBeGreaterThan(0);
    expect(docker?.repos[0].name).toBe("my-app");
  });

  it("discovers Netlify sites", () => {
    const projects = discoverAllProjects(makeInput({
      netlifySites: [{
        id: "site1", name: "my-netlify-site", url: "https://my-netlify-site.netlify.app",
        ssl_url: "https://my-netlify-site.netlify.app", custom_domain: null,
        default_domain: "my-netlify-site.netlify.app", state: "ready",
        created_at: "2025-01-01", updated_at: "2025-01-01",
        published_deploy: { id: "d1", state: "ready", created_at: "2025-01-01", published_at: "2025-01-01" },
      }],
    }));
    const netlify = projects.filter((p) => p.hosting.platform === "netlify");
    expect(netlify.length).toBe(1);
  });
});
