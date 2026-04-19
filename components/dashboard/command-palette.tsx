"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  LayoutDashboard, Triangle, Cloud, Server, Globe, Activity,
  DollarSign, Bell, GitBranch, Map, Search, Hexagon,
} from "lucide-react";

type GroupKey = "navigation" | "platforms" | "actions";

interface SearchItem {
  id: string;
  /** Translation key under `Sidebar.items` (preferred) — falls back to raw `label` if missing. */
  itemKey?: string;
  label?: string;
  description?: string;
  icon: typeof LayoutDashboard;
  href?: string;
  action?: () => void;
  group: GroupKey;
}

const PAGES: SearchItem[] = [
  { id: "home", itemKey: "overview", icon: LayoutDashboard, href: "/", group: "navigation" },
  { id: "vercel", itemKey: "vercel", icon: Triangle, href: "/vercel", group: "navigation" },
  { id: "cloudflare", itemKey: "cloudflare", icon: Cloud, href: "/cloudflare", group: "navigation" },
  { id: "vps", itemKey: "vps", icon: Server, href: "/vps", group: "navigation" },
  { id: "netlify", itemKey: "netlify", icon: Hexagon, href: "/netlify", group: "navigation" },
  { id: "domains", itemKey: "domains", icon: Globe, href: "/domains", group: "navigation" },
  { id: "github", itemKey: "github", icon: GitBranch, href: "/github", group: "navigation" },
  { id: "codemap", itemKey: "codeMap", icon: Map, href: "/code-map", group: "navigation" },
  { id: "health", itemKey: "health", icon: Activity, href: "/health", group: "navigation" },
  { id: "costs", itemKey: "costs", icon: DollarSign, href: "/costs", group: "navigation" },
  { id: "alerts", itemKey: "alerts", icon: Bell, href: "/alerts", group: "navigation" },
];

const QUICK_LINKS: SearchItem[] = [
  { id: "ql-vercel", label: "Vercel Dashboard", icon: Triangle, group: "platforms",
    action: () => { const s = process.env.NEXT_PUBLIC_VERCEL_TEAM_SLUG; if (s) window.open(`https://vercel.com/${s}`, "_blank"); else window.open("https://vercel.com/dashboard", "_blank"); } },
  { id: "ql-cf", label: "Cloudflare Dashboard", icon: Cloud, group: "platforms",
    action: () => window.open("https://dash.cloudflare.com", "_blank") },
  { id: "ql-netlify", label: "Netlify Dashboard", icon: Hexagon, group: "platforms",
    action: () => window.open("https://app.netlify.com", "_blank") },
  { id: "ql-hetzner", label: "Hetzner Console", icon: Server, group: "platforms",
    action: () => window.open("https://console.hetzner.cloud", "_blank") },
  { id: "ql-github", label: "GitHub Profile", icon: GitBranch, group: "platforms",
    action: () => { const u = process.env.NEXT_PUBLIC_GITHUB_USERNAME; window.open(u ? `https://github.com/${u}` : "https://github.com", "_blank"); } },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const router = useRouter();
  const t = useTranslations("CommandPalette");
  const tSidebar = useTranslations("Sidebar.items");

  function labelFor(item: SearchItem): string {
    if (item.itemKey) {
      try {
        return tSidebar(item.itemKey as never);
      } catch {
        // fall through
      }
    }
    return item.label ?? item.id;
  }

  const allItems = [...PAGES, ...QUICK_LINKS];
  const q = query.toLowerCase();
  const filtered = query
    ? allItems.filter((item) => {
        const label = labelFor(item).toLowerCase();
        return (
          label.includes(q) ||
          item.description?.toLowerCase().includes(q) ||
          item.group.includes(q)
        );
      })
    : allItems;

  // Group results
  const grouped: Record<string, SearchItem[]> = {};
  for (const item of filtered) {
    if (!grouped[item.group]) grouped[item.group] = [];
    grouped[item.group].push(item);
  }

  const flatResults = filtered;

  const handleSelect = useCallback(
    (item: SearchItem) => {
      setOpen(false);
      setQuery("");
      if (item.href) router.push(item.href);
      else if (item.action) item.action();
    },
    [router]
  );

  // Keyboard shortcut
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((o) => !o);
        setQuery("");
        setSelectedIndex(0);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // Arrow key navigation
  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, flatResults.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter" && flatResults[selectedIndex]) {
        e.preventDefault();
        handleSelect(flatResults[selectedIndex]);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, selectedIndex, flatResults, handleSelect]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[500px] p-0 gap-0 overflow-hidden">
        <DialogTitle className="sr-only">{t("placeholder")}</DialogTitle>
        {/* Search input */}
        <div className="flex items-center gap-2 border-b px-3 py-2">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <input
            className="flex-1 bg-transparent outline-none text-sm placeholder:text-muted-foreground"
            placeholder={t("placeholder")}
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSelectedIndex(0); }}
            autoFocus
          />
          <kbd className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground">ESC</kbd>
        </div>

        {/* Results */}
        <div className="max-h-[300px] overflow-y-auto p-1">
          {Object.entries(grouped).map(([group, items]) => (
            <div key={group}>
              <p className="text-[10px] font-semibold text-muted-foreground px-2 py-1 uppercase">
                {t(`groups.${group}` as `groups.${GroupKey}`)}
              </p>
              {items.map((item) => {
                const globalIdx = flatResults.indexOf(item);
                const isSelected = globalIdx === selectedIndex;
                return (
                  <button
                    key={item.id}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors text-start ${
                      isSelected ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted/50"
                    }`}
                    onClick={() => handleSelect(item)}
                    onMouseEnter={() => setSelectedIndex(globalIdx)}
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    <span className="flex-1">{labelFor(item)}</span>
                    {item.description && (
                      <span className="text-xs text-muted-foreground">{item.description}</span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
          {filtered.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-6">{t("empty")}</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
