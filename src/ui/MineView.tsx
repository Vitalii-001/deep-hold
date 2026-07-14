import { useEffect, useRef } from 'react';
import { useGame } from '../game/store';
import { LAYERS } from '../config/layers';

// Deterministic pseudo-random in [0,1) from two integers. Used instead of
// Math.random() for anything drawn every frame (texture, boundary roughness,
// beam/torch placement) so it stays put frame-to-frame instead of flickering.
function hash2(x: number, y: number): number {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return s - Math.floor(s);
}

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

// Lighter/darker shade of a layer's configured color (factor <1 darker, >1 lighter).
function shade(hex: string, factor: number): string {
  const [r, g, b] = hexToRgb(hex);
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v * factor)));
  return `rgb(${c(r)}, ${c(g)}, ${c(b)})`;
}

const BOUNDARY_STEP = 24; // px between jag sample points on a layer boundary
const BOUNDARY_JAG = 5; // max px of roughness on a layer boundary
const TEXTURE_CELL = 14; // px per speckle grid cell (tune density here)

// Roughened y-offset for the boundary line *above* layer `layerIndex` (i.e. between
// layerIndex-1 and layerIndex), sampled at screen-x `x`. layerIndex 0 is the ground
// surface and stays flat; every other boundary gets a stable per-x jag so it reads
// as broken rock instead of a ruler-straight line.
function boundaryOffset(x: number, layerIndex: number): number {
  if (layerIndex <= 0) return 0;
  const bucket = Math.floor(x / BOUNDARY_STEP);
  return (hash2(bucket, layerIndex * 97 + 13) - 0.5) * BOUNDARY_JAG * 2;
}

function drawLayerBand(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  topBase: number,
  bottomBase: number,
  layerIndex: number,
  color: string,
) {
  if (bottomBase <= 0 || topBase >= h) return;

  // Fill the band as a polygon whose top/bottom edges are roughened per-column
  // rather than a flat rect, so layers read as rock strata, not paint chips.
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, topBase + boundaryOffset(0, layerIndex));
  for (let x = 0; x <= w; x += BOUNDARY_STEP) {
    ctx.lineTo(x, topBase + boundaryOffset(x, layerIndex));
  }
  for (let x = w; x >= 0; x -= BOUNDARY_STEP) {
    ctx.lineTo(x, bottomBase + boundaryOffset(x, layerIndex + 1));
  }
  ctx.closePath();
  ctx.fill();

  // Speckle texture: sparse grain flecks (lighter/darker shade of the layer color)
  // plus a rarer, brighter "ore fleck", on a stable grid keyed by cell+layer so it
  // never re-randomizes between frames.
  const y0 = Math.max(0, topBase);
  const y1 = Math.min(h, bottomBase);
  const startRow = Math.floor(y0 / TEXTURE_CELL);
  const endRow = Math.floor(y1 / TEXTURE_CELL);
  const endCol = Math.floor(w / TEXTURE_CELL);
  for (let row = startRow; row <= endRow; row++) {
    for (let col = 0; col <= endCol; col++) {
      const pick = hash2(col, row + layerIndex * 733);
      if (pick > 0.16) continue; // ~16% of cells get a speckle
      const py = row * TEXTURE_CELL + hash2(col * 5 + 2, row * 11 + 9) * TEXTURE_CELL;
      if (py < y0 || py > y1) continue;
      const px = col * TEXTURE_CELL + hash2(col * 3 + 1, row * 7 + 5) * TEXTURE_CELL;
      const isOreFleck = pick < 0.03; // rarer, brighter fleck
      const lightness = hash2(col, row) > 0.5 ? 1.35 : 0.6;
      ctx.fillStyle = isOreFleck ? shade(color, 1.8) : shade(color, lightness);
      const size = isOreFleck ? 2 : 1;
      ctx.fillRect(px, py, size, size);
    }
  }
}

