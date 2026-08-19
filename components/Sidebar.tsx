"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSyncExternalStore, useEffect } from "react";
import { APP_NAME } from "@/lib/config/branding";
import { sidebarStore } from "@/lib/ui/sidebar";

const NAV = [
  {
    label: "Home",
    items: [
      { href: "/home", label: "Home", icon: "⌂" },
      { href: "/games", label: "All Games", icon: "🎮" },
    ],
  },
  {
    label: "Library",
    items: [
      { href: "/library", label: "My Library", icon: "▣" },
      { href: "/favorites", label: "Favorites", icon: "♥" },
      { href: "/providers", label: "Providers", icon: "🔗" },
    ],
  },
  {
    label: "System",
    items: [
      { href: "/performance", label: "Performance", icon: "📊" },
      { href: "/settings", label: "Settings", icon: "⚙" },
    ],
  },
];

const ICONS: Record<string, string> = {
  "/home": "⌂", "/games": "🎮", "/library": "▣", "/favorites": "♥", "/settings": "⚙",
};

export function Sidebar() {
  const path = usePathname();
  const open = useSyncExternalStore(sidebarStore.subscribe, sidebarStore.getSnapshot, sidebarStore.getSnapshot);
  const collapsed = useSyncExternalStore(sidebarStore.subscribe, sidebarStore.isCollapsed, sidebarStore.isCollapsed);

  useEffect(() => { sidebarStore.set(false); }, [path]);

  const sidebarWidth = collapsed ? "w-[68px]" : "w-60";

  return (
    <>
      {open && (
        <div className="fixed inset-0 bg-black/60 z-30 lg:hidden animate-fade-in" onClick={() => sidebarStore.set(false)} aria-hidden />
      )}

      {/* Mobile overlay */}
      <aside className={`fixed lg:static z-40 inset-y-0 left-0 ${sidebarWidth} bg-surface border-r border-white/5 flex flex-col transition-all duration-200 lg:translate-x-0 ${
        open ? "translate-x-0" : "-translate-x-full"
      }`}>
        {/* Logo */}
        <div className={`h-14 flex items-center ${collapsed ? "justify-center" : "gap-2 px-4"} border-b border-white/5 shrink-0`}>
          <div className="w-8 h-8 rounded-lg bg-accent glow-accent flex items-center justify-center font-bold text-sm shrink-0">K</div>
          {!collapsed && <span className="font-semibold tracking-tight text-sm">{APP_NAME}</span>}
        </div>

        {/* Collapse toggle - desktop only */}
        <button
          onClick={() => sidebarStore.toggleCollapsed()}
          className="hidden lg:flex absolute -right-3 top-16 w-6 h-6 rounded-full bg-surface border border-white/10 items-center justify-center text-muted hover:text-text hover:bg-secondary transition-colors z-50"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <span className="text-[10px]">{collapsed ? "▶" : "◀"}</span>
        </button>

        {/* Nav */}
        <nav className="flex-1 py-3 flex flex-col gap-4 overflow-y-auto px-2">
          {NAV.map((group) => (
            <div key={group.label} className="flex flex-col gap-0.5">
              {!collapsed && (
                <span className="text-[10px] uppercase tracking-widest text-muted/60 px-2 mb-1">{group.label}</span>
              )}
              {group.items.map((item) => {
                const active = path === item.href || path.startsWith(item.href + "/");
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={collapsed ? item.label : undefined}
                    className={`flex items-center gap-2.5 ${collapsed ? "justify-center" : ""} px-2.5 py-2 rounded-lg text-sm transition-all ${
                      active ? "bg-accent/15 text-accent" : "text-muted hover:text-text hover:bg-secondary"
                    }`}
                  >
                    <span className={`w-5 h-5 flex items-center justify-center text-[13px] ${active ? "text-accent" : ""}`}>{item.icon}</span>
                    {!collapsed && <span>{item.label}</span>}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Footer */}
        {!collapsed && (
          <div className="px-3 py-3 border-t border-white/5">
            <p className="text-[10px] text-muted/40 text-center">KYRO CLOUD v1.0</p>
          </div>
        )}
      </aside>
    </>
  );
}
