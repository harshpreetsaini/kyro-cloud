"use client";

import { useEffect, useRef, useState } from "react";
import { wsUrl } from "@/lib/config/api";
import { getToken } from "@/lib/auth/client";

export function Terminal() {
  const [output, setOutput] = useState("");
  const [input, setInput] = useState("");
  const wsRef = useRef<WebSocket | null>(null);
  const outRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const token = getToken();
    const ws = new WebSocket(wsUrl("/ws/terminal") + (token ? `?token=${encodeURIComponent(token)}` : ""));
    wsRef.current = ws;
    ws.onmessage = (e) => {
      setOutput((o) => o + e.data);
      requestAnimationFrame(() => {
        if (outRef.current) outRef.current.scrollTop = outRef.current.scrollHeight;
      });
    };
    return () => ws.close();
  }, []);

  function send(e: React.FormEvent) {
    e.preventDefault();
    if (!wsRef.current) return;
    wsRef.current.send(input + "\n");
    setInput("");
  }

  return (
    <div className="panel flex flex-col h-[70vh] min-h-[360px] overflow-hidden">
      <div className="px-3 py-2 border-b border-white/5 text-xs uppercase tracking-wider text-muted flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-success" /> Terminal
      </div>
      <div ref={outRef} className="flex-1 overflow-auto mono text-[13px] p-3 whitespace-pre-wrap text-[#c8d0e0]">
        {output ? (
          output
        ) : (
          <span className="flex items-center gap-2 text-muted">
            <span className="w-3 h-3 rounded-full border-2 border-muted/40 border-t-accent animate-spin" /> Connecting
            to runtime shell…
          </span>
        )}
      </div>
      <form onSubmit={send} className="flex border-t border-white/5">
        <span className="px-3 py-2 mono text-accent">$</span>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="flex-1 bg-transparent outline-none mono text-[13px] py-2 pr-3"
          placeholder="type a command and press Enter"
          autoFocus
        />
      </form>
    </div>
  );
}
