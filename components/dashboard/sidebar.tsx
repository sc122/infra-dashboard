"use client";

import { Link, usePathname } from "@/i18n/navigation";
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
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { LanguageSwitcher } from "@/components/dashboard/language-switcher";

type NavItem = { href: string; labelKey: string; icon: React.ComponentType<{ className?: string }> };

const navSections: { sectionKey: string; items: NavItem[] }[] = [
  {
    sectionKey: "general",
    items: [
      { href: "/", labelKey: "overview", icon: LayoutDashboard },
      { href: "/code-map", labelKey: "codeMap", icon: Map },
    ],
  },
  {
    sectionKey: "platforms",
    items: [
      { href: "/github", labelKey: "github", icon: GitBranch },
      { href: "/vercel", labelKey: "vercel", icon: Triangle },
      { href: "/cloudflare", labelKey: "cloudflare", icon: Cloud },
      { href: "/vps", labelKey: "vps", icon: Server },
      { href: "/netlify", labelKey: "netlify", icon: Hexagon },
    ],
  },
  {
    sectionKey: "infrastructure",
    items: [
      { href: "/domains", labelKey: "domains", icon: Globe },
      { href: "/health", labelKey: "health", icon: Activity },
      { href: "/costs", labelKey: "costs", icon: DollarSign },
      { href: "/alerts", labelKey: "alerts", icon: Bell },
      { href: "/audit", labelKey: "audit", icon: ShieldCheck },
      { href: "/settings", labelKey: "settings", icon: Server },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const tSidebar = useTranslations("Sidebar");
  const tMeta = useTranslations("Metadata");

  return (
    <aside className="w-64 border-s bg-muted/30 flex flex-col h-screen sticky top-0">
      <div className="p-4 border-b">
        <h1 className="text-lg font-bold flex items-center gap-2">
          <Server className="h-5 w-5" />
          Infra Dashboard
        </h1>
        <p className="text-xs text-muted-foreground mt-1">{tMeta("tagline")}</p>
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
          <span className="flex-1 text-start">{tSidebar("quickSearch")}</span>
          <kbd className="text-[10px] bg-background px-1 py-0.5 rounded border">⌘K</kbd>
        </button>
      </div>

      <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
        {navSections.map((section, si) => (
          <div key={section.sectionKey}>
            {si > 0 && <Separator className="my-2" />}
            <p className="text-[10px] font-semibold text-muted-foreground px-3 py-1 uppercase tracking-wider">
              {tSidebar(`sections.${section.sectionKey}` as `sections.${"general" | "platforms" | "infrastructure"}`)}
            </p>
            {section.items.map((item) => {
              const isActive =
                pathname === item.href ||
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
                  {tSidebar(`items.${item.labelKey}` as never)}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
      <div className="p-4 border-t flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground truncate">
          {process.env.NEXT_PUBLIC_DASHBOARD_NAME || "Infra Dashboard"}
        </p>
        <LanguageSwitcher />
      </div>
    </aside>
  );
}
