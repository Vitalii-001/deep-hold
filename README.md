# Deep Hold

*You are the king of the dwarves. Dig deep, build your empire, brew ale — and don't
wake what sleeps at the bottom.*

An HTML5 idle/incremental game built for web portals (itch.io → CrazyGames).

## Development

- `npm run dev` — dev server
- `npm run test` — unit tests (Vitest)
- `npm run build` — typecheck + production build (`dist/`, must stay < 5 MB)
- `npm run preview` — serve the production build

## Architecture

Pure simulation core (`src/game/tick.ts`) + Zustand store + thin React UI.
Offline progress re-runs the same simulation in 60-second chunks.

**All balance lives in `src/config/`** — tuning the game means editing those files only.

## Icons

From [game-icons.net](https://game-icons.net) (CC BY 3.0) — see `CREDITS.md`.
