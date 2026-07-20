# Deep Hold Art Asset Contract

Reference: `docs/design/proof_design_1.png`.

All raster assets should use the light-cartoon direction from the Phase 1 shell
spec. Deliver WebP at 2x display size unless noted otherwise. Transparent
backgrounds are expected for characters, buildings, UI details, and icons.
Depth-layer strips may be opaque and tileable.

## Characters

Idle pose, crop-safe, about 128 x 128 display pixels.

- `src/assets/characters/miner.webp`
- `src/assets/characters/smith.webp`
- `src/assets/characters/brewer.webp`
- `src/assets/characters/scout.webp`
- `src/assets/characters/king.webp`

## Surface world (delivered)

- `src/assets/world/surface/surface_bg_day.webp` — full surface scene, non-clickable background of the surface strip.
- `src/assets/buildings/kings-hall.webp` — clickable surface sprite (transparent bg).
- `src/assets/buildings/mine-entrance.webp` — clickable surface sprite, aligned with the shaft (transparent bg).
- `src/assets/buildings/king_hall_bg.webp` — King's Hall modal interior.

Future surface sprites use the same pattern (transparent WebP, placed absolutely
inside `.surface-strip`; reserved `.surface-slot` markers show where).

## Buildings

About 160 x 120 display pixels.

- `src/assets/buildings/mine-shaft.webp`
- `src/assets/buildings/brewery.webp`
- `src/assets/buildings/smelter.webp`
- `src/assets/buildings/forge.webp`
- `src/assets/buildings/great-hall.webp`
- `src/assets/buildings/temple.webp`

## Depth Layers

Tileable horizontally, about 800 x 300 display pixels.

- `src/assets/layers/topsoil.webp`
- `src/assets/layers/stone.webp`
- `src/assets/layers/iron-veins.webp`
- `src/assets/layers/gold-seams.webp`
- `src/assets/layers/gem-hollows.webp`
- `src/assets/layers/ancient-ruins.webp`

## UI

- `src/assets/ui/panel-border.webp`
- `src/assets/icons/atlas.webp`
- `src/assets/icons/atlas.json`

The icon atlas should include 64 x 64 cells for: stone, ore, ingot, gold, gem,
ale, pickaxe, anvil, barrel, spyglass, chest, scroll, star, shield, coin, and
hourglass.

## Finds (collectible items — NEW_FEATURES.md §1)

Currently drawn as placeholders by `src/ui/mine/FindIcon.tsx`: four shapes
(`fossil` / `crystal` / `tool` / `relic`) tinted by rarity (common grey / rare
blue / legendary gold). Final art is optional but, if made, deliver per-item
cells in the icon atlas keyed `find_<id>` (ids in `src/config/finds.ts`), 64×64,
transparent. Also `seal_gold` (set-complete ribbon) and the tab icon lives at
`src/assets/icons/collection.svg` (already present).

Finds appear at ~30 px in the shaft (drop pop) and ~40 px in the Collection
tab. Until atlas cells exist, `FindIcon.tsx` covers every item.

## Delivery Notes

- Match the warm parchment, wood, and gold palette from
  `docs/superpowers/specs/2026-07-13-cartoon-ui-phase1-shell-design.md`.
- Keep the total added raster asset budget under about 2 MB so the final build
  stays comfortably below the 5 MB cap.
- Current emoji, SVG, and CSS-gradient placeholders are temporary. Matching the
  paths above should let the game swap in final art with minimal code changes.
