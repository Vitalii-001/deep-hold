import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { useGame } from '../../game/store';
import { useUiSettings } from '../uiSettings';
import { getBottlenecks, getMiningForecast } from '../../game/forecast';
import { layerFeatureConfig } from '../../game/layerFeatures';
import { formatNumber } from '../../game/format';
import { DwarfFigure } from '../DwarfFigure';
import { PX_PER_M } from './mineScale';
import type { ResourceId } from '../../game/types';
import { sfx } from '../sfx';

// Mine Activity Layer (MINE_SCREEN.md Pass 1): purely visual life at the dig
// face — dwarf tokens, cart, floating resource deltas and bottleneck hints.
// (Clickable wall deposits live in mine/MineChunks.tsx.) Anchored inside
// .mine-world at the face depth; NO economy math here — everything comes from
// forecast selectors.

const FLOAT_AGGREGATE_MS = 900;
const FLOAT_CAP = 6;
const FLOAT_RESOURCES: ResourceId[] = ['stone', 'ore', 'gold', 'gem']; // mining output only (owner decision §6.3)
const RESOURCE_ICON: Record<string, string> = { stone: '🪨', ore: '🟤', gold: '🪙', gem: '💎' };

// Visual grouping: never render every worker (spec buckets).
function visualMinerCount(miners: number): number {
  if (miners <= 0) return 0;
  if (miners <= 2) return 1;
  if (miners <= 5) return 2;
  if (miners <= 10) return 3;
  return 4;
}

// Presentation mapping only (not economy): morale/method → swing cycle length.
// A full raise-and-strike takes ~1.4 s when merry — lively but not frantic.
function digSpeedSec(morale: string, methodId: string, rallying: boolean): number {
  const base = morale === 'dry' ? 3.6 : morale === 'thirsty' ? 2.2 : 1.4;
  const methodMult = methodId === 'bulk' ? 0.75 : methodId === 'selective' ? 1.25 : 1;
  return base * methodMult * (rallying ? 0.45 : 1);
}

interface FloatText {
  id: number;
  text: string;
  x: number; // % across the face area
}

let uid = 0;

