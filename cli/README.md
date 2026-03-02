# oli cli

Terminal-based music coding environment. A CLI version of the oli web app.

## Install

```bash
cd cli
npm install
npm run build
```

## Run

```bash
# Make sure the backend is running first
cd ../backend && go run cmd/server/main.go &

# Run the CLI
npm start
# or
node dist/index.js
```

## Usage

### Navigation
- `1` / `2` / `3` / `4` - Switch panels (sounds/play/ai/projects)
- `←` `→` - Cycle between panels
- `↑` `↓` or `j` `k` - Navigate lists

### Playback
- `space` - Play/stop
- `t` - Edit tempo
- `-` / `+` - Adjust tempo by 5 bpm

### Panels

**1:sounds** - Browse and preview samples
- `enter` / `l` - Expand/collapse folder
- `←` / `h` - Collapse
- Samples play automatically when selected

**2:play** - ASCII visualizer
- Shows current pattern and EQ bars
- Displays tempo and play status

**3:ai** - Chat with oli AI
- Type a beat description and press enter
- `↑` `↓` - Select a response
- `p` - Play selected code
- `s` - Save selected code

**4:proj** - Project management
- `n` - New project
- `enter` - Load project
- `d` - Delete project

### Quit
- `q` - Exit

## Environment

Set `OLI_API` to point to a different backend:
```bash
OLI_API=http://localhost:8080/api npm start
```
