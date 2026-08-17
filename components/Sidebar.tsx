"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSyncExternalStore, useEffect } from "react";
import { APP_NAME } from "@/lib/config/branding";
import { sidebarStore } from "@/lib/ui/sidebar";

const GROUPS = [
  {
    label: "Home",
    items: [{ href: "/dashboard", label: "Dashboard", icon: "◧" }],
  },
  {
    label: "Cloud PC",
    items: [
      { href: "/desktop", label: "Desktop", icon: "▣" },
      { href: "/games", label: "Games", icon: "▶" },
      { href: "/applications", label: "Applications", icon: "▤" },
      { href: "/files", label: "Files", icon: "🗀" },
    ],
  },
  {
    label: "Tools",
    items: [
      { href: "/terminal", label: "Terminal", icon: "›_" },
      { href: "/performance", label: "Performance", icon: "◔" },
      { href: "/diagnostics", label: "Diagnostics", icon: "✚" },
    ],
  },
  {
    label: "System",
    items: [{ href: "/settings", label: "Settings", icon: "⚙" }],
  },
];

export function Sidebar() {
  const path = usePathname();
  const open = useSyncExternalStore(sidebarStore.subscribe, sidebarStore.getSnapshot, sidebarStore.getSnapshot);

  useEffect(() => {
    sidebarStore.set(false);
  }, [path]);

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 bg-black/60 z-30 lg:hidden animate-fade-in"
          onClick={() => sidebarStore.set(false)}
          aria-hidden
        />
      )}
      <aside
        className={`fixed lg:static z-40 inset-y-0 left-0 w-60 bg-surface border-r border-white/5 flex flex-col transition-transform lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="h-16 flex items-center gap-2 px-5 border-b border-white/5 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-accent glow-accent flex items-center justify-center font-bold">L</div>
          <span className="font-semibold tracking-tight">{APP_NAME}</span>
        </div>
        <nav className="flex-1 py-4 flex flex-col gap-5 overflow-y-auto px-3">
          {GROUPS.map((g) => (
            <div key={g.label} className="flex flex-col gap-1">
              <span className="text-[10px] uppercase tracking-widest text-muted/70 px-3 mb-1">{g.label}</span>
              {g.items.map((n) => {
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
                    <span>{n.label}</span>
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
      </aside>
    </>
  );
}
