"use client";

import { Search, Triangle, Hexagon, Container, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Filters {
  platform: string | null;
  status: string | null;
  tier: string | null;
  search: string;
}

const platformChips = [
  { value: "vercel", label: "Vercel", icon: Triangle, color: "hover:bg-black/5 data-[active=true]:bg-black data-[active=true]:text-white" },
  { value: "netlify", label: "Netlify", icon: Hexagon, color: "hover:bg-teal-50 data-[active=true]:bg-teal-500 data-[active=true]:text-white" },
  { value: "docker-vps", label: "Docker", icon: Container, color: "hover:bg-blue-50 data-[active=true]:bg-blue-500 data-[active=true]:text-white" },
];

const statusChips = [
  { value: "up", label: "UP", color: "hover:bg-green-50 data-[active=true]:bg-green-500 data-[active=true]:text-white" },
  { value: "down", label: "DOWN", color: "hover:bg-red-50 data-[active=true]:bg-red-500 data-[active=true]:text-white" },
];

const tierChips = [
  { value: "production", label: "Production", color: "hover:bg-green-50 data-[active=true]:bg-green-600 data-[active=true]:text-white" },
  { value: "active", label: "Active", color: "hover:bg-blue-50 data-[active=true]:bg-blue-500 data-[active=true]:text-white" },
  { value: "inactive", label: "Inactive", color: "hover:bg-gray-100 data-[active=true]:bg-gray-400 data-[active=true]:text-white" },
];

interface FilterBarProps {
  filters: Filters;
  onChange: (filters: Filters) => void;
  counts: { total: number; production: number; active: number; inactive: number; platforms: Record<string, number> };
}

export function FilterBar({ filters, onChange, counts }: FilterBarProps) {
  const toggle = (key: keyof Filters, value: string) => {
    onChange({ ...filters, [key]: filters[key] === value ? null : value });
  };

  const hasAnyFilter = filters.platform || filters.status || filters.tier || filters.search;

  return (
    <div className="flex flex-wrap items-center gap-2 pb-3">
      {/* Search */}
      <div className="relative">
        <Search className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <input
          type="text"
          placeholder="חיפוש..."
          value={filters.search}
          onChange={(e) => onChange({ ...filters, search: e.target.value })}
          className="h-8 w-40 rounded-md border bg-transparent pr-8 pl-2 text-xs outline-none focus:ring-1 focus:ring-primary"
        />
      </div>

      <div className="w-px h-6 bg-border" />

      {/* Platform */}
      {platformChips.map((chip) => {
        const Icon = chip.icon;
        const count = counts.platforms[chip.value] ?? 0;
        return (
          <button
            key={chip.value}
            data-active={filters.platform === chip.value}
            onClick={() => toggle("platform", chip.value)}
            className={cn(
              "inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full text-xs font-medium border transition-all",
              chip.color,
            )}
          >
            <Icon className="h-3 w-3" />
            {chip.label}
            <span className="opacity-60">{count}</span>
          </button>
        );
      })}

      <div className="w-px h-6 bg-border" />

      {/* Status */}
      {statusChips.map((chip) => (
        <button
          key={chip.value}
          data-active={filters.status === chip.value}
          onClick={() => toggle("status", chip.value)}
          className={cn(
            "inline-flex items-center gap-1 h-7 px-2.5 rounded-full text-xs font-medium border transition-all",
            chip.color,
          )}
        >
          <span className={cn("w-1.5 h-1.5 rounded-full", chip.value === "up" ? "bg-green-500" : "bg-red-500")} />
          {chip.label}
        </button>
      ))}

      <div className="w-px h-6 bg-border" />

      {/* Tier */}
      {tierChips.map((chip) => (
        <button
          key={chip.value}
          data-active={filters.tier === chip.value}
          onClick={() => toggle("tier", chip.value)}
          className={cn(
            "inline-flex items-center gap-1 h-7 px-2.5 rounded-full text-xs font-medium border transition-all",
            chip.color,
          )}
        >
          {chip.label}
          <span className="opacity-60">
            {chip.value === "production" ? counts.production : chip.value === "active" ? counts.active : counts.inactive}
          </span>
        </button>
      ))}

      {/* Clear */}
      {hasAnyFilter && (
        <button
          onClick={() => onChange({ platform: null, status: null, tier: null, search: "" })}
          className="inline-flex items-center gap-1 h-7 px-2 rounded-full text-xs text-muted-foreground hover:text-foreground border hover:bg-muted transition-all"
        >
          <X className="h-3 w-3" />
          נקה
        </button>
      )}
    </div>
  );
}