function drawShaft(ctx: CanvasRenderingContext2D, t: number, shaftX: number, shaftW: number, bottomY: number) {
  ctx.fillStyle = '#0d0a07';
  ctx.fillRect(shaftX, 0, shaftW, bottomY);

  // Support beams: horizontal ticks poking out of the shaft walls at regular intervals.
  ctx.strokeStyle = '#5a4530';
  ctx.lineWidth = 2;
  const beamSpacing = 32;
  for (let y = beamSpacing; y < bottomY; y += beamSpacing) {
    ctx.beginPath();
    ctx.moveTo(shaftX - 6, y);
    ctx.lineTo(shaftX, y);
    ctx.moveTo(shaftX + shaftW, y);
    ctx.lineTo(shaftX + shaftW + 6, y);
    ctx.stroke();
  }

  // Torches: small flickering accent-colored glows, alternating sides.
  const torchSpacing = 90;
  for (let y = 45; y < bottomY; y += torchSpacing) {
    const leftSide = Math.floor(y / torchSpacing) % 2 === 0;
    const tx = leftSide ? shaftX - 4 : shaftX + shaftW + 4;
    const flicker = 0.65 + 0.35 * Math.sin(t / 140 + y);
    ctx.fillStyle = `rgba(212, 160, 23, ${flicker * 0.3})`;
    ctx.beginPath();
    ctx.arc(tx, y, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = `rgba(212, 160, 23, ${flicker})`;
    ctx.beginPath();
    ctx.arc(tx, y, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawMiners(ctx: CanvasRenderingContext2D, t: number, count: number, shaftX: number, floorY: number) {
  const n = Math.min(count, 16);
  for (let i = 0; i < n; i++) {
    const col = i % 4;
    const row = Math.floor(i / 4);
    const dx = shaftX + 4 + col * 5;
    const dy = floorY - 8 - row * 7;
    if (dy < 0) continue;
    const bob = Math.sin(t / 300 + i * 1.7) * 1;

    // Body: tunic + beard/head, small pixel-dwarf.
    ctx.fillStyle = '#c9903a';
    ctx.fillRect(dx, dy + bob, 3, 4);
    ctx.fillStyle = '#e8dcc8';
    ctx.fillRect(dx, dy - 2 + bob, 3, 2);

    // Pickaxe swing: slow raise, fast strike (two-phase cycle) so it reads as
    // a chop rather than a smooth idle wobble.
    const cycle = ((t / 450 + i * 0.6) % 1 + 1) % 1;
    const angle = cycle < 0.6 ? -0.3 - (cycle / 0.6) * 0.9 : -1.2 + ((cycle - 0.6) / 0.4) * 1.6;
    const pivotX = dx + 3;
    const pivotY = dy + 1 + bob;
    const len = 5;
    ctx.strokeStyle = '#8a8a8a';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pivotX, pivotY);
    ctx.lineTo(pivotX + Math.sin(angle) * len, pivotY - Math.cos(angle) * len);
    ctx.stroke();
  }
}

export function MineView() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current!;
    const ctx = canvas.getContext('2d')!;
    let raf = 0;

    const draw = (t: number) => {
      const s = useGame.getState();
      const dpr = window.devicePixelRatio || 1;
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(h * dpr);
      }

      // Cave-in shake: short decaying jitter pulses repeating for the whole
      // stun window, so the event stays obvious without being a smooth pan.
      let shakeX = 0;
      let shakeY = 0;
      if (s.caveInUntil > Date.now()) {
        const pulsePeriod = 900;
        const cyclePos = (t % pulsePeriod) / pulsePeriod;
        const envelope = (1 - cyclePos) ** 2;
        const amp = 3.5 * envelope;
        shakeX = (hash2(Math.floor(t / 40), 11) - 0.5) * 2 * amp;
        shakeY = (hash2(Math.floor(t / 40), 22) - 0.5) * 2 * amp;
      }
      ctx.setTransform(dpr, 0, 0, dpr, shakeX * dpr, shakeY * dpr);
      ctx.clearRect(-10, -10, w + 20, h + 20);

      const viewDepth = Math.max(s.depth * 1.25, 60); // meters visible
      const yOf = (m: number) => (m / viewDepth) * h;

      // layer bands (textured, roughened boundaries)
      for (let i = 0; i < LAYERS.length; i++) {
        const topBase = yOf(LAYERS[i].depth);
        if (topBase > h) break;
        const bottomBase = i + 1 < LAYERS.length ? Math.min(yOf(LAYERS[i + 1].depth), h) : h;
        drawLayerBand(ctx, w, h, topBase, bottomBase, i, LAYERS[i].color);
      }

      // shaft
      const shaftX = w / 2 - 12;
      const shaftW = 24;
      const shaftBottomY = yOf(s.depth);
      drawShaft(ctx, t, shaftX, shaftW, shaftBottomY);
      drawMiners(ctx, t, s.workers.miner, shaftX, shaftBottomY);

      // depth line + label
      ctx.strokeStyle = '#e8dcc8';
      ctx.beginPath();
      ctx.moveTo(0, shaftBottomY);
      ctx.lineTo(w, shaftBottomY);
      ctx.stroke();
      ctx.fillStyle = '#e8dcc8';
      ctx.font = '12px monospace';
      ctx.fillText(`${Math.floor(s.depth)} m`, 6, Math.max(12, shaftBottomY - 4));

      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, []);

  return <canvas ref={ref} className="mine-view" />;
}
