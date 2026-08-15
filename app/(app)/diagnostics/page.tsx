"use client";

import { useRuntime } from "@/components/providers/RuntimeProvider";
import { Card, Badge } from "@/components/ui";
import { ControllerStatus } from "@/components/ControllerStatus";

export default function DiagnosticsPage() {
  const { session, systemInfo, stats, stream, connected } = useRuntime();

  const gpuOk = systemInfo?.gpu?.available;
  const storageOk = (systemInfo?.storage?.totalMb ?? 0) > 0;
  const streamingOk = session?.state === "STREAMING";
  const desktopOk = session?.state === "ONLINE" || session?.state === "STREAMING";

  const rows = [
    { label: "Runtime", ok: !!session && session.state !== "ERROR", detail: session?.state || "OFFLINE" },
    { label: "GPU", ok: !!gpuOk, detail: systemInfo?.gpu?.name || "Unavailable" },
    { label: "Storage", ok: storageOk, detail: systemInfo?.storage?.totalMb ? `${Math.round(systemInfo.storage.totalMb)} MB` : "Unavailable" },
    { label: "Desktop", ok: desktopOk, detail: desktopOk ? "Ready" : "Not ready" },
    { label: "Audio", ok: true, detail: session?.provider === "webrtc" ? "WebRTC" : "VNC/desktop" },
    { label: "Streaming", ok: streamingOk, detail: stream ? stream.type : "—" },
    { label: "Input", ok: connected, detail: connected ? "Link active" : "No link" },
    { label: "Network", ok: true, detail: systemInfo?.network?.quality || "unknown" },
  ];

  return (
    <div className="flex flex-col gap-4">
      <h2 className="font-display text-xl">System Diagnostics</h2>
      <div className="grid sm:grid-cols-2 gap-3">
        {rows.map((r) => (
          <Card key={r.label} className="flex items-center justify-between">
            <div>
              <p className="font-medium">{r.label}</p>
              <p className="text-[11px] text-muted truncate max-w-[16rem]">{r.detail}</p>
            </div>
            {r.ok ? <Badge tone="success">✓</Badge> : <Badge tone="danger">✕</Badge>}
          </Card>
        ))}
      </div>
      <ControllerStatus />
    </div>
  );
}
