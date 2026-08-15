"use client";

import { useEffect, useRef, useState } from "react";

export function Terminal() {
  const [output, setOutput] = useState("");
  const [input, setInput] = useState("");
  const wsRef = useRef<WebSocket | null>(null);
  const outRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const proto = window.location.protocol === "https:" ? "wss" : "ws";
    const ws = new WebSocket(`${proto}://${window.location.host}/ws/terminal`);
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
      <div ref={outRef} className="flex-1 overflow-auto mono text-[13px] p-3 whitespace-pre-wrap text-[#c8d0e0]">
        {output || "Connecting to runtime shell…"}
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
