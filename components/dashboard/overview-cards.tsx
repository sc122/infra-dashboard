"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Triangle, Cloud, Server, Container, Activity } from "lucide-react";
import { dockerProjects } from "@/lib/docker-projects";

interface PlatformSummary {
  vercelProjects: number;
  cloudflareZones: number;
  cloudflareBuckets: number;
  hetznerServers: number;
  healthUp: number;
  healthDown: number;
  healthTotal: number;
}

export function OverviewCards({ data }: { data: PlatformSummary }) {
  const cards = [
    {
      title: "Vercel",
      icon: Triangle,
      value: `${data.vercelProjects} פרויקטים`,
      description: "Next.js & Static sites",
      color: "text-black dark:text-white",
    },
    {
      title: "Docker / VPS",
      icon: Container,
      value: `${dockerProjects.length} containers`,
      description: `Hetzner (${data.hetznerServers} servers)`,
      color: "text-blue-500",
    },
    {
      title: "Cloudflare",
      icon: Cloud,
      value: `${data.cloudflareZones} domains, ${data.cloudflareBuckets} R2`,
      description: "DNS, R2, Workers",
      color: "text-orange-500",
    },
    {
      title: "Health",
      icon: Activity,
      value: `${data.healthUp}/${data.healthTotal} up`,
      description: data.healthDown > 0 ? `${data.healthDown} services down!` : "All services healthy",
      color: data.healthDown > 0 ? "text-red-500" : "text-green-500",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <Card key={card.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
            <card.icon className={`h-4 w-4 ${card.color}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{card.value}</div>
            <p className="text-xs text-muted-foreground">{card.description}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
