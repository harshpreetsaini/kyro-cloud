"use client";

import type { ComponentType } from "react";
import { useRuntime } from "@/components/providers/RuntimeProvider";
import { InfoIcon, CheckIcon, WarningIcon, XIcon } from "@/components/icons";

const ICONS: Record<string, ComponentType<{ className?: string }>> = {
  info: InfoIcon,
  success: CheckIcon,
  warning: WarningIcon,
  error: XIcon,
};

const ICON_COLORS: Record<string, string> = {
  info: "text-accent",
  success: "text-success",
  warning: "text-warning",
  error: "text-danger",
};

const toneStyles: Record<string, string> = {
  info: "border-l-accent",
  success: "border-l-success",
  warning: "border-l-warning",
  error: "border-l-danger",
};

export function Notifications() {
  const { notifications, dismiss } = useRuntime();
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 w-80 max-w-[90vw]">
      {notifications.map((n) => {
        const Icon = ICONS[n.level] || ICONS.info;
        return (
          <div
            key={n.id}
            role="status"
            onClick={() => dismiss(n.id)}
            className={`panel border-l-2 ${toneStyles[n.level]} px-4 py-3 text-sm cursor-pointer animate-fade-in flex items-center gap-2.5`}
          >
            <span className={`shrink-0 ${ICON_COLORS[n.level] || "text-accent"}`}>
              <Icon className="w-4 h-4" />
            </span>
            <span className="flex-1">{n.message}</span>
          </div>
        );
      })}
    </div>
  );
}
