# Browser FPS Aim Trainer

A browser-based FPS aim trainer built with TypeScript, React, and Vite. Features a clean architecture with the game engine completely separated from the UI layer.

## Architecture

```
/src
  /engine          — Pure TypeScript, zero React imports
    Camera.ts      — Yaw/pitch state, CS-accurate sensitivity math
    Projection.ts  — FOV-based angular-to-screen projection
    TargetManager.ts — Target spawning/despawning
    HitDetection.ts  — Click-to-hit logic
    GameLoop.ts      — requestAnimationFrame loop
    types.ts         — Shared interfaces (EngineConfig, Target, SessionStats)
  /components      — React UI components
    GameCanvas.tsx   — Canvas wrapper, owns GameLoop instance
    SettingsPanel.tsx — Sensitivity, DPI, FOV controls
    StatsOverlay.tsx  — Live stats display
  /hooks
    useGameEngine.ts — Bridges engine lifecycle to React
  /state
    settingsStore.ts — Settings persistence (localStorage)
  /services
    scoreService.ts  — Score/leaderboard stubs (ready for backend)
```

## Key Design Decisions

- **Engine isolation**: The `/engine` folder has zero React imports and can be tested or ported independently
- **60fps loop outside React**: Game loop runs via `requestAnimationFrame`, stored in `useRef`, never triggers React re-renders
- **Pointer Lock + CS sensitivity**: Uses the `m_yaw = 0.022` constant for Counter-Strike-accurate mouse feel
- **FOV-based projection**: Canvas 2D rendering with proper angular projection, no 3D libraries
- **Type-first design**: All engine types (`EngineConfig`, `SessionStats`, etc.) are serializable for future backend integration

## Running

```bash
npm install
npm run dev
```

## Controls

- **Click** to start/resume
- **Mouse movement** to aim (pointer lock)
- **Click** to shoot
- **ESC** to pause
- **Settings** button for sensitivity/DPI/FOV configuration

## Sensitivity Math

Uses Counter-Strike's m_yaw constant:
```
degrees = mouseMovement * sensitivity * 0.022
```

The settings panel shows `cm/360` for precise matching with other games.

## Future Expansion

The architecture supports:
- Multiple game modes (via GameLoop configuration)
- Accounts/authentication (swap localStorage in settingsStore)
- Leaderboards (implement real API calls in /services)
- Custom targets/scenarios (extend TargetManager)
