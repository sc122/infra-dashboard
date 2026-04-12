"use client";

import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "./status-badge";
import { Badge } from "@/components/ui/badge";
import { MgmtLink } from "./mgmt-link";
import { LanguageDot, CICDBadge } from "./service-icon";
import { Triangle, Container, GitBranch, ExternalLink, Shield, Globe } from "lucide-react";
import type { Project } from "@/lib/project-discovery";

const platformConfig = {
  vercel: { icon: Triangle, label: "Vercel", color: "text-black dark:text-white" },
  "docker-vps": { icon: Container, label: "Docker", color: "text-blue-500" },
};

export function UnifiedTable({ projects }: { projects: Project[] }) {
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
          <TableHead className="text-right w-[60px]"></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {projects.map((p) => {
          const platform = platformConfig[p.hosting.platform];
          const Icon = platform.icon;
          return (
            <TableRow key={p.id}>
              {/* Platform */}
              <TableCell>
                <div className="flex items-center gap-1.5">
                  <Icon className={`h-4 w-4 ${platform.color}`} />
                  <span className="text-xs">{platform.label}</span>
                </div>
              </TableCell>

              {/* Project Name */}
              <TableCell>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{p.name}</span>
                  {p.cfAccessProtected && (
                    <Shield className="h-3 w-3 text-orange-500" />
                  )}
                </div>
              </TableCell>

              {/* Status */}
              <TableCell>
                <StatusBadge status={
                  p.status === "up" ? "healthy" :
                  p.status === "protected" ? "healthy" :
                  p.status === "down" ? "down" : "unknown"
                } />
              </TableCell>

              {/* Domain */}
              <TableCell>
                <a
                  href={p.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-500 hover:underline flex items-center gap-1"
                >
                  {p.hasCustomDomain ? (
                    <Globe className="h-3 w-3 text-green-500" />
                  ) : null}
                  {p.domain}
                  <ExternalLink className="h-3 w-3" />
                </a>
                {p.responseTime && (
                  <span className={`text-[10px] ${
                    p.responseTime > 500 ? "text-yellow-500" : "text-muted-foreground"
                  }`}>
                    {p.responseTime}ms
                  </span>
                )}
              </TableCell>

              {/* Repos */}
              <TableCell>
                {p.repos.length > 0 ? (
                  <div className="flex flex-col gap-0.5">
                    {p.repos.map((r) => (
                      <a
                        key={r.name}
                        href={r.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-500 hover:underline flex items-center gap-1"
                      >
                        <GitBranch className="h-3 w-3" />
                        {r.name}
                        {r.language && <LanguageDot language={r.language} />}
                      </a>
                    ))}
                  </div>
                ) : (
                  <span className="text-xs text-red-400">לא מזוהה</span>
                )}
              </TableCell>

              {/* CI/CD */}
              <TableCell>
                {p.cicd.hasActions ? (
                  <CICDBadge conclusion={p.cicd.lastRunConclusion} />
                ) : p.cicd.hasDockerfile ? (
                  <Badge variant="outline" className="text-[10px]">ידני</Badge>
                ) : (
                  <span className="text-xs text-muted-foreground">-</span>
                )}
              </TableCell>

              {/* Actions */}
              <TableCell>
                <MgmtLink href={p.url} tooltip="פתח אתר" iconOnly />
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