export function MineActivityLayer() {
  // Coarse subscriptions only: strings/numbers that change rarely, so the
  // layer does not re-render on every 100 ms tick.
  const depthQ = useGame((s) => Math.floor(s.depth * 2) / 2);
  const miners = useGame((s) => s.workers.miner);
  const methodId = useGame((s) => s.miningMethod);
  const morale = useGame((s) => getMiningForecast(s).moraleState);
  const bottleneckId = useGame((s) => getBottlenecks(s)[0]?.id ?? null);
  const mineShaft = useGame((s) => s.buildings.mineShaft);
  const playedSecQ = useGame((s) => Math.floor(s.playedSec)); // 1s granularity for rally cooldown
  const rallyReadyAtSec = useGame((s) => s.rallyReadyAtSec);
  const particlesEnabled = useUiSettings((u) => u.particlesEnabled);

  const [floats, setFloats] = useState<FloatText[]>([]);
  const [rallying, setRallying] = useState(false);
  const prevRes = useRef<Record<string, number> | null>(null);

  // ---- floating resource deltas: aggregate over an interval, never per tick
  useEffect(() => {
    if (!particlesEnabled) return;
    const h = setInterval(() => {
      const res = useGame.getState().resources;
      if (prevRes.current === null) {
        prevRes.current = { ...res };
        return;
      }
      const spawns: FloatText[] = [];
      for (const rid of FLOAT_RESOURCES) {
        const delta = res[rid] - (prevRes.current[rid] ?? 0);
        if (delta >= 1) {
          spawns.push({
            id: ++uid,
            text: `+${formatNumber(Math.floor(delta))} ${RESOURCE_ICON[rid]}`,
            x: 12 + Math.random() * 66,
          });
        }
      }
      prevRes.current = { ...res };
      if (spawns.length > 0) {
        setFloats((cur) => [...cur, ...spawns].slice(-FLOAT_CAP));
      }
    }, FLOAT_AGGREGATE_MS);
    return () => clearInterval(h);
  }, [particlesEnabled]);

  const rally = () => {
    useGame.getState().rallyMiners();
    setRallying(true);
    setTimeout(() => setRallying(false), 1500);
    sfx.pick();
  };

  const forecast = getMiningForecast(useGame.getState()); // labels only; deps covered by depthQ/methodId
  const layerFeature = layerFeatureConfig(forecast.layer.id);
  const dwarfs = visualMinerCount(miners);
  const rallyCooling = playedSecQ < rallyReadyAtSec;
  const showRally = mineShaft < 1 && miners >= 1;
  const methodLabel = methodId === 'bulk' ? 'Bulk Rush' : forecast.method.name;
  const nextLayerProgress = forecast.nextLayer
    ? Math.min(
        100,
        ((depthQ - forecast.layer.depth) / (forecast.nextLayer.depth - forecast.layer.depth)) * 100,
      )
    : 100;

  const facePx = depthQ * PX_PER_M;

  return (
    <div
      className={`mine-activity-layer mine-method--${methodId} mine-morale--${morale} ${rallying ? 'rallying' : ''}`}
      style={
        {
          top: facePx,
          '--dig-speed': `${digSpeedSec(morale, methodId, rallying)}s`,
          '--mine-shake': methodId === 'bulk' ? '1.5px' : '0px',
          '--spark-rate': methodId === 'selective' ? '2.6s' : '1.6s',
        } as CSSProperties
      }
    >
      {/* Active work face plate */}
      <div className="mine-work-face">
        <span className="face-title">Active Face · {forecast.layer.name}</span>
        <span className="face-meta">
          {methodLabel} · Hardness: {forecast.hardnessLabel}
        </span>
        {/* Layer signature tag (§2) — this layer's twist, e.g. Rich Seams */}
        {layerFeature && (
          <span className="face-feature" title={layerFeature.tagLabel}>
            {layerFeature.tagIcon} {layerFeature.tagLabel}
          </span>
        )}
        <div className="face-progress">
          <div className="face-progress-fill" style={{ width: `${nextLayerProgress}%` }} />
        </div>
      </div>

      {/* Bottleneck hint tag (visual only, from getBottlenecks) */}
      {bottleneckId === 'aleSupport' && <span className="mine-bottleneck-hint hint-ale">🍺 Ale low</span>}
      {bottleneckId === 'haulage' && <span className="mine-bottleneck-hint hint-haulage">🛒 Cart queue</span>}
      {bottleneckId === 'processing' && <span className="mine-bottleneck-hint hint-processing">🟤 Ore backlog</span>}
      {bottleneckId === 'miningPower' && miners > 0 && (
        <span className="mine-bottleneck-hint hint-power">🧱 Hard wall</span>
      )}

      {/* Dwarf tokens at the face */}
      <div className="mine-dwarfs" aria-hidden="true">
        {Array.from({ length: dwarfs }, (_, i) => (
          <div
            key={i}
            className={`mine-dwarf mine-dwarf--${morale}`}
            style={{ '--i': i } as CSSProperties}
          >
            {morale === 'thirsty' && i === 0 && <span className="dwarf-mug">🍺</span>}
            <DwarfFigure type="miner" pose="mining" />
            {/* impact debris: rock chips + one spark, kicked out on the strike */}
            <span className="dwarf-debris" aria-hidden="true">
              <i style={{ '--dx': '12px', '--dy': '-14px', '--rot': '140deg' } as CSSProperties} />
              <i style={{ '--dx': '19px', '--dy': '-8px', '--rot': '-100deg' } as CSSProperties} />
              <i style={{ '--dx': '8px', '--dy': '-18px', '--rot': '220deg' } as CSSProperties} />
            </span>
          </div>
        ))}
        {morale === 'dry' && dwarfs > 0 && (
          <div className="mine-dwarf mine-dwarf--slump" aria-hidden="true">
            <DwarfFigure type="miner" />
          </div>
        )}
      </div>

      {/* Dust for bulk (particles setting respected) */}
      {particlesEnabled && methodId === 'bulk' && (
        <div className="mine-dust" aria-hidden="true">
          <span /> <span /> <span />
        </div>
      )}

      {/* Rally near the face (moved from MineControls; hidden after first Mine Shaft) */}
      {showRally && (
        <button
          type="button"
          className="mine-rally"
          data-hint="rally-btn"
          disabled={rallyCooling}
          onClick={rally}
        >
          {rallyCooling ? `Rally in ${Math.max(1, Math.ceil(rallyReadyAtSec - playedSecQ))}s` : '⛏ Rally!'}
        </button>
      )}

      {/* Floating resource texts */}
      {floats.map((f) => (
        <span
          key={f.id}
          className="mine-floating-text"
          style={{ left: `${f.x}%` }}
          onAnimationEnd={() => setFloats((cur) => cur.filter((x) => x.id !== f.id))}
        >
          {f.text}
        </span>
      ))}
    </div>
  );
}
