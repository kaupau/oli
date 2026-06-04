// WebSocket connection to the radio, plus a small NTP-style clock sync so the
// client can map its local clock onto server time. Everything that needs
// "what time is it on the radio" should use serverNow().

import { useEffect, useRef, useState, useCallback } from "react";
import type { ClientMsg, ServerMsg, RoundPublic, Reveal } from "../protocol";

function wsUrl(): string {
  const proto = location.protocol === "https:" ? "wss" : "ws";
  return `${proto}://${location.host}/ws`;
}

export type Connection = {
  status: "connecting" | "open" | "closed";
  current: RoundPublic | null;
  next: RoundPublic | null;
  reveal: Reveal | null;
  listeners: number;
  /** Estimated server epoch ms right now. */
  serverNow: () => number;
  /** Best round-trip time observed, ms (sync quality). */
  rtt: number;
  guess: (roundId: string, choiceId: string) => void;
};

export function useRadio(): Connection {
  const [status, setStatus] = useState<Connection["status"]>("connecting");
  const [current, setCurrent] = useState<RoundPublic | null>(null);
  const [next, setNext] = useState<RoundPublic | null>(null);
  const [reveal, setReveal] = useState<Reveal | null>(null);
  const [listeners, setListeners] = useState(0);
  const [rtt, setRtt] = useState(0);

  const wsRef = useRef<WebSocket | null>(null);
  const offsetRef = useRef(0); // serverTime - localTime
  const bestRttRef = useRef(Infinity);

  const serverNow = useCallback(() => Date.now() + offsetRef.current, []);

  const guess = useCallback((roundId: string, choiceId: string) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ t: "guess", roundId, choiceId } satisfies ClientMsg));
    }
  }, []);

  useEffect(() => {
    let alive = true;
    let pingTimer: ReturnType<typeof setInterval> | undefined;
    let reconnectTimer: ReturnType<typeof setTimeout> | undefined;

    const connect = () => {
      if (!alive) return;
      setStatus("connecting");
      const ws = new WebSocket(wsUrl());
      wsRef.current = ws;

      const sendPing = () =>
        ws.readyState === WebSocket.OPEN &&
        ws.send(JSON.stringify({ t: "ping", t0: Date.now() } satisfies ClientMsg));

      ws.onopen = () => {
        setStatus("open");
        bestRttRef.current = Infinity;
        // Burst a few pings to converge the clock quickly, then keep it fresh.
        sendPing();
        setTimeout(sendPing, 150);
        setTimeout(sendPing, 350);
        pingTimer = setInterval(sendPing, 5000);
      };

      ws.onmessage = (ev) => {
        const msg: ServerMsg = JSON.parse(ev.data);
        switch (msg.t) {
          case "welcome":
            // Seed the clock from welcome (refined by pongs), then state.
            offsetRef.current = msg.serverTime - Date.now();
            setCurrent(msg.current);
            setNext(msg.next);
            setListeners(msg.listeners);
            setReveal(msg.reveal ?? null);
            break;
          case "round":
            setReveal(null);
            setCurrent(msg.current);
            setNext(msg.next);
            break;
          case "reveal":
            setReveal(msg.reveal);
            break;
          case "listeners":
            setListeners(msg.count);
            break;
          case "pong": {
            const now = Date.now();
            const rttSample = now - msg.t0;
            // Keep the offset from the lowest-latency exchange (least jitter).
            if (rttSample < bestRttRef.current) {
              bestRttRef.current = rttSample;
              offsetRef.current = msg.ts + rttSample / 2 - now;
              setRtt(rttSample);
            }
            break;
          }
          case "guessAck":
            // Handled optimistically client-side; nothing required here.
            break;
        }
      };

      ws.onclose = () => {
        setStatus("closed");
        if (pingTimer) clearInterval(pingTimer);
        if (alive) reconnectTimer = setTimeout(connect, 1000);
      };
      ws.onerror = () => ws.close();
    };

    connect();
    return () => {
      alive = false;
      if (pingTimer) clearInterval(pingTimer);
      if (reconnectTimer) clearTimeout(reconnectTimer);
      wsRef.current?.close();
    };
  }, []);

  return { status, current, next, reveal, listeners, serverNow, rtt, guess };
}
