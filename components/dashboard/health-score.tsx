"use client";

import { cn } from "@/lib/utils";

export function HealthScore({ score, size = 120 }: { score: number; size?: number }) {
  const radius = (size - 12) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;
  const color =
    score >= 80 ? "text-green-500" : score >= 50 ? "text-yellow-500" : "text-red-500";
  const bgColor =
    score >= 80 ? "stroke-green-100" : score >= 50 ? "stroke-yellow-100" : "stroke-red-100";
  const label = score >= 80 ? "תקין" : score >= 50 ? "דורש תשומת לב" : "קריטי";

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            strokeWidth={10}
            className={bgColor}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            strokeWidth={10}
            strokeLinecap="round"
            className={cn("transition-all duration-1000", color)}
            style={{
              stroke: "currentColor",
              strokeDasharray: circumference,
              strokeDashoffset: circumference - progress,
            }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={cn("text-3xl font-bold", color)}>{score}</span>
          <span className="text-[10px] text-muted-foreground">/100</span>
        </div>
      </div>
      <p className={cn("text-sm font-medium", color)}>{label}</p>
    </div>
  );
}
