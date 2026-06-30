# Browser Aim Trainer

A fast, lightweight browser-based aim trainer to sharpen your mouse accuracy and reaction time. Built with TypeScript, React, and Canvas 2D.

## Features

- **Point-and-click training** — Move crosshair to targets, click to hit
- **Real-time stats** — Hits, accuracy %, average reaction time, score
- **Customizable settings** — Sensitivity, DPI, FOV with cm/360 calculation
- **Minimal & responsive** — No heavy 3D libraries, runs smoothly in any browser
- **Clean architecture** — Game engine fully separated from UI layer

## Quick Start

```bash
npm install
npm run dev
```

Open http://localhost:5173 and click to start training.

## Controls

| Action | Input |
|--------|-------|
| Aim | Move mouse |
| Shoot | Click |
| Pause | Move mouse outside canvas |
| Settings | Gear icon (top right) |

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite
- **Rendering**: Canvas 2D API
- **State**: Custom store with localStorage persistence
- **Architecture**: Framework-agnostic engine + React UI layer

## Project Structure

```
src/
├── engine/       # Pure TypeScript game engine (no React)
├── components/   # React UI components
├── hooks/        # React hooks bridging engine ↔ UI
├── state/        # Settings store
└── services/     # API stubs for future backend
```

## License

MIT
