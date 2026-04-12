"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  LayoutDashboard, Triangle, Cloud, Server, Globe, Activity,
  DollarSign, Bell, GitBranch, Map, Search,
} from "lucide-react";

interface SearchItem {
  id: string;
  label: string;
  description?: string;
  icon: typeof LayoutDashboard;
  href?: string;
  action?: () => void;
  group: string;
}

const PAGES: SearchItem[] = [
  { id: "home", label: "סקירה כללית", icon: LayoutDashboard, href: "/", group: "דפים" },
  { id: "vercel", label: "Vercel Projects", icon: Triangle, href: "/vercel", group: "דפים" },
  { id: "cloudflare", label: "Cloudflare", icon: Cloud, href: "/cloudflare", group: "דפים" },
  { id: "vps", label: "VPS - Hetzner", icon: Server, href: "/vps", group: "דפים" },
  { id: "netlify", label: "Netlify Sites", icon: LayoutDashboard, href: "/netlify", group: "דפים" },
  { id: "domains", label: "מפת דומיינים", icon: Globe, href: "/domains", group: "דפים" },
  { id: "github", label: "GitHub Repositories", icon: GitBranch, href: "/github", group: "דפים" },
  { id: "codemap", label: "Code → Deploy Map", icon: Map, href: "/code-map", group: "דפים" },
  { id: "health", label: "Health Monitor", icon: Activity, href: "/health", group: "דפים" },
  { id: "costs", label: "עלויות", icon: DollarSign, href: "/costs", group: "דפים" },
  { id: "alerts", label: "התראות", icon: Bell, href: "/alerts", group: "דפים" },
];

const QUICK_LINKS: SearchItem[] = [
  { id: "ql-vercel", label: "Vercel Dashboard", icon: Triangle, group: "קישורים מהירים",
    action: () => window.open("https://vercel.com/sc122s-projects", "_blank") },
  { id: "ql-cf", label: "Cloudflare Dashboard", icon: Cloud, group: "קישורים מהירים",
    action: () => window.open("https://dash.cloudflare.com", "_blank") },
  { id: "ql-netlify", label: "Netlify Dashboard", icon: LayoutDashboard, group: "קישורים מהירים",
    action: () => window.open("https://app.netlify.com", "_blank") },
  { id: "ql-hetzner", label: "Hetzner Console", icon: Server, group: "קישורים מהירים",
    action: () => window.open("https://console.hetzner.cloud", "_blank") },
  { id: "ql-github", label: "GitHub Profile", icon: GitBranch, group: "קישורים מהירים",
    action: () => window.open("https://github.com/sc122", "_blank") },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const router = useRouter();

  const allItems = [...PAGES, ...QUICK_LINKS];
  const filtered = query
    ? allItems.filter(
        (item) =>
          item.label.toLowerCase().includes(query.toLowerCase()) ||
          item.description?.toLowerCase().includes(query.toLowerCase()) ||
          item.group.toLowerCase().includes(query.toLowerCase())
      )
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
        <DialogTitle className="sr-only">חיפוש מהיר</DialogTitle>
        {/* Search input */}
        <div className="flex items-center gap-2 border-b px-3 py-2">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <input
            className="flex-1 bg-transparent outline-none text-sm placeholder:text-muted-foreground"
            placeholder="חיפוש... (Ctrl+K)"
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
                {group}
              </p>
              {items.map((item) => {
                const globalIdx = flatResults.indexOf(item);
                const isSelected = globalIdx === selectedIndex;
                return (
                  <button
                    key={item.id}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors text-right ${
                      isSelected ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted/50"
                    }`}
                    onClick={() => handleSelect(item)}
                    onMouseEnter={() => setSelectedIndex(globalIdx)}
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    <span className="flex-1">{item.label}</span>
                    {item.description && (
                      <span className="text-xs text-muted-foreground">{item.description}</span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
          {filtered.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-6">לא נמצאו תוצאות</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
