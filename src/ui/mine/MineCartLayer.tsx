import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { useGame } from '../../game/store';
import { cartTripSec } from '../../game/cart';
import { chunkResource } from '../../game/mineInteractions';
import { layerAtDepth } from '../../config/layers';
import { BALANCE } from '../../config/balance';
import { formatNumber } from '../../game/format';
import { PX_PER_M } from './mineScale';
import type { ResourceId } from '../../game/types';

// Haul-cycle cart visual (spec 2026-07-19-cart-courier-design.md). The cart
// rides the painted pipe on the right side of the shaft: loads at the dig
// face, climbs to the shaft mouth, dumps (that's when resources arrive), and
// drops back down. Motion is a single CSS `transition: top` whose duration is
// the phase length from the store — no rAF, no per-tick re-renders.

const RESOURCE_ICON: Record<string, string> = { stone: '🪨', ore: '🟤', gold: '🪙', gem: '💎' };
const PILE_FILL: Record<string, [string, string]> = {
  stone: ['#9c968c', '#b3ada2'],
  ore: ['#c77b3a', '#d98f4d'],
  gold: ['#e2b93b', '#f4d76a'],
  gem: ['#9a6cc4', '#b78fe0'],
};
const TOP_STOP_PX = 22; // shaft mouth: where the cart parks to unload

function CartSprite({ resource }: { resource: ResourceId }) {
  const [dark, light] = PILE_FILL[resource] ?? PILE_FILL.stone;
  return (
    <svg viewBox="0 0 46 34" className="cart-svg" aria-hidden="true">
      {/* ore pile — scales up while loading, dumps on unload */}
      <g className="cart-pile">
        <ellipse cx="15" cy="11" rx="7" ry="5" fill={dark} />
        <ellipse cx="30" cy="10.5" rx="7.5" ry="5.5" fill={dark} />
        <ellipse cx="22" cy="8" rx="8" ry="5.5" fill={light} />
        <circle cx="12" cy="8" r="2.6" fill={light} />
        <circle cx="33" cy="7.5" r="2.4" fill={light} />
      </g>
      {/* wooden body with metal bands */}
      <path d="M3 12 L43 12 L39 27 L7 27 Z" fill="#8a5a34" stroke="#4a3524" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M5.5 16.5 h35 M6.8 21.5 h32.4" stroke="#6b4527" strokeWidth="1.6" />
      <rect x="1.5" y="10.5" width="43" height="3.4" rx="1.7" fill="#5e4a3a" stroke="#3a2c20" strokeWidth="1" />
      {/* wheels */}
      <circle cx="14" cy="29.5" r="4" fill="#4a443e" stroke="#2c2723" strokeWidth="1.4" />
      <circle cx="32" cy="29.5" r="4" fill="#4a443e" stroke="#2c2723" strokeWidth="1.4" />
      <circle cx="14" cy="29.5" r="1.3" fill="#8b8378" />
      <circle cx="32" cy="29.5" r="1.3" fill="#8b8378" />
    </svg>
  );
}

interface FloatText {
  id: number;
  text: string;
}

let uid = 0;

export function MineCartLayer() {
  const phase = useGame((s) => s.cart.phase);
  const tripDepth = useGame((s) => s.cart.tripDepth);
  const lastDelivery = useGame((s) => s.cart.lastDelivery);
  const shaftLevel = useGame((s) => s.buildings.mineShaft);
  const depthQ = useGame((s) => Math.floor(s.depth * 2) / 2);
  const anyMiners = useGame((s) => s.workers.miner > 0);
  // true once the buffer holds a haulable amount — drives the loading pile
  const bufferReady = useGame(
    (s) => Object.values(s.cartBuffer).reduce((a, b) => a + b, 0) >= 1,
  );
  const [floats, setFloats] = useState<FloatText[]>([]);

  // Mid-phase reload: the first up/down leg should take the restored
  // remainder, not the full trip, or the sprite lags the simulation.
  const initialLeftSec = useRef(useGame.getState().cart.phaseLeftSec);
  const initialPhase = useRef(phase);
  useEffect(() => {
    if (phase !== initialPhase.current) initialPhase.current = null as never;
  }, [phase]);

  // Delivery feedback: one float per resource in the batch.
  const skippedFirstDelivery = useRef(false);
  useEffect(() => {
    if (!skippedFirstDelivery.current) {
      skippedFirstDelivery.current = true; // persisted lastDelivery from the save — not a fresh event
      return;
    }
    if (!lastDelivery) return;
    const spawns = Object.entries(lastDelivery)
      .filter(([, v]) => (v as number) >= 1)
      .map(([rid, v]) => ({
        id: ++uid,
        text: `+${formatNumber(Math.floor(v as number))} ${RESOURCE_ICON[rid] ?? rid}`,
      }));
    if (spawns.length === 0) return;
    setFloats((cur) => [...cur, ...spawns].slice(-4)); // silent: deliveries repeat forever, a sound would grate
  }, [lastDelivery]);

  if (!anyMiners && phase === 'loading') return null; // nothing to haul yet

  // Before the Mine Shaft is built the cart visually just sits at the face
  // and fills up slowly — no rides, no top stop. The haul economy underneath
  // is unchanged; delivery feedback pops next to the parked cart instead.
  const parked = shaftLevel < 1;

  const facePx = depthQ * PX_PER_M;
  const atTop = !parked && (phase === 'up' || phase === 'unloading');
  const topPx = atTop ? TOP_STOP_PX : facePx;

  const fullTrip = cartTripSec(tripDepth, shaftLevel);
  let durSec = 0.4; // loading/unloading: tiny settle only
  if (!parked && phase === 'up') durSec = fullTrip;
  if (!parked && phase === 'down') durSec = fullTrip * BALANCE.cart.downMult;
  if (!parked && phase === initialPhase.current && (phase === 'up' || phase === 'down')) {
    durSec = initialLeftSec.current; // resume mid-leg after reload
  }

  // Pile: grows during loading, full in flight, dumps at the top, absent down.
  // Parked carts fill at roughly a third of the pace — a lazy early-game heap.
  const loading = phase === 'loading' && bufferReady;
  const pileState =
    phase === 'up' ? 'full' : loading ? 'grow' : phase === 'unloading' ? 'dump' : 'empty';
  const loadAnimSec = BALANCE.cart.loadSec * (parked ? 3 : 1);
  const resource = chunkResource(layerAtDepth(phase === 'loading' ? depthQ : tripDepth));
  const floatTopPx = parked ? facePx - 44 : TOP_STOP_PX + 4;

  return (
    <div className="mine-cart-layer" aria-hidden="true">
      <div
        className={`mine-cart-rig cart-pile--${pileState} ${parked ? 'cart-parked' : ''}`}
        style={
          {
            top: topPx,
            transitionDuration: `${durSec}s`,
            '--load-sec': `${loadAnimSec}s`,
            '--unload-sec': `${BALANCE.cart.unloadSec}s`,
          } as CSSProperties
        }
      >
        <CartSprite resource={resource} />
      </div>
      {floats.map((f, i) => (
        <span
          key={f.id}
          className="mine-floating-text cart-float"
          style={{ top: floatTopPx + i * 14 }}
          onAnimationEnd={() => setFloats((cur) => cur.filter((x) => x.id !== f.id))}
        >
          {f.text}
        </span>
      ))}
    </div>
  );
}
