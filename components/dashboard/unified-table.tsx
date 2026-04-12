"use client";

import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "./status-badge";
import { Badge } from "@/components/ui/badge";
import { Triangle, Cloud, Server, Container, ExternalLink, GitBranch } from "lucide-react";
import { MgmtLink } from "./mgmt-link";
import type { UnifiedProject } from "@/lib/types";

const platformIcons: Record<string, typeof Triangle> = {
  vercel: Triangle,
  cloudflare: Cloud,
  hetzner: Server,
  docker: Container,
};

export function UnifiedTable({ projects }: { projects: UnifiedProject[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="text-right">פלטפורמה</TableHead>
          <TableHead className="text-right">שם</TableHead>
          <TableHead className="text-right">סטטוס</TableHead>
          <TableHead className="text-right">Framework</TableHead>
          <TableHead className="text-right">דומיין</TableHead>
          <TableHead className="text-right">Repo</TableHead>
          <TableHead className="text-right"></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {projects.map((project) => {
          const Icon = platformIcons[project.platform];
          return (
            <TableRow key={project.id}>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4" />
                  <span className="capitalize">{project.platform}</span>
                </div>
              </TableCell>
              <TableCell className="font-medium">{project.name}</TableCell>
              <TableCell>
                <StatusBadge status={project.status} />
              </TableCell>
              <TableCell>
                {project.framework ? (
                  <Badge variant="secondary">{project.framework}</Badge>
                ) : (
                  <span className="text-muted-foreground">-</span>
                )}
              </TableCell>
              <TableCell>
                <div className="flex flex-col gap-1">
                  {project.domains.slice(0, 2).map((d) => (
                    <a
                      key={d}
                      href={`https://${d}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-500 hover:underline flex items-center gap-1"
                    >
                      {d}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  ))}
                  {project.domains.length > 2 && (
                    <span className="text-xs text-muted-foreground">
                      +{project.domains.length - 2} more
                    </span>
                  )}
                </div>
              </TableCell>
              <TableCell>
                {project.gitRepo ? (
                  <a
                    href={`https://github.com/${project.gitRepo}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-500 hover:underline flex items-center gap-1"
                  >
                    <GitBranch className="h-3 w-3" />
                    {project.gitRepo.split("/")[1]}
                  </a>
                ) : (
                  <span className="text-xs text-red-400">אין repo</span>
                )}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-1">
                  {project.platform === "vercel" && (
                    <Link href={`/vercel/${project.id}`} className="text-xs text-blue-500 hover:underline">
                      פרטים
                    </Link>
                  )}
                  {project.url && (
                    <MgmtLink href={project.url} tooltip="פתח אתר" iconOnly />
                  )}
                </div>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
