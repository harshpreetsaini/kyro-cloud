"use client";

import { useEffect, useRef } from "react";
import { wsUrl } from "@/lib/config/api";
import { getToken } from "@/lib/auth/client";

export function Terminal() {
  const containerRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<any>(null);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    let cancelled = false;

    import("@xterm/xterm").then(({ Terminal }) => {
      import("@xterm/addon-fit").then(({ FitAddon }) => {
        import("@xterm/addon-web-links").then(({ WebLinksAddon }) => {
          if (cancelled || !containerRef.current) return;

          const term = new Terminal({
            fontSize: 13,
            fontFamily: 'Menlo, Monaco, "Courier New", monospace',
            theme: {
              background: "#0d1117",
              foreground: "#c8d0e0",
              cursor: "#58a6ff",
              selectionBackground: "#264f78",
            },
            cursorBlink: true,
            scrollback: 10000,
            allowProposedApi: true,
          });

          const fitAddon = new FitAddon();
          const webLinksAddon = new WebLinksAddon();
          term.loadAddon(fitAddon);
          term.loadAddon(webLinksAddon);
          term.open(containerRef.current);
          fitAddon.fit();
          termRef.current = term;

          const token = getToken();
          const ws = new WebSocket(
            wsUrl("/ws/terminal") + (token ? `?token=${encodeURIComponent(token)}` : "")
          );
          wsRef.current = ws;

          ws.onmessage = (e) => {
            term.write(e.data);
          };

          ws.onopen = () => {
            term.writeln("\x1b[1;32mConnected to cloud terminal.\x1b[0m\r\n");
          };

          ws.onclose = () => {
            term.writeln("\r\n\x1b[1;31mConnection closed.\x1b[0m");
          };

          term.onData((data: string) => {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(data);
            }
          });

          const onResize = () => {
            try { fitAddon.fit(); } catch {}
          };
          window.addEventListener("resize", onResize);
          (term as any)._onResize = onResize;
        });
      });
    });

    return () => {
      cancelled = true;
      try {
        const t = termRef.current as any;
        if (t?._onResize) window.removeEventListener("resize", t._onResize);
      } catch {}
      try { wsRef.current?.close(); } catch {}
      try { termRef.current?.dispose(); } catch {}
    };
  }, []);

  return (
    <div className="panel flex flex-col h-[70vh] min-h-[360px] overflow-hidden">
      <div className="px-3 py-2 border-b border-white/5 text-xs uppercase tracking-wider text-muted flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-success" /> Terminal
      </div>
      <div ref={containerRef} className="flex-1 min-h-0" />
    </div>
  );
}
