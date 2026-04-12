import { describe, it, expect } from "vitest";
import { allRules } from "@/lib/audit/rules";
import type { AuditContext } from "@/lib/types";

function makeCtx(overrides: Partial<AuditContext> = {}): AuditContext {
  return {
    repos: [],
    repoCICD: {},
    vercelProjects: [],
    netlifySites: [],
    cfZones: [],
    dnsRecords: [],
    hetznerServers: [],
    healthResults: [],
    ...overrides,
  };
}

describe("Audit Rules", () => {
  it("all rules have unique IDs", () => {
    const ids = allRules.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("all rules return arrays (even on empty context)", () => {
    const ctx = makeCtx();
    for (const rule of allRules) {
      const findings = rule.run(ctx);
      expect(Array.isArray(findings)).toBe(true);
    }
  });

  it("detects duplicate Vercel projects", () => {
    const ctx = makeCtx({
      vercelProjects: [
        { id: "1", name: "app-1", link: { type: "github", repo: "myrepo", org: "user" } },
        { id: "2", name: "app-2", link: { type: "github", repo: "myrepo", org: "user" } },
      ] as AuditContext["vercelProjects"],
    });
    const rule = allRules.find((r) => r.id === "duplicate-projects")!;
    const findings = rule.run(ctx);
    expect(findings.length).toBe(1);
    expect(findings[0].severity).toBe("warning");
  });

  it("detects Vercel project without repo", () => {
    const ctx = makeCtx({
      vercelProjects: [
        { id: "1", name: "manual-project" },
      ] as AuditContext["vercelProjects"],
    });
    const rule = allRules.find((r) => r.id === "no-repo-linked")!;
    const findings = rule.run(ctx);
    expect(findings.length).toBe(1);
  });

  it("detects public repos with deployments", () => {
    const ctx = makeCtx({
      repos: [
        { id: 1, name: "deployed-app", full_name: "user/deployed-app", html_url: "https://github.com/user/deployed-app", homepage: null, description: null, language: "TypeScript", default_branch: "main", pushed_at: "2026-04-01", updated_at: "2026-04-01", created_at: "2025-01-01", private: false, fork: false, topics: [], size: 100, stargazers_count: 0, open_issues_count: 0 },
      ],
      vercelProjects: [
        { id: "1", name: "deployed-app", link: { type: "github", repo: "deployed-app", org: "user" } },
      ] as AuditContext["vercelProjects"],
    });
    const rule = allRules.find((r) => r.id === "public-repos")!;
    const findings = rule.run(ctx);
    expect(findings.length).toBe(1);
    expect(findings[0].severity).toBe("critical");
  });

  it("detects stale repos", () => {
    const ctx = makeCtx({
      repos: [
        { id: 1, name: "old-thing", full_name: "user/old-thing", html_url: "", homepage: null, description: "", language: "JS", default_branch: "main", pushed_at: "2024-01-01", updated_at: "2024-01-01", created_at: "2023-01-01", private: true, fork: false, topics: [], size: 10, stargazers_count: 0, open_issues_count: 0 },
      ],
    });
    const rule = allRules.find((r) => r.id === "stale-repos")!;
    const findings = rule.run(ctx);
    expect(findings.length).toBe(1);
    expect(findings[0].category).toBe("cleanup");
  });

  it("no false positives on empty context", () => {
    const ctx = makeCtx();
    let total = 0;
    for (const rule of allRules) {
      total += rule.run(ctx).length;
    }
    expect(total).toBe(0);
  });
});
