import { useEffect, useState, type CSSProperties } from 'react';
import { useGame } from '../../game/store';
import { useUiSettings } from '../uiSettings';
import { chunkResource, hotspotLabel, rollChunkClicks } from '../../game/mineInteractions';
import { chunkMaxActiveBonus } from '../../game/layerFeatures';
import { BALANCE } from '../../config/balance';
import { layerAtDepth } from '../../config/layers';
import { formatNumber } from '../../game/format';
import { PX_PER_M } from './mineScale';
import { RockChunkIcon } from './RockChunkIcon';
import { FindIcon } from './FindIcon';
import { sfx } from '../sfx';
import { useUi } from '../uiStore';
import type { FindConfig } from '../../config/finds';
import type { ResourceId } from '../../game/types';

// Rock chunks embedded in the shaft walls (Mr.-Mine-style, spec
// 2026-07-19-rock-chunks-design.md). World-anchored — a chunk sits at a fixed
// depth and does NOT ride along with the dig face. Purely visual state lives
// here (React local, not saved); every reward is rolled by the store.

const RESOURCE_ICON: Record<string, string> = { stone: '🪨', ore: '🟤', gold: '🪙', gem: '💎' };

interface Chunk {
  id: number;
  depthM: number;
  side: 'left' | 'right';
  layerId: string;
  resource: ResourceId;
  label: string;
  clicksLeft: number;
  totalClicks: number;
  bornAt: number;
}

interface FloatText {
  id: number;
  text: string;
  topPx: number;
  side: 'left' | 'right';
}

interface FindPop {
  id: number;
  find: FindConfig;
  topPx: number;
  side: 'left' | 'right';
}

let uid = 0;

function rollDelaySec(): number {
  const cfg = BALANCE.mineInteractions;
  return cfg.cooldownSecMin + Math.random() * (cfg.cooldownSecMax - cfg.cooldownSecMin);
}

