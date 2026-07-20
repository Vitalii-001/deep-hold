# Cart courier (haul cycle) — design

Date: 2026-07-19. Status: approved by owner (chat, 2026-07-19).
Replaces the decorative looping cart from MINE_SCREEN.md Pass 1 §4 with a real
delivery mechanic: mining income is credited only when the cart hauls it up to
the Mine Shaft.

## Owner decisions

1. **No capacity limit** — the cart takes the whole accumulated buffer each
   run; this is pure delivery latency, long-run rates are unchanged.
2. **Trip time capped + Mine Shaft boost** — deeper digs mean longer hauls,
   clamped so late game never waits minutes; each Mine Shaft building level
   speeds the cart up (the building gains visible meaning).

## Mechanics

- Mining output (stone + layer secondaries) accrues into `cartBuffer`
  (`Cost` on GameState) instead of `resources`. Everything else — brewing,
  smelting, chunk clicks, Rally, survey caches, order/charter rewards — stays
  instant.
- Cart state machine, advanced inside the tick pipeline by `dt`:
  `loading` (loadSec at the face; departs only if the buffer holds ≥ 1 total,
  otherwise idles) → `up` (tripSec) → `unloading` (unloadSec; **the on-board
  load is credited to resources here**) → `down` (tripSec × downMult) →
  `loading` again. Departure takes the entire buffer as `load`; anything mined
  during the trip waits for the next run.
- `tripSec = clamp(depth / (speedMps × (1 + shaftSpeedPerLevel × mineShaft)),
  minTripSec, maxTripSec)`; depth is frozen at departure (`tripDepth`).
- Timers are stored as **remaining seconds** (`phaseLeftSec`), decremented by
  `dt` — immune to the offline `playedSec` restore, works with any tick size
  (the machine loops phases when one `dt` spans several).
- `cart.lastDelivery` keeps the most recent delivered batch (new object per
  delivery) — the UI watches it for "+N" feedback at the shaft mouth.

## Config (`BALANCE.cart`)

`loadSec: 2, unloadSec: 1.5, speedMps: 12, downMult: 0.6, minTripSec: 4,
maxTripSec: 40, shaftSpeedPerLevel: 0.15`.

## Save / offline

- `cartBuffer` + `cart` are persisted; both have safe defaults, so the
  existing initialState merge covers old saves — no migration, no version bump.
- Offline reuses the same tick pipeline, so the machine keeps cycling and the
  summary's `gained` naturally counts only delivered resources; in-flight
  buffer survives in the save and arrives after the player returns.

## Code

| File | Change |
|---|---|
| `src/config/balance.ts` | + `cart` section |
| `src/game/types.ts` | `CartPhase`, `CartState`; GameState += `cartBuffer`, `cart` |
| `src/game/cart.ts` | new — `cartTripSec(depth, shaftLevel)`, `advanceCart(cart, buffer, dt, depth, shaftLevel)` → `{ cart, buffer, delivered }` (pure, loop-safe for large dt) |
| `src/game/cart.test.ts` | new — phase transitions, idle-when-empty, delivery credit, multi-cycle catch-up on big dt, trip clamp + shaft boost |
| `src/game/systems/context.ts` | ctx += `cartBuffer`, `cart`; finalize carries them |
| `src/game/systems/mining.ts` | mined output → `ctx.cartBuffer` |
| `src/game/systems/cart.ts` | new system after dig: runs `advanceCart`, credits deliveries into `ctx.resources` |
| `src/game/tick.ts` | pipeline += cart system |
| `src/game/store.ts` | initialState += `cartBuffer: {}`, idle `cart` |
| `src/ui/mine/MineCartLayer.tsx` | new — drawn SVG cart (~46×34) riding the painted pipe (right side of the shaft), CSS `transition: top` per phase, pile of the trip layer's resource grows on load / dumps on unload, "+N" floats on `lastDelivery` |
| `src/ui/mine/MineActivityLayer.tsx` | − old `.mine-cart-track` block (emoji cart + queue piles); bottleneck hint tags stay |
| `src/ui/MineWorld.tsx` | mount `<MineCartLayer />` |
| `src/styles.css` | `.mine-cart-layer`, cart/pile/phase classes, remove old `.mine-cart` loop styles |
| tests | tick/economy/offline/save expectations updated for buffered mining income |

## Visual

The cart is a side-view wooden mine cart with metal bands and two wheels,
drawn inline-SVG (RockChunkIcon style). Its pile recolors per the trip layer's
`chunkResource`. Loading: pile scales up over loadSec; up: full pile; unload:
pile scales down, "+N icon" float at the top; down: empty cart, faster.
Motion is CSS `transition: top` with the phase duration — no rAF. After a
mid-phase reload the first leg's duration uses the restored `phaseLeftSec`
(small desync acceptable). Respects reduced-motion (no transition — cart jumps).

## Out of scope

Cart capacity/upgrades, multiple carts, offline delivery events in the
summary list, WebP cart art (ART_CONTRACT later), changes to bottleneck
forecast copy.
