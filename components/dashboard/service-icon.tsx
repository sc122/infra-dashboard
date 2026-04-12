"use client";

import Image from "next/image";

const LANGUAGE_COLORS: Record<string, string> = {
  TypeScript: "#3178c6",
  JavaScript: "#f1e05a",
  Python: "#3572A5",
  HTML: "#e34c26",
  CSS: "#563d7c",
  Shell: "#89e051",
  Dockerfile: "#384d54",
  Vue: "#41b883",
  Rust: "#dea584",
};

export function LanguageDot({ language }: { language: string | null }) {
  if (!language) return null;
  const color = LANGUAGE_COLORS[language] ?? "#6e7681";
  return (
    <span className="inline-flex items-center gap-1 text-xs">
      <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: color }} />
      {language}
    </span>
  );
}

export function Favicon({ domain, size = 16 }: { domain: string; size?: number }) {
  return (
    <Image
      src={`https://www.google.com/s2/favicons?domain=${domain}&sz=${size * 2}`}
      alt=""
      width={size}
      height={size}
      className="rounded-sm inline-block"
      unoptimized
    />
  );
}

export function CICDBadge({ conclusion }: { conclusion: string | null | undefined }) {
  if (!conclusion) return <span className="text-xs text-muted-foreground">-</span>;
  const config: Record<string, { emoji: string; label: string; className: string }> = {
    success: { emoji: "✅", label: "Pass", className: "text-green-600" },
    failure: { emoji: "❌", label: "Fail", className: "text-red-600" },
    cancelled: { emoji: "⏹", label: "Cancelled", className: "text-gray-500" },
    skipped: { emoji: "⏭", label: "Skipped", className: "text-gray-400" },
    in_progress: { emoji: "🔄", label: "Running", className: "text-yellow-500" },
  };
  const c = config[conclusion] ?? { emoji: "❓", label: conclusion, className: "text-gray-500" };
  return (
    <span className={`text-xs font-medium ${c.className}`}>
      {c.emoji} {c.label}
    </span>
  );
}
