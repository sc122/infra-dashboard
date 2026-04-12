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
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "סקירה כללית", icon: LayoutDashboard },
  { href: "/vercel", label: "Vercel", icon: Triangle },
  { href: "/cloudflare", label: "Cloudflare", icon: Cloud },
  { href: "/vps", label: "VPS - Hetzner", icon: Server },
  { href: "/domains", label: "מפת דומיינים", icon: Globe },
  { href: "/health", label: "Health Monitor", icon: Activity },
  { href: "/costs", label: "עלויות", icon: DollarSign },
  { href: "/alerts", label: "התראות", icon: Bell },
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
      <nav className="flex-1 p-2 space-y-1">
        {navItems.map((item) => {
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
      </nav>
      <div className="p-4 border-t text-xs text-muted-foreground">
        <p>sc122&apos;s projects</p>
      </div>
    </aside>
  );
}
