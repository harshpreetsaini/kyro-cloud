export const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || "LUNA CLOUD";
export const APP_TAGLINE = process.env.NEXT_PUBLIC_APP_TAGLINE || "Your PC. Anywhere.";

export const RUNTIME_STATES = [
  "OFFLINE",
  "STARTING",
  "INITIALIZING",
  "PREPARING",
  "CONNECTING",
  "ONLINE",
  "STREAMING",
  "RECONNECTING",
  "STOPPING",
  "ERROR",
  "DISCONNECTED",
] as const;

export const STATE_FLOW = [
  "OFFLINE",
  "STARTING",
  "INITIALIZING",
  "PREPARING",
  "CONNECTING",
  "ONLINE",
  "STREAMING",
] as const;

export const ACTIVE_STATES = [
  "STARTING",
  "INITIALIZING",
  "PREPARING",
  "CONNECTING",
  "ONLINE",
  "STREAMING",
  "RECONNECTING",
] as const;

export const PROGRESS_STEPS = [
  "Initializing GPU",
  "Preparing desktop",
  "Starting streaming service",
  "Establishing connection",
] as const;

export const HOTKEYS = [
  { combo: "Ctrl + Shift + F", action: "Fullscreen" },
  { combo: "Ctrl + Shift + P", action: "Performance overlay" },
  { combo: "Ctrl + Shift + D", action: "Desktop" },
  { combo: "Ctrl + Shift + G", action: "Game library" },
  { combo: "Ctrl + Shift + Q", action: "Disconnect session" },
] as const;

export const RESOLUTION_OPTIONS = ["720p", "900p", "1080p", "Auto"] as const;
export const FPS_OPTIONS = [30, 60, "Auto"] as const;
export const QUALITY_OPTIONS = ["low", "balanced", "high"] as const;

export const DEFAULT_SETTINGS = {
  resolution: "1080p",
  fps: 60,
  quality: "balanced",
  autoReconnect: true,
  perfOverlay: false,
  compactMode: false,
  mouseSensitivity: 1,
} as const;
