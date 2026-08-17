"use client";

import { useRuntime } from "@/components/providers/RuntimeProvider";

const ICONS: Record<string, string> = {
  info: "ℹ",
  success: "✓",
  warning: "⚠",
  error: "✕",
};

const toneStyles: Record<string, string> = {
  info: "border-l-accent",
  success: "border-l-[#45e0a8]",
  warning: "border-l-[#ffc857]",
  error: "border-l-[#ff5c72]",
};

export function Notifications() {
  const { notifications, dismiss } = useRuntime();
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 w-80 max-w-[90vw]">
      {notifications.map((n) => (
        <div
          key={n.id}
          role="status"
          onClick={() => dismiss(n.id)}
          className={`panel border-l-2 ${toneStyles[n.level]} px-4 py-3 text-sm cursor-pointer animate-fade-in flex items-center gap-2`}
        >
          <span className="shrink-0">{ICONS[n.level]}</span>
          <span className="flex-1">{n.message}</span>
        </div>
      ))}
    </div>
  );
}
