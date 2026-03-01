# StrudelVibe - Cursor for Strudel

## Project Overview

**Mission:** Build a browser-based music coding environment inspired by Strudel (live coding for electronic music). Think "Cursor IDE" but for creating music through code.

**Core Concept:** Users write code to generate/control music in real-time, with access to custom and default sound banks.

---

## Architecture

### Tech Stack

**Frontend:**
- React + Vite (minimal, fast)
- Tailwind CSS (sleek, minimal styling)
- Tone.js (audio engine - same as Strudel)
- CodeMirror or Monaco for code editor
- Zustand for state management (minimal)

**Backend:**
- Go with Gin framework (clean, maintainable, fast)
- SQLite (simple, file-based, no setup)
- Clean Architecture: handlers → services → repositories

**Project Structure:**
```
strudelvibe/
├── frontend/          # React + Vite + Tailwind
│   ├── src/
│   │   ├── components/   # UI components
│   │   ├── hooks/        # Custom React hooks
│   │   ├── lib/          # Tone.js setup, utilities
│   │   ├── stores/       # Zustand stores
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── index.html
│   ├── tailwind.config.js
│   └── vite.config.ts
├── backend/           # Go + Gin
│   ├── cmd/
│   │   └── server/
│   │       └── main.go
│   ├── internal/
│   │   ├── handlers/     # HTTP handlers
│   │   ├── services/    # Business logic
│   │   ├── repositories/# Data access
│   │   ├── models/      # Data models
│   │   └── config/      # Configuration
│   ├── pkg/             # Shared utilities
│   ├── go.mod
│   └── go.sum
└── README.md
```

---

## Features

### 1. Visualizer (Default View)
- Full-screen visualizer showing waveform/frequency
- Play/Pause/Stop controls prominent
- Pattern info displayed as nice chips/badges
- "Advanced Mode" toggle to show code

### 2. Code Editor (Advanced Mode)
- Syntax highlighting for Strudel patterns
- Live preview (auto-run on change with debounce)

### 2. Sound Banks
- **Default sound banks:** Pre-loaded samples (drums, bass, synth, fx)
- **Custom uploads:** Users upload .wav/.mp3 files
- Sound bank management (list, delete custom banks)

### 3. Pattern Engine
- Parse and execute Strudel-style patterns
- Support for: notes, samples, effects, rhythms
- Real-time audio synthesis

### 4. UI Layout (Minimal & Sleek)
- Left: Code editor (60% width)
- Right: Visualizer + controls (40% width)
- Bottom: Sound bank selector (collapsible)
- Dark theme by default, minimal chrome

---

## API Design

### Endpoints

```
GET    /api/soundbanks          # List all sound banks (default + custom)
POST   /api/soundbanks          # Upload custom sound bank
DELETE /api/soundbanks/:id      # Delete custom sound bank
GET    /api/soundbanks/:id/files # Get files in a sound bank

POST   /api/projects            # Save project (code + settings)
GET    /api/projects            # List saved projects
GET    /api/projects/:id        # Load project
DELETE /api/projects/:id        # Delete project
```

---

## Implementation Phases

### Phase 1: MVP (This Week)
- [x] Project scaffolding
- [ ] Backend: sound bank CRUD
- [ ] Frontend: basic code editor + Tone.js setup
- [ ] Default sound banks loaded
- [ ] Play/Stop basic functionality

### Phase 2: Polish
- [ ] Custom sound bank uploads
- [ ] Live coding (eval on keystroke)
- [ ] Visualizer
- [ ] Project save/load

### Phase 3: Power Features
- [ ] Presets/templates
- [ ] Share via URL
- [ ] Collaboration

---

## Principles

1. **Minimal code, maximum impact** - Every line must earn its place
2. **Maintainable backend** - Clear separation: handlers don't touch DB, services have no HTTP knowledge
3. **Sleek frontend** - Black background, neon accents, zero clutter
4. **Fast iteration** - Hot reload, instant feedback

---

## Next Steps

1. Approve this spec
2. Scaffold the repo (I'll set up both frontend and backend)
3. Implement Phase 1
