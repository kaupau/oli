# 📻 Mixtape

A live, **Wordle-meets-radio** song guessing game. A short clip plays for
**everyone on the site at the same moment**, and you pick the right track from
multiple choice before the timer runs out. Build streaks, track your stats, and
see how the rest of the room voted after each round.

## How it works

- **One global timeline.** A small WebSocket server owns the radio schedule.
  Every connected browser is told exactly when the current clip started (in
  server time), so the audio plays in sync for all listeners.
- **Clock sync.** The client estimates its offset from the server clock
  (NTP-style ping/pong) and seeks the audio to the correct position — even if
  you join halfway through a round.
- **Rounds.** Each round is a **listen window** (audio + open guessing) followed
  by a **reveal window** (the answer, the album art, and how everyone voted).
- **Anti-peek.** The correct answer is never sent to the browser until the
  reveal, and guesses are validated server-side.
- **Stats.** Streaks and accuracy live in `localStorage` — no account needed.

## Music source

Songs come from the free **iTunes Search API** (30‑second preview clips, no API
key). The server builds a varied catalog at startup and trims each preview to
the round length.

**Offline / firewalled? It still works.** If the iTunes API can't be reached,
the server falls back to a self-contained **demo mode**: it synthesizes a set of
distinct audio tones on disk and you guess *those*. Great for local dev or
locked-down environments.

## Run it

```bash
cd radio-guessr
npm install        # installs root + server + client
npm run dev        # server on :8787, client on :5173 (Vite proxies to the server)
```

Open http://localhost:5173 and click **Tune in**. Open it in a second tab/device
to see the synchronization — both hear the same clip at the same spot.

### Production build

```bash
npm run preview    # builds the client, builds + starts the server on :8787
```

The server serves the built client, so a single process runs the whole thing.

## Deploy (play it on a real URL)

There's a single-image `Dockerfile` that builds the client + server and runs
one process. Any Docker host works:

```bash
docker build -t radio-guessr .
docker run -p 8787:8787 radio-guessr
# open http://localhost:8787
```

- **Render / Railway / Fly.io / Cloud Run:** point them at this folder's
  `Dockerfile`. They inject `PORT`, which the server reads automatically.
- WebSockets work out of the box on all of the above.
- On a host with normal internet you'll get **real songs from iTunes**; with no
  egress it falls back to demo tones.

## Configuration

Environment variables (server):

| Var         | Default | Meaning                          |
| ----------- | ------- | -------------------------------- |
| `PORT`      | `8787`  | HTTP + WebSocket port            |
| `LISTEN_MS` | `20000` | Listen/guess window per round    |
| `REVEAL_MS` | `8000`  | Reveal window per round          |

## Layout

```
radio-guessr/
├── server/        # Node + TypeScript: catalog, radio timeline, WebSocket
│   └── src/
│       ├── index.ts      # HTTP + WS bootstrap
│       ├── radio.ts      # round scheduler (source of truth for timing/answers)
│       ├── catalog.ts    # iTunes fetch + demo fallback
│       ├── tones.ts      # offline demo audio generator
│       └── protocol.ts   # wire types (mirrored in client)
└── client/        # React + Vite + Tailwind
    └── src/
        ├── App.tsx
        ├── lib/ws.ts     # connection + clock sync
        ├── lib/audio.ts  # time-synced playback
        ├── lib/stats.ts  # localStorage streaks/stats
        └── components/
```