export function MineChunks() {
  const active = useGame((s) => s.workers.miner >= 1);
  const particlesEnabled = useUiSettings((u) => u.particlesEnabled);
  const pushToast = useUi((u) => u.pushToast);
  const [chunks, setChunks] = useState<Chunk[]>([]);
  const [floats, setFloats] = useState<FloatText[]>([]);
  const [finds, setFinds] = useState<FindPop[]>([]);

  // One 1 s housekeeping interval: expiry sweep + spawn countdown. Chained
  // timers per chunk would work too, but a single ticker is easier to clean up.
  useEffect(() => {
    if (!active) {
      setChunks([]);
      return;
    }
    const cfg = BALANCE.mineInteractions;
    let nextIn = rollDelaySec();
    const h = setInterval(() => {
      const now = Date.now();
      // Expiry never touches a chunk the player has started mining — it must
      // not vanish mid-clicking. Started chunks only leave via the last click.
      setChunks((cur) =>
        cur.filter(
          (c) => c.clicksLeft < c.totalClicks || (now - c.bornAt) / 1000 < cfg.lifetimeSec,
        ),
      );
      nextIn -= 1;
      if (nextIn > 0) return;
      nextIn = rollDelaySec();
      const depth = useGame.getState().depth;
      const maxD = depth - 2;
      if (maxD <= cfg.minDepthM) return; // shaft still too shallow for wall deposits
      const minD = Math.max(cfg.minDepthM, depth - cfg.spawnBandM);
      const depthM = minD + Math.random() * (maxD - minD);
      const layer = layerAtDepth(depthM);
      const totalClicks = rollChunkClicks();
      // Layer signature (§2): denseChunks layers (Iron) allow more at once.
      const maxActive = cfg.maxActive + chunkMaxActiveBonus(layerAtDepth(depth).id);
      setChunks((cur) =>
        cur.length >= maxActive
          ? cur
          : [
              ...cur,
              {
                id: ++uid,
                depthM,
                side: Math.random() < 0.5 ? 'left' : 'right',
                layerId: layer.id,
                resource: chunkResource(layer),
                label: hotspotLabel(layer),
                clicksLeft: totalClicks,
                totalClicks,
                bornAt: now,
              },
            ],
      );
    }, 1000);
    return () => clearInterval(h);
  }, [active]);

  const hit = (id: number) => {
    const chunk = chunks.find((c) => c.id === id);
    if (!chunk) return;
    const reward = useGame.getState().mineChunkClick(chunk.layerId, chunk.totalClicks);
    const spawns: FloatText[] = Object.entries(reward).map(([rid, v]) => ({
      id: ++uid,
      text: `+${formatNumber(v as number)} ${RESOURCE_ICON[rid] ?? rid}`,
      topPx: chunk.depthM * PX_PER_M - 10,
      side: chunk.side,
    }));
    setFloats((cur) => [...cur, ...spawns].slice(-6));
    if (chunk.clicksLeft <= 1) {
      setChunks((cur) => cur.filter((c) => c.id !== id));
      sfx.coin();
      // A mined-out chunk sometimes yields a collectible find (§1). Rolled in
      // the store; if one drops, pop its icon here and toast the player.
      const find = useGame.getState().claimChunkFind(chunk.layerId);
      if (find) {
        pushToast(`Unearthed: ${find.name}`);
        setFinds((cur) => [
          ...cur,
          { id: ++uid, find, topPx: chunk.depthM * PX_PER_M - 28, side: chunk.side },
        ]);
      }
    } else {
      setChunks((cur) => cur.map((c) => (c.id === id ? { ...c, clicksLeft: c.clicksLeft - 1 } : c)));
      sfx.pick();
    }
  };

  return (
    <>
      {chunks.map((c) => {
        const stage = Math.min(2, Math.floor(((c.totalClicks - c.clicksLeft) / c.totalClicks) * 3));
        const wasHit = c.clicksLeft < c.totalClicks;
        return (
          <button
            key={c.id}
            type="button"
            className={`mine-chunk mine-chunk--${c.side} chunk-res-${c.resource}`}
            style={{ top: c.depthM * PX_PER_M }}
            title={c.label}
            aria-label={`${c.label} — click to mine`}
            onClick={() => hit(c.id)}
          >
            {/* keyed on clicksLeft so the hit jolt + debris replay every click */}
            <span key={c.clicksLeft} className={`chunk-body ${wasHit ? 'chunk-hit' : ''}`}>
              <RockChunkIcon resource={c.resource} stage={stage} />
              {wasHit && particlesEnabled && (
                <span className="chunk-debris" aria-hidden="true">
                  <i style={{ '--dx': '-13px', '--dy': '-9px', '--rot': '-120deg' } as CSSProperties} />
                  <i style={{ '--dx': '11px', '--dy': '-13px', '--rot': '150deg' } as CSSProperties} />
                  <i style={{ '--dx': '4px', '--dy': '-17px', '--rot': '80deg' } as CSSProperties} />
                </span>
              )}
            </span>
          </button>
        );
      })}
      {floats.map((f) => (
        <span
          key={f.id}
          className={`mine-floating-text mine-chunk-float mine-chunk-float--${f.side}`}
          style={{ top: f.topPx }}
          onAnimationEnd={() => setFloats((cur) => cur.filter((x) => x.id !== f.id))}
        >
          {f.text}
        </span>
      ))}
      {finds.map((f) => (
        <span
          key={f.id}
          className={`find-pop find-pop--${f.side}`}
          style={{ top: f.topPx }}
          onAnimationEnd={() => setFinds((cur) => cur.filter((x) => x.id !== f.id))}
          aria-hidden="true"
        >
          <span className="find-pop-glow" />
          <FindIcon category={f.find.category} rarity={f.find.rarity} />
        </span>
      ))}
    </>
  );
}
