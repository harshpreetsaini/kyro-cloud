import { ReactNode } from "react";
import type { RuntimeState } from "@shared/types";
import { RUNTIME_STATES } from "@shared/constants";
import { CheckIcon, XIcon, PackageOpenIcon } from "@/components/icons";

export function Button({
  children,
  onClick,
  variant = "primary",
  size = "md",
  disabled,
  className = "",
  title,
}: {
  children: ReactNode;
  onClick?: (e?: React.MouseEvent) => void;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
  className?: string;
  title?: string;
}) {
  const styles: Record<string, string> = {
    primary: "bg-accent text-on-accent font-semibold hover:brightness-105 shadow-glow-primary",
    secondary: "bg-secondary text-text hover:bg-surface-bright border border-white/5",
    ghost: "bg-transparent text-muted hover:text-text hover:bg-secondary",
    danger: "bg-danger-container text-[#ffdad6] hover:brightness-110",
  };
  const sizes: Record<string, string> = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-4 py-2 text-sm",
    lg: "px-6 py-2.5 text-sm font-semibold",
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`clay-btn rounded-xl font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 disabled:opacity-40 disabled:cursor-not-allowed ${styles[variant]} ${sizes[size]} ${className}`}
    >
      {children}
    </button>
  );
}

export function Spinner({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-block w-4 h-4 rounded-full border-2 border-muted/30 border-t-accent animate-spin ${className}`} aria-hidden />
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`rounded-lg bg-secondary/60 animate-pulse ${className}`} aria-hidden />;
}

export function SkeletonCard() {
  return (
    <div className="rounded-xl bg-surface border border-white/5 overflow-hidden">
      <div className="aspect-[3/4] bg-secondary/40 animate-pulse" />
      <div className="p-2.5 flex flex-col gap-1.5">
        <div className="h-4 w-3/4 rounded bg-secondary/40 animate-pulse" />
        <div className="h-3 w-1/2 rounded bg-secondary/40 animate-pulse" />
        <div className="h-2.5 w-1/3 rounded bg-secondary/40 animate-pulse mt-1" />
      </div>
    </div>
  );
}

export function SkeletonRow() {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="h-5 w-32 rounded bg-secondary/40 animate-pulse" />
        <div className="h-4 w-16 rounded bg-secondary/40 animate-pulse" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
        {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
      </div>
    </div>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`panel p-4 ${className}`}>{children}</div>;
}

export function Stat({ label, value, sub, accent }: { label: string; value: ReactNode; sub?: ReactNode; accent?: boolean }) {
  return (
    <div className="panel p-3 flex flex-col gap-1">
      <span className="text-[11px] uppercase tracking-wider text-muted">{label}</span>
      <span className={`mono text-xl ${accent ? "text-accent" : "text-text"}`}>{value}</span>
      {sub && <span className="text-[11px] text-muted">{sub}</span>}
    </div>
  );
}

export function Badge({ children, tone = "neutral", className = "" }: { children: ReactNode; tone?: "neutral" | "accent" | "success" | "warning" | "danger"; className?: string }) {
  const tones: Record<string, string> = {
    neutral: "bg-secondary text-muted",
    accent: "bg-accent/15 text-accent",
    success: "bg-success/15 text-success",
    warning: "bg-warning/15 text-warning",
    danger: "bg-danger/15 text-danger",
  };
  return <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${tones[tone]} ${className}`}>{children}</span>;
}

export function StateBadge({ state }: { state: RuntimeState }) {
  const map: Record<string, "neutral" | "accent" | "success" | "warning" | "danger"> = {
    OFFLINE: "neutral", STARTING: "warning", INITIALIZING: "warning", PREPARING: "warning",
    CONNECTING: "warning", ONLINE: "success", STREAMING: "accent", RECONNECTING: "warning",
    STOPPING: "warning", ERROR: "danger", DISCONNECTED: "danger",
  };
  return <Badge tone={map[state] || "neutral"}>{state}</Badge>;
}

export function ProgressList({ steps }: { steps: { label: string; status: "pending" | "active" | "done" | "error" }[] }) {
  return (
    <div className="flex flex-col gap-2">
      {steps.map((s, i) => (
        <div key={i} className="flex items-center gap-3 text-sm">
          <span className={`w-4 h-4 rounded-full flex items-center justify-center ${
            s.status === "done" ? "bg-success text-bg" : s.status === "active" ? "bg-accent text-on-accent animate-pulse-soft"
            : s.status === "error" ? "bg-danger-container text-[#ffdad6]" : "bg-secondary text-muted"
          }`}>
            {s.status === "done" ? <CheckIcon className="w-2.5 h-2.5" /> : s.status === "error" ? <XIcon className="w-2.5 h-2.5" /> : <span className="text-[10px]">{i + 1}</span>}
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

const TONE_DOT: Record<string, string> = { online: "bg-success", starting: "bg-warning", reconnecting: "bg-warning", error: "bg-danger", offline: "bg-muted" };

export function StatusDot({ tone, pulse }: { tone: string; pulse?: boolean }) {
  return <span className={`w-2.5 h-2.5 rounded-full ${TONE_DOT[tone] || "bg-muted"} ${pulse ? "animate-pulse-soft" : ""}`} />;
}

export function StatusPill({ tone, label, sub, pulse }: { tone: string; label: string; sub?: ReactNode; pulse?: boolean }) {
  return (
    <div className="flex flex-col leading-tight">
      <div className="flex items-center gap-2">
        <StatusDot tone={tone} pulse={pulse} />
        <span className="text-sm font-medium tracking-wide">{label}</span>
      </div>
      {sub && <span className="text-[11px] text-muted mt-0.5 mono">{sub}</span>}
    </div>
  );
}

export function EmptyState({ icon, title, description, action }: { icon?: ReactNode; title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center text-center gap-3 py-16 px-6">
      <div className="w-16 h-16 rounded-2xl clay-inset flex items-center justify-center text-muted/60">
        {icon ?? <PackageOpenIcon className="w-7 h-7" />}
      </div>
      <div>
        <p className="font-semibold tracking-wide text-lg">{title}</p>
        {description && <p className="text-sm text-muted mt-1.5 max-w-sm">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function SectionTitle({ children, hint }: { children: ReactNode; hint?: ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <h3 className="text-sm font-semibold tracking-wide">{children}</h3>
      {hint}
    </div>
  );
}
