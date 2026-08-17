"use client";

import { useState } from "react";
import { useRuntime } from "@/components/providers/RuntimeProvider";
import { Card, Badge, Button } from "@/components/ui";
import { ControllerStatus } from "@/components/ControllerStatus";

export default function DiagnosticsPage() {
  const { session, systemInfo, stats, stream, connected, restart } = useRuntime();
  const [showStream, setShowStream] = useState(false);

  const gpuOk = systemInfo?.gpu?.available;
  const storageOk = (systemInfo?.storage?.totalMb ?? 0) > 0;
  const streamingOk = session?.state === "STREAMING";
  const desktopOk = session?.state === "ONLINE" || session?.state === "STREAMING";

  const rows = [
    { label: "Runtime", ok: !!session && session.state !== "ERROR", detail: session?.state || "OFFLINE", click: null as null | (() => void) },
    { label: "GPU", ok: !!gpuOk, detail: systemInfo?.gpu?.name || "Unavailable", click: null },
    { label: "Storage", ok: storageOk, detail: systemInfo?.storage?.totalMb ? `${Math.round(systemInfo.storage.totalMb)} MB` : "Unavailable", click: null },
    { label: "Desktop", ok: desktopOk, detail: desktopOk ? "Ready" : "Not ready", click: null },
    { label: "Audio", ok: true, detail: session?.provider === "webrtc" ? "WebRTC" : "VNC / desktop", click: null },
    {
      label: "Streaming",
      ok: streamingOk,
      detail: stream ? stream.type : session?.state === "ERROR" ? "Failed" : "—",
      click: () => setShowStream((v) => !v),
    },
    { label: "Input", ok: connected, detail: connected ? "Link active" : "No link", click: null },
    { label: "Network", ok: true, detail: systemInfo?.network?.quality || "unknown", click: null },
  ];

  const streamSteps = [
    { label: "Runtime", ok: !!session && session.state !== "ERROR" },
    { label: "GPU", ok: !!gpuOk },
    { label: "Display", ok: desktopOk },
    { label: "Encoder", ok: true },
    { label: "WebRTC", ok: !!stream && stream.type === "webrtc" },
    { label: "VNC tunnel", ok: !!stream && stream.type === "vnc" },
  ];

  const errorText = session?.error || "No detailed error was reported by the runtime.";
  const logs = [
    `Runtime state: ${session?.state || "OFFLINE"}`,
    `Provider: ${session?.provider || "unknown"}`,
    `Stream: ${stream ? stream.type : "none"}`,
    `GPU: ${systemInfo?.gpu?.name || "unavailable"}`,
    `Error: ${errorText}`,
  ].join("\n");

  function copyLogs() {
    navigator.clipboard?.writeText(logs);
  }

  return (
    <div className="flex flex-col gap-4">
      <h2 className="font-display text-xl">System Diagnostics</h2>

      <div className="grid sm:grid-cols-2 gap-3">
        {rows.map((r) => (
          <button
            key={r.label}
            onClick={r.click || undefined}
            className={`panel p-4 flex items-center justify-between text-left transition hover:border-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 ${
              r.click ? "cursor-pointer" : "cursor-default"
            }`}
          >
            <div>
              <p className="font-medium">{r.label}</p>
              <p className="text-[11px] text-muted truncate max-w-[16rem]">{r.detail}</p>
            </div>
            {r.ok ? <Badge tone="success">✓</Badge> : <Badge tone="danger">✕</Badge>}
          </button>
        ))}
      </div>

      {(!streamingOk || showStream) && (
        <Card className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="font-medium">Streaming Diagnostics</h3>
            <Badge tone={streamingOk ? "success" : "danger"}>{streamingOk ? "OK" : "FAILED"}</Badge>
          </div>

          <div className="grid sm:grid-cols-2 gap-2">
            {streamSteps.map((s) => (
              <div key={s.label} className="flex items-center justify-between text-sm panel !bg-secondary/50 px-3 py-2">
                <span>{s.label}</span>
                {s.ok ? <Badge tone="success">✓</Badge> : <Badge tone="danger">✕</Badge>}
              </div>
            ))}
          </div>

          <div className="panel !bg-bg/60 p-3 mono text-[11px] text-danger/90 whitespace-pre-wrap break-words">
            {errorText}
          </div>

          <div className="flex gap-2">
            <Button onClick={restart}>Retry Stream</Button>
            <Button variant="ghost" onClick={copyLogs}>
              Copy Logs
            </Button>
          </div>
        </Card>
      )}

      <Card className="flex flex-col gap-2">
        <h3 className="text-sm text-muted uppercase tracking-wider">Controller</h3>
        <ControllerStatus />
      </Card>
    </div>
  );
}
