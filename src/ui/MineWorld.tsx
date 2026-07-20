import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useGame } from '../game/store';
import { LAYERS } from '../config/layers';
import { useMineCamera } from './mineCamera';
import { PX_PER_M } from './mine/mineScale';
import { MineActivityLayer } from './mine/MineActivityLayer';
import { MineChunks } from './mine/MineChunks';
import { MineCartLayer } from './mine/MineCartLayer';

// DOM-based mine cross-section (replaces the old canvas MineView). Fixed scale:
// 1 meter = PX_PER_M pixels (см. mine/mineScale.ts); the world block simply
// grows downward as the dwarves dig. The viewport scrolls natively; follow
// mode drives scrollTop.
const UNDUG_M = 30; // raw rock shown below the dig face
const MIN_WORLD_M = 110; // world never shorter than the frame — no bare void below

// mine_bg.webp (914×941, tiled at 100% width / auto height) draws four wooden
// cross-beams per tile. DOM floors are invisible anchors laid exactly on those
// painted beams (so future workers can stand "on" them); these fractions are
// the beam centers measured in the texture.
const BG_TILE_RATIO = 941 / 914; // tile height = shaft width × this
const BEAM_FRACTIONS = [0.218, 0.479, 0.74, 0.997];

function followTop(el: HTMLElement, depth: number): number {
  return Math.max(0, depth * PX_PER_M - el.clientHeight * 0.72);
}

export function MineWorld() {
  const viewportRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<number | null>(null);
  // 0.5 m granularity: ~3 px steps — visually smooth at this scale without
  // re-rendering the world on every 100 ms tick.
  const depth = useGame((s) => Math.floor(s.depth * 2) / 2);
  const followReq = useMineCamera((c) => c.followReq);
  const surfaceReq = useMineCamera((c) => c.surfaceReq);

  const worldM = Math.max(depth + UNDUG_M, MIN_WORLD_M);
  const worldPx = worldM * PX_PER_M;

  // Beam anchors need the rendered shaft width — the bg tile scales with it.
  const shaftRef = useRef<HTMLDivElement>(null);
  const [shaftW, setShaftW] = useState(0);
  useEffect(() => {
    const el = shaftRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setShaftW(el.clientWidth));
    ro.observe(el);
    setShaftW(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  // Floor anchors in px, one per painted beam, stopping short of the dig face.
  const floorsPx = useMemo(() => {
    if (shaftW <= 0) return [];
    const tileH = shaftW * BG_TILE_RATIO;
    const maxY = depth * PX_PER_M - 24;
    const out: number[] = [];
    for (let k = 0; ; k += 1) {
      for (const f of BEAM_FRACTIONS) {
        const y = (k + f) * tileH;
        if (y > maxY) return out;
        out.push(y);
      }
    }
  }, [shaftW, depth]);

  const cancelAnim = useCallback(() => {
    if (animRef.current !== null) {
      cancelAnimationFrame(animRef.current);
      animRef.current = null;
    }
  }, []);

  // Animated scroll for the Follow / Surface buttons: ease-in (cubic) so it
  // starts slow and accelerates. Duration scales with distance (capped).
  const animateScrollTo = useCallback(
    (target: number) => {
      const el = viewportRef.current;
      if (!el) return;
      cancelAnim();
      const start = el.scrollTop;
      const dist = target - start;
      if (Math.abs(dist) < 1) {
        el.scrollTop = target;
        return;
      }
      const duration = Math.min(900, Math.max(320, Math.abs(dist) * 0.45));
      const t0 = performance.now();
      const step = (now: number) => {
        const p = Math.min(1, (now - t0) / duration);
        const eased = p * p * p; // ease-in: slow -> fast
        el.scrollTop = start + dist * eased;
        animRef.current = p < 1 ? requestAnimationFrame(step) : null;
      };
      animRef.current = requestAnimationFrame(step);
    },
    [cancelAnim],
  );

  // Continuous follow: pin the dig face while digging (instant, small steps).
  // Skipped while a Follow/Surface animation is mid-flight.
  useEffect(() => {
    if (animRef.current !== null) return;
    if (!useMineCamera.getState().followDepth) return;
    const el = viewportRef.current;
    if (el) el.scrollTop = followTop(el, depth);
  }, [depth]);

  // Follow button: animated re-centre on the dig face.
  useEffect(() => {
    if (followReq === 0) return;
    const el = viewportRef.current;
    if (el) animateScrollTo(followTop(el, depth));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [followReq]);

  // Surface button: animated scroll to the top.
  useEffect(() => {
    if (surfaceReq === 0) return;
    animateScrollTo(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [surfaceReq]);

  // Any manual grab of the viewport cancels the animation and breaks follow.
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const grab = () => {
      cancelAnim();
      useMineCamera.getState().breakFollow();
    };
    el.addEventListener('wheel', grab, { passive: true });
    el.addEventListener('pointerdown', grab);
    return () => {
      cancelAnim();
      el.removeEventListener('wheel', grab);
      el.removeEventListener('pointerdown', grab);
    };
  }, [cancelAnim]);

  return (
    <div className="mine-viewport" ref={viewportRef}>
      <div className="mine-world" style={{ height: worldPx }}>
        {/* geological layer bands (from config — no hardcoded depths) */}
        {LAYERS.map((l, i) => {
          const next = LAYERS[i + 1];
          const topPx = l.depth * PX_PER_M;
          const bottomPx = Math.min(next ? next.depth * PX_PER_M : worldPx, worldPx);
          if (topPx >= worldPx) return null;
          return (
            <div
              key={l.id}
              className={`mine-layer layer-${l.id}`}
              style={{ top: topPx, height: bottomPx - topPx }}
            />
          );
        })}

        {/* excavated shaft interior: the tiled art draws the beams/ladders/
            lanterns; .shaft-floor divs are invisible anchors on the painted
            beams for placing workers later */}
        <div className="shaft-interior" ref={shaftRef} style={{ height: depth * PX_PER_M }}>
          {floorsPx.map((y) => (
            <div key={y} className="shaft-floor" style={{ top: y }} />
          ))}
        </div>

        {/* active dig face */}
        <MineActivityLayer />

        {/* clickable wall deposits (world-anchored, not face-anchored) */}
        <MineChunks />

        {/* haul-cycle cart riding the painted pipe */}
        <MineCartLayer />

        <div className="dig-face" style={{ top: depth * PX_PER_M }}>
          <span className="dig-face-label">{Math.floor(depth)} m</span>
        </div>

        {/* depth ruler: layer boundaries + the scroll shows where you are */}
        <div className="mine-ruler">
          {LAYERS.filter((l) => l.depth > 0 && l.depth * PX_PER_M < worldPx).map((l) => (
            <span key={l.id} className="ruler-tick" style={{ top: l.depth * PX_PER_M }}>
              {l.depth} m
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
