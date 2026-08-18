"use client";

import { useEffect, useRef } from "react";
import { wsUrl } from "@/lib/config/api";

interface Props {
  signalingUrl: string;
  room: string;
  iceServers?: { urls: string }[];
  className?: string;
}

// Low-latency WebRTC viewer (experimental). The browser is the offerer; the
// Colab agent answers via the Render signaling relay. Keyboard/mouse are sent
// to the agent over a data channel.
export function WebRTCViewer({ signalingUrl, room, iceServers, className = "" }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);

  useEffect(() => {
    let cancelled = false;
    const ice = iceServers && iceServers.length ? iceServers : [{ urls: "stun:stun.l.google.com:19302" }];
    const pc = new RTCPeerConnection({ iceServers: ice });
    pcRef.current = pc;
    const dc = pc.createDataChannel("input");
    dcRef.current = dc;

    const ws = new WebSocket(wsUrl(`${signalingUrl}?room=${encodeURIComponent(room)}&role=client`));
    const send = (m: unknown) => {
      if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(m));
    };
    ws.onmessage = async (ev) => {
      try {
        const msg = JSON.parse(ev.data as string);
        if (msg.type === "answer") {
          await pc.setRemoteDescription(new RTCSessionDescription(msg as RTCSessionDescriptionInit));
        } else if (msg.type === "candidate" && msg.candidate) {
          try {
            await pc.addIceCandidate(msg.candidate as RTCIceCandidateInit);
          } catch {}
        }
      } catch {}
    };

    pc.onicecandidate = (e) => {
      if (e.candidate) send({ type: "candidate", candidate: e.candidate.toJSON() });
    };
    pc.ontrack = (e) => {
      if (videoRef.current) videoRef.current.srcObject = e.streams[0];
    };

    (async () => {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      send({ type: "offer", sdp: pc.localDescription?.sdp });
    })();

    return () => {
      cancelled = true;
      try {
        ws.close();
      } catch {}
      try {
        pc.close();
      } catch {}
    };
  }, [signalingUrl, room, iceServers]);

  const sendInput = (data: unknown) => {
    try {
      dcRef.current?.send(JSON.stringify(data));
    } catch {}
  };

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      className={`w-full h-full bg-black ${className}`}
      tabIndex={0}
      onMouseDown={(e) => sendInput({ t: "mdown", b: e.button, x: e.clientX, y: e.clientY })}
      onMouseUp={(e) => sendInput({ t: "mup", b: e.button })}
      onMouseMove={(e) => sendInput({ t: "mmove", x: e.clientX, y: e.clientY })}
      onWheel={(e) => sendInput({ t: "wheel", d: Math.sign(e.deltaY) })}
      onContextMenu={(e) => e.preventDefault()}
      onKeyDown={(e) => {
        e.preventDefault();
        sendInput({ t: "kdown", k: e.key, code: e.code });
      }}
      onKeyUp={(e) => sendInput({ t: "kup", k: e.key, code: e.code })}
    />
  );
}
