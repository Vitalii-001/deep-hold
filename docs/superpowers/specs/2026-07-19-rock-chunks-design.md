# Rock Chunks (multi-click wall deposits) — design

Date: 2026-07-19. Status: approved by owner (chat, 2026-07-19).
Replaces the single-click text hotspot from MINE_SCREEN.md Pass 1 §6.

## What

Mr.-Mine-style clickable deposits embedded in the shaft walls. A chunk is a
drawn 30×30 SVG icon (per resource: stone / ore / gold / gem), gently pulsing
with a soft glow. The player clicks it 3–5 times; every click plays a hit
animation, advances a visible damage stage (cracks grow) and pays a small
resource drip. The final click destroys the chunk with debris.

## Owner decisions

1. **Reward per click** — each click pays a small amount immediately (floating
   text per click); no end-only payout.
2. **Long-lived, up to 3 concurrent** — a chunk lives ~50 s if not mined out;
   up to `maxActive: 3` chunks at different depths.
3. **Spawn near the face** — random depth within ~70 m above the dig face
   (≥ 4 m below surface), left or right shaft wall. The chunk's resource comes
   from the layer at *its* depth (`layerAtDepth`), not the face layer.

## Mechanics

- Spawn cadence: existing `cooldownSecMin..Max` (10–18 s) while `miners ≥ 1`
  and fewer than `maxActive` chunks are up.
- Clicks per chunk: random int in `clicksMin..clicksMax` (3–5), rolled at spawn.
- Per-click reward: the old hotspot budget (seconds of mining output, clamped
  to `[rewardMinStone, rewardMaxStone]`) divided by the chunk's total clicks,
  min 1 stone; with `secondaryChance`, a pinch of the chunk layer's rarest
  secondary resource (capped by `secondaryCapMult`). All rolled in the store —
  the UI never passes amounts; layer/clicks args are clamped server-side
  (`mineChunkClick` clamps totalClicks into config range, unknown layer ids
  fall back to the face layer).
- Not persisted, no offline mining; reload clears chunks (same as before).

## Code

| File | Change |
|---|---|
| `src/config/balance.ts` | `mineInteractions` += `clicksMin: 3, clicksMax: 5, maxActive: 3, spawnBandM: 70, minDepthM: 4`; `lifetimeSec` 7 → 50 |
| `src/game/mineInteractions.ts` | `chunkResource(layer)`, `rollChunkClicks(rng)`, `rollChunkClickReward(s, layer, totalClicks, rng)` (replaces `rollHotspotReward`); `hotspotLabel` stays for tooltip copy |
| `src/game/store.ts` | `claimMineHotspot` → `mineChunkClick(layerId, totalClicks, rng?)` returning the per-click `Cost` |
| `src/ui/mine/RockChunkIcon.tsx` | new — 30×30 inline SVG per resource with damage stages 0–2 (crack overlays) |
| `src/ui/mine/MineChunks.tsx` | new — world-anchored layer inside `.mine-world`: local chunk state, 1 s housekeeping interval (spawn countdown + expiry), click handling, own floating texts |
| `src/ui/mine/MineActivityLayer.tsx` | remove old hotspot state/effect/button |
| `src/ui/MineWorld.tsx` | mount `<MineChunks />` |
| `src/styles.css` | `.mine-chunk` (44 px hit zone, pulse glow, hit jolt, debris, damage), replaces `.mine-hotspot`; reduced-motion + particlesEnabled respected |

Visual state stays React-local (no GameState fields, no migration), decorative
animation stays CSS-keyframes-only — same rules as the rest of Pass 1.

## Out of scope

Persistence/offline for chunks, spawn anywhere along the shaft, WebP art
(SVG placeholders follow ART_CONTRACT later), sounds beyond existing sfx.
