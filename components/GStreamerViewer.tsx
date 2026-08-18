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
  const [audioSupported, setAudioSupported] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const decoderRef = useRef<VideoDecoder | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const audioQueueRef = useRef<ArrayBuffer[]>([]);
  const frameCountRef = useRef(0);
  const lastFpsTimeRef = useRef(Date.now());

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
      try {
        audioCtx = new AudioContext();
        audioCtxRef.current = audioCtx;
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
        const payload = rawData.slice(1);

        if (marker === 0x00) {
          // Video frame (H.264)
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
          audioCtx.decodeAudioData(payload.buffer).then((buf) => {
            const source = audioCtx!.createBufferSource();
            source.buffer = buf;
            source.connect(audioCtx!.destination);
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
        const payload = rawData.slice(1);
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
        {fps} FPS | GPU H.264{audioSupported ? " + Opus" : ""}
      </div>
    </div>
  );
}
