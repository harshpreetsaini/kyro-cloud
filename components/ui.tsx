import { ReactNode } from "react";
import type { RuntimeState } from "@shared/types";
import { RUNTIME_STATES } from "@shared/constants";

export function Button({
  children,
  onClick,
  variant = "primary",
  disabled,
  className = "",
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "ghost" | "danger";
  disabled?: boolean;
  className?: string;
}) {
  const styles: Record<string, string> = {
    primary: "bg-accent text-white hover:brightness-110",
    ghost: "bg-secondary text-text hover:bg-[#1c2230]",
    danger: "bg-danger/90 text-white hover:bg-danger",
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`px-4 py-2 rounded-lg text-sm font-medium transition ${styles[variant]} disabled:opacity-40 disabled:cursor-not-allowed ${className}`}
    >
      {children}
    </button>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`panel p-4 ${className}`}>{children}</div>;
}

export function Stat({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  accent?: boolean;
}) {
  return (
    <div className="panel p-3 flex flex-col gap-1">
      <span className="text-[11px] uppercase tracking-wider text-muted">{label}</span>
      <span className={`mono text-xl ${accent ? "text-accent" : "text-text"}`}>{value}</span>
      {sub && <span className="text-[11px] text-muted">{sub}</span>}
    </div>
  );
}

export function Badge({
  children,
  tone = "neutral",
  className = "",
}: {
  children: ReactNode;
  tone?: "neutral" | "accent" | "success" | "warning" | "danger";
  className?: string;
}) {
  const tones: Record<string, string> = {
    neutral: "bg-secondary text-muted",
    accent: "bg-accent/15 text-accent",
    success: "bg-[#45e0a8]/15 text-[#45e0a8]",
    warning: "bg-[#ffc857]/15 text-[#ffc857]",
    danger: "bg-[#ff5c72]/15 text-[#ff5c72]",
  };
  return (
    <span className={`text-[11px] px-2 py-0.5 rounded-full ${tones[tone]} ${className}`}>{children}</span>
  );
}

export function StateBadge({ state }: { state: RuntimeState }) {
  const map: Record<string, "neutral" | "accent" | "success" | "warning" | "danger"> = {
    OFFLINE: "neutral",
    STARTING: "warning",
    INITIALIZING: "warning",
    PREPARING: "warning",
    CONNECTING: "warning",
    ONLINE: "success",
    STREAMING: "accent",
    RECONNECTING: "warning",
    STOPPING: "warning",
    ERROR: "danger",
    DISCONNECTED: "danger",
  };
  return <Badge tone={map[state] || "neutral"}>{state}</Badge>;
}

export function ProgressList({
  steps,
}: {
  steps: { label: string; status: "pending" | "active" | "done" | "error" }[];
}) {
  return (
    <div className="flex flex-col gap-2">
      {steps.map((s, i) => (
        <div key={i} className="flex items-center gap-3 text-sm">
          <span
            className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
              s.status === "done"
                ? "bg-[#45e0a8] text-bg"
                : s.status === "active"
                ? "bg-accent text-white animate-pulse-soft"
                : s.status === "error"
                ? "bg-danger text-white"
                : "bg-secondary text-muted"
            }`}
          >
            {s.status === "done" ? "✓" : s.status === "error" ? "✕" : i + 1}
          </span>
          <span className={s.status === "pending" ? "text-muted" : "text-text"}>{s.label}</span>
        </div>
      ))}
    </div>
  );
}

export function fmt(n: number | null | undefined, suffix = "") {
  if (n === null || n === undefined) return "--";
  return `${Math.round(n)}${suffix}`;
}
