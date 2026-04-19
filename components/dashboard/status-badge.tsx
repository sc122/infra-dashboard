"use client";

import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Status = "healthy" | "up" | "READY" | "degraded" | "down" | "unknown" | "error" | string;

const statusConfig: Record<string, { labelKey?: string; literal?: string; className: string }> = {
  healthy: { labelKey: "healthy", className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" },
  up: { labelKey: "up", className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" },
  READY: { literal: "READY", className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" },
  running: { literal: "Running", className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" },
  active: { literal: "Active", className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" },
  degraded: { labelKey: "degraded", className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200" },
  down: { labelKey: "down", className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200" },
  error: { labelKey: "error", className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200" },
  ERROR: { literal: "ERROR", className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200" },
};

export function StatusBadge({ status }: { status: Status }) {
  const t = useTranslations("StatusBadge");
  const config = statusConfig[status];
  const label = config?.labelKey
    ? t(config.labelKey as "healthy" | "up" | "degraded" | "down" | "error")
    : config?.literal ?? status;
  const className = config?.className ?? "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200";

  return (
    <Badge variant="outline" className={cn("font-medium", className)}>
      <span className={cn(
        "inline-block w-2 h-2 rounded-full me-1.5",
        status === "down" || status === "error" || status === "ERROR" ? "bg-red-500" :
        status === "degraded" ? "bg-yellow-500" : "bg-green-500"
      )} />
      {label}
    </Badge>
  );
}
