"use client";

import { useState } from "react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "./status-badge";
import { Badge } from "@/components/ui/badge";
import { MgmtLink } from "./mgmt-link";
import { LanguageDot, CICDBadge } from "./service-icon";
import {
  Triangle, Container, Hexagon, GitBranch, ExternalLink,
  Shield, Globe, ChevronDown, ChevronUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Project } from "@/lib/project-discovery";

// ─── Classification ──────────────────────────────────────────

export type ProjectTier = "production" | "active" | "inactive";

export function classifyProject(p: Project): ProjectTier {
  if (p.hasCustomDomain) return "production";
  if (p.hosting.platform === "docker-vps") return "production";
  if (p.repos.length > 0) return "active";
  if (p.lastActivity && daysSince(p.lastActivity) < 30) return "active";
  if (isRandomName(p.domain)) return "inactive";
  if (p.lastActivity && daysSince(p.lastActivity) > 90) return "inactive";
  return "active";
}

function isRandomName(domain: string): boolean {
  const name = domain.split(".")[0];
  return /[a-f0-9]{6,}/.test(name);
}

function daysSince(date: string): number {
  return Math.floor((Date.now() - new Date(date).getTime()) / (24 * 60 * 60 * 1000));
}

// ─── Platform Config ─────────────────────────────────────────

const platformConfig: Record<string, { icon: typeof Triangle; label: string; color: string }> = {
  vercel: { icon: Triangle, label: "Vercel", color: "text-black dark:text-white" },
  netlify: { icon: Hexagon, label: "Netlify", color: "text-teal-500" },
  "docker-vps": { icon: Container, label: "Docker", color: "text-blue-500" },
};

const tierConfig = {
  production: { label: "Production", borderColor: "border-r-green-500", bgColor: "bg-green-500/5" },
  active: { label: "Active", borderColor: "border-r-blue-500", bgColor: "" },
  inactive: { label: "Inactive", borderColor: "border-r-gray-300", bgColor: "bg-muted/30" },
};

// ─── Component ───────────────────────────────────────────────

interface Props {
  projects: Project[];
}

export function UnifiedTable({ projects }: Props) {
  const [showInactive, setShowInactive] = useState(false);

  // Classify and group
  const classified = projects.map((p) => ({ ...p, tier: classifyProject(p) }));
  const production = classified.filter((p) => p.tier === "production");
  const active = classified.filter((p) => p.tier === "active");
  const inactive = classified.filter((p) => p.tier === "inactive");

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="text-right w-[100px]">פלטפורמה</TableHead>
          <TableHead className="text-right">פרויקט</TableHead>
          <TableHead className="text-right w-[80px]">סטטוס</TableHead>
          <TableHead className="text-right">דומיין</TableHead>
          <TableHead className="text-right">Repo</TableHead>
          <TableHead className="text-right w-[70px]">CI/CD</TableHead>
          <TableHead className="text-right w-[40px]"></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {/* Production */}
        {production.length > 0 && (
          <>
            <SectionHeader label="Production" count={production.length} color="text-green-600" />
            {production.map((p) => <ProjectRow key={p.id} project={p} tier="production" />)}
          </>
        )}

        {/* Active */}
        {active.length > 0 && (
          <>
            <SectionHeader label="Active" count={active.length} color="text-blue-600" />
            {active.map((p) => <ProjectRow key={p.id} project={p} tier="active" />)}
          </>
        )}

        {/* Inactive */}
        {inactive.length > 0 && (
          <>
            <TableRow
              className="cursor-pointer hover:bg-muted/50"
              onClick={() => setShowInactive(!showInactive)}
            >
              <TableCell colSpan={7} className="py-2">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  {showInactive ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                  <span className="font-medium">Inactive</span>
                  <span>({inactive.length} sites)</span>
                  {!showInactive && (
                    <span className="text-[10px]">— לחץ להצגה</span>
                  )}
                </div>
              </TableCell>
            </TableRow>
            {showInactive && inactive.map((p) => <ProjectRow key={p.id} project={p} tier="inactive" />)}
          </>
        )}
      </TableBody>
    </Table>
  );
}

// ─── Section Header ──────────────────────────────────────────

function SectionHeader({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <TableRow className="hover:bg-transparent">
      <TableCell colSpan={7} className="py-1.5 border-b-0">
        <div className={cn("flex items-center gap-2 text-xs font-semibold", color)}>
          <span className={cn("w-2 h-2 rounded-full", color.replace("text-", "bg-"))} />
          {label}
          <span className="font-normal text-muted-foreground">({count})</span>
        </div>
      </TableCell>
    </TableRow>
  );
}

// ─── Project Row ─────────────────────────────────────────────

function ProjectRow({ project: p, tier }: { project: Project; tier: ProjectTier }) {
  const platform = platformConfig[p.hosting.platform] ?? platformConfig.vercel;
  const Icon = platform.icon;
  const tc = tierConfig[tier];

  return (
    <TableRow className={cn("border-r-2", tc.borderColor, tc.bgColor)}>
      {/* Platform */}
      <TableCell>
        <div className="flex items-center gap-1.5">
          <Icon className={cn("h-3.5 w-3.5", platform.color)} />
          <span className="text-xs">{platform.label}</span>
        </div>
      </TableCell>

      {/* Name */}
      <TableCell>
        <div className="flex items-center gap-1.5">
          <span className="font-medium text-sm">{p.name}</span>
          {p.cfAccessProtected && <Shield className="h-3 w-3 text-orange-500" />}
        </div>
      </TableCell>

      {/* Status */}
      <TableCell>
        <StatusBadge status={
          p.status === "up" || p.status === "protected" ? "healthy" :
          p.status === "down" ? "down" : "unknown"
        } />
      </TableCell>

      {/* Domain */}
      <TableCell>
        <a href={p.url} target="_blank" rel="noopener noreferrer"
          className="text-xs text-blue-500 hover:underline inline-flex items-center gap-1">
          {p.hasCustomDomain && <Globe className="h-3 w-3 text-green-500 shrink-0" />}
          <span className="truncate max-w-[180px]">{p.domain}</span>
          <ExternalLink className="h-3 w-3 shrink-0" />
        </a>
        {p.responseTime != null && (
          <span className={cn("block text-[10px]",
            p.responseTime > 500 ? "text-yellow-500" : "text-muted-foreground"
          )}>
            {p.responseTime}ms
          </span>
        )}
      </TableCell>

      {/* Repos */}
      <TableCell>
        {p.repos.length > 0 ? (
          <div className="flex flex-col gap-0.5">
            {p.repos.slice(0, 2).map((r) => (
              <a key={r.name} href={r.url} target="_blank" rel="noopener noreferrer"
                className="text-xs text-blue-500 hover:underline inline-flex items-center gap-1">
                <GitBranch className="h-3 w-3 shrink-0" />
                <span className="truncate max-w-[140px]">{r.name}</span>
                {r.language && <LanguageDot language={r.language} />}
              </a>
            ))}
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">-</span>
        )}
      </TableCell>

      {/* CI/CD */}
      <TableCell>
        {p.cicd.hasActions ? (
          <CICDBadge conclusion={p.cicd.lastRunConclusion} />
        ) : p.cicd.hasDockerfile ? (
          <Badge variant="outline" className="text-[10px] px-1">ידני</Badge>
        ) : (
          <span className="text-xs text-muted-foreground">-</span>
        )}
      </TableCell>

      {/* Link */}
      <TableCell>
        <MgmtLink href={p.url} tooltip="פתח" iconOnly />
      </TableCell>
    </TableRow>
  );
}
