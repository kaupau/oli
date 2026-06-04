// RadioGuessr server: serves the built client + demo audio over HTTP and runs
// the synchronized radio over a WebSocket. Single source of truth for timing,
// the correct answer, and the live vote tally.

import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { existsSync } from "node:fs";
import express from "express";
import { WebSocketServer, WebSocket } from "ws";
import { buildCatalog } from "./catalog.js";
import { Radio } from "./radio.js";
import type { ClientMsg, ServerMsg, Reveal, RoundPublic } from "./protocol.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT ?? 8787);
const LISTEN_MS = Number(process.env.LISTEN_MS ?? 20000);
const REVEAL_MS = Number(process.env.REVEAL_MS ?? 8000);

const publicDir = join(__dirname, "..", "public");
const clientDist = join(__dirname, "..", "..", "client", "dist");

async function main() {
  console.log("RadioGuessr starting...");
  const { tracks, mode } = await buildCatalog(publicDir);
  console.log(`  mode: ${mode} | ${tracks.length} tracks | round = ${LISTEN_MS}ms listen + ${REVEAL_MS}ms reveal`);

  const app = express();
  app.use("/demo", express.static(join(publicDir, "demo")));
  app.get("/api/health", (_req, res) => res.json({ ok: true, mode, tracks: tracks.length }));

  // Serve the built client if present (production). In dev, Vite serves it.
  if (existsSync(clientDist)) {
    app.use(express.static(clientDist));
    app.get(/^(?!\/(api|demo|ws)).*/, (_req, res) =>
      res.sendFile(join(clientDist, "index.html"))
    );
  }

  const server = createServer(app);
  const wss = new WebSocketServer({ server, path: "/ws" });
  const clients = new Set<WebSocket>();

  const broadcast = (msg: ServerMsg) => {
    const data = JSON.stringify(msg);
    for (const ws of clients) {
      if (ws.readyState === WebSocket.OPEN) ws.send(data);
    }
  };

  const radio = new Radio(
    tracks,
    { listenMs: LISTEN_MS, revealMs: REVEAL_MS, choiceCount: 4, leadMs: 2000 },
    {
      onRound: (current: RoundPublic, next: RoundPublic | null) =>
        broadcast({ t: "round", current, next }),
      onReveal: (reveal: Reveal) => broadcast({ t: "reveal", reveal }),
    }
  );
  radio.start();

  let nextConnId = 1;

  wss.on("connection", (ws) => {
    const connId = String(nextConnId++);
    clients.add(ws);

    const welcome: ServerMsg = {
      t: "welcome",
      serverTime: Date.now(),
      listeners: clients.size,
      current: radio.currentPublic(),
      next: radio.nextPublic(),
      reveal: radio.currentRevealIfActive(),
    };
    ws.send(JSON.stringify(welcome));
    broadcast({ t: "listeners", count: clients.size });

    ws.on("message", (raw) => {
      let msg: ClientMsg;
      try {
        msg = JSON.parse(String(raw));
      } catch {
        return;
      }
      if (msg.t === "ping") {
        // Reply immediately for clock-offset estimation.
        ws.send(JSON.stringify({ t: "pong", t0: msg.t0, ts: Date.now() } satisfies ServerMsg));
      } else if (msg.t === "guess") {
        const ok = radio.recordGuess(connId, msg.roundId, msg.choiceId);
        if (ok) {
          ws.send(
            JSON.stringify({
              t: "guessAck",
              roundId: msg.roundId,
              choiceId: msg.choiceId,
            } satisfies ServerMsg)
          );
        }
      }
    });

    ws.on("close", () => {
      clients.delete(ws);
      broadcast({ t: "listeners", count: clients.size });
    });
    ws.on("error", () => {
      clients.delete(ws);
    });
  });

  server.listen(PORT, () => {
    console.log(`  listening on http://localhost:${PORT}  (ws: /ws)`);
  });
}

main().catch((e) => {
  console.error("fatal:", e);
  process.exit(1);
});
