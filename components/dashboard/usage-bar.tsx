"use client";

import { cn } from "@/lib/utils";

interface UsageBarProps {
  label: string;
  used: number;
  limit: number;
  unit: string;
  formatUsed?: (n: number) => string;
  formatLimit?: (n: number) => string;
}

export function UsageBar({ label, used, limit, unit, formatUsed, formatLimit }: UsageBarProps) {
  const percentage = limit > 0 ? Math.min((used / limit) * 100, 100) : 0;
  const color =
    percentage >= 80 ? "bg-red-500" : percentage >= 50 ? "bg-yellow-500" : "bg-green-500";
  const textColor =
    percentage >= 80 ? "text-red-600" : percentage >= 50 ? "text-yellow-600" : "text-green-600";

  const fmtUsed = formatUsed ? formatUsed(used) : `${used.toLocaleString()}`;
  const fmtLimit = formatLimit ? formatLimit(limit) : `${limit.toLocaleString()}`;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className={cn("font-mono text-xs", textColor)}>
          {fmtUsed} / {fmtLimit} {unit}
          <span className="ms-2 text-muted-foreground">({percentage.toFixed(1)}%)</span>
        </span>
      </div>
      <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all duration-500", color)}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
