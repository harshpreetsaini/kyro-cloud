"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { APP_NAME } from "@/lib/config/branding";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: "◧" },
  { href: "/desktop", label: "Desktop", icon: "▣" },
  { href: "/games", label: "Games", icon: "▶" },
  { href: "/files", label: "Files", icon: "🗀" },
  { href: "/applications", label: "Applications", icon: "▤" },
  { href: "/terminal", label: "Terminal", icon: "›_" },
  { href: "/performance", label: "Performance", icon: "◔" },
  { href: "/diagnostics", label: "Diagnostics", icon: "✚" },
  { href: "/settings", label: "Settings", icon: "⚙" },
];

export function Sidebar() {
  const path = usePathname();
  return (
    <aside className="w-16 lg:w-56 shrink-0 bg-surface border-r border-white/5 flex flex-col">
      <div className="h-16 flex items-center gap-2 px-4 border-b border-white/5">
        <div className="w-8 h-8 rounded-lg bg-accent glow-accent flex items-center justify-center font-bold">
          L
        </div>
        <span className="hidden lg:block font-semibold tracking-tight">{APP_NAME}</span>
      </div>
      <nav className="flex-1 py-3 flex flex-col gap-1 px-2">
        {NAV.map((n) => {
          const active = path === n.href || path.startsWith(n.href + "/");
          return (
            <Link
              key={n.href}
              href={n.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition ${
                active ? "bg-accent/15 text-accent" : "text-muted hover:text-text hover:bg-secondary"
              }`}
            >
              <span className="w-5 text-center">{n.icon}</span>
              <span className="hidden lg:block">{n.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
