"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Triangle,
  Cloud,
  Server,
  Globe,
  DollarSign,
  Bell,
  Activity,
  GitBranch,
  Map,
  Search,
  ShieldCheck,
  Hexagon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";

const navSections = [
  {
    label: "כללי",
    items: [
      { href: "/", label: "סקירה כללית", icon: LayoutDashboard },
      { href: "/code-map", label: "Code → Deploy", icon: Map },
    ],
  },
  {
    label: "פלטפורמות",
    items: [
      { href: "/github", label: "GitHub", icon: GitBranch },
      { href: "/vercel", label: "Vercel", icon: Triangle },
      { href: "/cloudflare", label: "Cloudflare", icon: Cloud },
      { href: "/vps", label: "VPS - Hetzner", icon: Server },
      { href: "/netlify", label: "Netlify", icon: Hexagon },
    ],
  },
  {
    label: "תשתית",
    items: [
      { href: "/domains", label: "מפת דומיינים", icon: Globe },
      { href: "/health", label: "Health Monitor", icon: Activity },
      { href: "/costs", label: "עלויות", icon: DollarSign },
      { href: "/alerts", label: "התראות", icon: Bell },
      { href: "/audit", label: "ביקורת תשתיות", icon: ShieldCheck },
      { href: "/settings", label: "הגדרות", icon: Server },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 border-l bg-muted/30 flex flex-col h-screen sticky top-0">
      <div className="p-4 border-b">
        <h1 className="text-lg font-bold flex items-center gap-2">
          <Server className="h-5 w-5" />
          Infra Dashboard
        </h1>
        <p className="text-xs text-muted-foreground mt-1">מרכז שליטה בתשתיות</p>
      </div>

      {/* Quick search hint */}
      <div className="px-3 pt-3 pb-1">
        <button
          className="w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-xs text-muted-foreground bg-muted/50 hover:bg-muted transition-colors"
          onClick={() => {
            window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }));
          }}
        >
          <Search className="h-3 w-3" />
          <span className="flex-1 text-right">חיפוש מהיר...</span>
          <kbd className="text-[10px] bg-background px-1 py-0.5 rounded border">⌘K</kbd>
        </button>
      </div>

      <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
        {navSections.map((section, si) => (
          <div key={section.label}>
            {si > 0 && <Separator className="my-2" />}
            <p className="text-[10px] font-semibold text-muted-foreground px-3 py-1 uppercase tracking-wider">
              {section.label}
            </p>
            {section.items.map((item) => {
              const isActive = pathname === item.href ||
                (item.href !== "/" && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
      <div className="p-4 border-t text-xs text-muted-foreground">
        <p>{process.env.NEXT_PUBLIC_DASHBOARD_NAME || "Infra Dashboard"}</p>
      </div>
    </aside>
  );
}
