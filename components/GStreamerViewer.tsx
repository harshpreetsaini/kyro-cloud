"use client";

import { useEffect, useRef, useState } from "react";
import { wsUrl } from "@/lib/config/api";

/**
 * GStreamerViewer — decodes a raw H.264 byte stream (from GStreamer on Colab)
 * using the browser's WebCodecs API and renders to a <canvas>.
 * Also decodes Opus audio packets (prefixed 0x01) and plays them.
 *
 * Falls back to MSE (Media Source Extensions) if WebCodecs is unavailable.
 */
export function GStreamerViewer({
  streamUrl,
  className = "",
}: {
  streamUrl?: string;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [fps, setFps] = useState(0);
  const [latency, setLatency] = useState(0);
  const [audioSupported, setAudioSupported] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const decoderRef = useRef<VideoDecoder | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const audioGainRef = useRef<GainNode | null>(null);
  const audioQueueRef = useRef<ArrayBuffer[]>([]);
  const frameCountRef = useRef(0);
  const lastFpsTimeRef = useRef(Date.now());
  const latencySumRef = useRef(0);
  const latencyCountRef = useRef(0);

  // Load audio settings from localStorage
  const getAudioSettings = () => {
    try {
      const saved = localStorage.getItem("luna.settings");
      if (saved) {
        const s = JSON.parse(saved);
        return { volume: s.volume ?? 80, mute: s.muteAudio ?? false };
      }
    } catch {}
    return { volume: 80, mute: false };
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const url = streamUrl && /^wss?:\/\//.test(streamUrl)
      ? streamUrl
      : wsUrl(streamUrl || "/ws/stream");

    // FPS counter
    const fpsInterval = setInterval(() => {
      const now = Date.now();
      const elapsed = (now - lastFpsTimeRef.current) / 1000;
      if (elapsed >= 1) {
        setFps(Math.round(frameCountRef.current / elapsed));
        frameCountRef.current = 0;
        lastFpsTimeRef.current = now;
        // Update average latency
        if (latencyCountRef.current > 0) {
          setLatency(Math.round(latencySumRef.current / latencyCountRef.current));
          latencySumRef.current = 0;
          latencyCountRef.current = 0;
        }
      }
    }, 1000);

    let cancelled = false;

    // Try WebCodecs first, fall back to MSE.
    if ("VideoDecoder" in globalThis && "VideoDecoder" in window) {
      setupWebCodecs(url, canvas, ctx, cancelled);
    } else {
      setupMSE(url, canvas, ctx);
    }

    function setupWebCodecs(
      wsUrl: string,
      canvas: HTMLCanvasElement,
      ctx: CanvasRenderingContext2D,
      cancelled: boolean
    ) {
      let lastConfig = false;

      const decoder = new VideoDecoder({
        output: (frame: VideoFrame) => {
          if (cancelled) { frame.close(); return; }
          canvas.width = frame.displayWidth;
          canvas.height = frame.displayHeight;
          ctx.drawImage(frame, 0, 0);
          frame.close();
          frameCountRef.current++;
        },
        error: (e) => {
          console.error("[GStreamerViewer] decoder error:", e);
        },
      });
      decoderRef.current = decoder;

      // Set up audio context for Opus decoding.
      let audioCtx: AudioContext | null = null;
      let gainNode: GainNode | null = null;
      try {
        audioCtx = new AudioContext();
        gainNode = audioCtx.createGain();
        const { volume, mute } = getAudioSettings();
        gainNode.gain.value = mute ? 0 : volume / 100;
        gainNode.connect(audioCtx.destination);
        audioCtxRef.current = audioCtx;
        audioGainRef.current = gainNode;
        setAudioSupported(true);
      } catch {}

      const ws = new WebSocket(wsUrl);
      ws.binaryType = "arraybuffer";
      wsRef.current = ws;

      ws.onmessage = (ev) => {
        if (cancelled) return;
        if (typeof ev.data === "string") return;

        const rawData = new Uint8Array(ev.data);
        const marker = rawData[0];

        if (marker === 0x00) {
          // Video frame (H.264) with 4-byte timestamp prefix
          // Extract timestamp from bytes 1-4
          const timestampBytes = rawData.slice(1, 5);
          const serverTimestamp = (timestampBytes[0] << 24) |
                                  (timestampBytes[1] << 16) |
                                  (timestampBytes[2] << 8) |
                                  timestampBytes[3];

          // Calculate latency (server timestamp vs local time)
          const now = Date.now() % 0xFFFFFFFF;
          let latMs = now - serverTimestamp;
          if (latMs < 0) latMs += 0xFFFFFFFF; // Handle wraparound
          if (latMs < 1000) { // Sanity check: ignore if > 1 second
            latencySumRef.current += latMs;
            latencyCountRef.current++;
          }

          // Actual video data starts at byte 5
          const payload = rawData.slice(5);

          if (!lastConfig) {
            lastConfig = true;
            try {
              decoder.configure({
                codec: "avc1.42001f",
                optimizeForLatency: true,
              });
            } catch (e: any) {
              setError(`Configure failed: ${e.message}`);
            }
          }
          try {
            decoder.decode(
              new EncodedVideoChunk({
                type: "delta",
                timestamp: performance.now() * 1000,
                data: payload,
              })
            );
          } catch {
            // Ignore decode errors for SPS/PPS NAL units.
          }
        } else if (marker === 0x01 && audioCtx) {
          // Audio frame (Opus in Ogg container)
          const payload = rawData.slice(1);
          audioCtx.decodeAudioData(payload.buffer).then((buf) => {
            const source = audioCtx!.createBufferSource();
            source.buffer = buf;
            // Connect through gain node for volume control
            if (audioGainRef.current) {
              source.connect(audioGainRef.current);
            } else {
              source.connect(audioCtx!.destination);
            }
            source.start();
          }).catch(() => {});
        }
      };

      ws.onerror = () => setError("WebSocket connection failed");
      ws.onclose = () => {
        if (!cancelled) setError("Stream ended");
      };
    }

    function setupMSE(
      wsUrl: string,
      canvas: HTMLCanvasElement,
      ctx: CanvasRenderingContext2D
    ) {
      const video = document.createElement("video");
      video.autoplay = true;
      video.playsInline = true;

      if (!("MediaSource" in window)) {
        setError("Neither WebCodecs nor MSE is supported in this browser");
        return;
      }

      const ws = new WebSocket(wsUrl);
      ws.binaryType = "arraybuffer";
      wsRef.current = ws;

      const ms = new MediaSource();
      video.src = URL.createObjectURL(ms);
      let sourceBuffer: SourceBuffer | null = null;

      ms.addEventListener("sourceopen", () => {
        try {
          sourceBuffer = ms.addSourceBuffer('video/mp4; codecs="avc1.42001f"');
          sourceBuffer.mode = "segments";
        } catch (e: any) {
          setError(`MSE addSourceBuffer failed: ${e.message}`);
        }
      });

      ws.onmessage = (ev) => {
        if (typeof ev.data === "string" || !sourceBuffer) return;
        const rawData = new Uint8Array(ev.data);
        const marker = rawData[0];
        if (marker !== 0x00) return; // Skip audio packets
        // Skip 4-byte timestamp for MSE mode
        const payload = rawData.slice(5);
        try {
          sourceBuffer.appendBuffer(payload);
        } catch {
          try {
            sourceBuffer!.remove(0, sourceBuffer!.buffered.end(0) - 5);
          } catch {}
        }
      };

      function drawFrame() {
        if (video.readyState >= 2) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          ctx.drawImage(video, 0, 0);
          frameCountRef.current++;
        }
        requestAnimationFrame(drawFrame);
      }
      video.play().then(() => requestAnimationFrame(drawFrame)).catch(() => {});

      ws.onerror = () => setError("WebSocket connection failed");
    }

    return () => {
      cancelled = true;
      clearInterval(fpsInterval);
      try { decoderRef.current?.close(); } catch {}
      try { audioGainRef.current?.disconnect(); } catch {}
      try { audioCtxRef.current?.close(); } catch {}
      try { wsRef.current?.close(); } catch {}
    };
  }, [streamUrl]);

  if (error) {
    return (
      <div className={`flex flex-col items-center justify-center bg-black/60 text-center gap-2 text-muted text-sm px-6 ${className}`}>
        <p className="text-red-400">{error}</p>
      </div>
    );
  }

  return (
    <div className={`relative w-full h-full ${className}`}>
      <canvas ref={canvasRef} className="w-full h-full object-contain bg-black" />
      <div className="absolute top-2 right-2 text-xs bg-black/60 text-green-400 px-2 py-1 rounded font-mono">
        {fps} FPS | {latency}ms | GPU H.264{audioSupported ? " + Opus" : ""}
      </div>
    </div>
  );
}
