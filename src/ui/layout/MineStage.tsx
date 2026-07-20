import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { MineWorld } from '../MineWorld';
import { MineControls } from '../MineControls';
import { DwarfFigure } from '../DwarfFigure';
import { useGame } from '../../game/store';
import { isStriking } from '../../game/economy';
import { useUi } from '../uiStore';
import { useMineCamera } from '../mineCamera';
import kingsHallSprite from '../../assets/buildings/kings-hall.webp';
import mineEntranceSprite from '../../assets/buildings/mine-entrance.webp';
import mineShaftSprite from '../../assets/buildings/mine-shaft.webp';

// Strike picketers — a mixed crowd of miners and brewers. `x` is the picket
// offset (px) from the mine entrance.
const PICKETERS = [
  { type: 'miner', x: -78 },
  { type: 'brewer', x: -37 },
  { type: 'miner', x: 37 },
  { type: 'brewer', x: 80 },
] as const;

// Flying bricks + wood chips for the mine-shaft construction burst.
const DEBRIS = [
  { dx: -26, dy: -24, rot: -150, kind: 'brick' },
  { dx: 24, dy: -30, rot: 160, kind: 'chip' },
  { dx: -36, dy: -10, rot: -90, kind: 'chip' },
  { dx: 34, dy: -14, rot: 130, kind: 'brick' },
  { dx: -14, dy: -36, rot: -210, kind: 'chip' },
  { dx: 16, dy: -38, rot: 190, kind: 'brick' },
  { dx: -6, dy: -30, rot: 70, kind: 'chip' },
  { dx: 10, dy: -22, rot: -70, kind: 'brick' },
  { dx: -40, dy: -18, rot: -170, kind: 'chip' },
  { dx: 32, dy: -24, rot: 210, kind: 'brick' },
] as const;

export function MineStage() {
  const introSeen = useGame((s) => s.onboarding.introSeen);
  const newAwardsCount = useGame((s) => s.newAwards.length);
  const striking = useGame(isStriking); // re-renders only when the strike state flips
  const mineShaft = useGame((s) => s.buildings.mineShaft);
  const openKingsHall = useUi((u) => u.openKingsHall);
  const followDepth = useMineCamera((c) => c.followDepth);
  const follow = useMineCamera((c) => c.follow);
  const jumpToSurface = useMineCamera((c) => c.jumpToSurface);

  // Fire the construction burst on an in-session build (not on a loaded save).
  const [buildKey, setBuildKey] = useState(0);
  const prevShaft = useRef<number | null>(null);
  useEffect(() => {
    if (prevShaft.current === null) {
      prevShaft.current = mineShaft;
      return;
    }
    if (mineShaft > prevShaft.current) setBuildKey((k) => k + 1);
    prevShaft.current = mineShaft;
  }, [mineShaft]);

  return (
    <section className="mine-stage">
      <div className="surface-strip">
        <button
          type="button"
          data-hint="king-hall"
          className={`surface-building kings-hall-building ${introSeen ? '' : 'hall-beckon'}`}
          onClick={openKingsHall}
          title="King's Hall"
        >
          <img src={kingsHallSprite} alt="King's Hall" draggable={false} />
          <span className="hall-label">{introSeen ? "King's Hall" : 'Enter the King’s Hall'}</span>
          {newAwardsCount > 0 && <span className="new-award-badge">New {newAwardsCount}</span>}
        </button>

        {/* Clicking the entrance re-enables Follow Depth — "go see the diggers". */}
        <button
          type="button"
          className="surface-building mine-entrance-building"
          onClick={follow}
          title="Mine Entrance — follow the diggers"
        >
          <img src={mineEntranceSprite} alt="Mine Entrance" draggable={false} />
        </button>

        {/* Mine Shaft appears once built, just right of the entrance, with a
            brick-and-chip construction burst on the build. */}
        {mineShaft >= 1 && (
          <div className="surface-building mine-shaft-building" title="Mine Shaft">
            <img
              src={mineShaftSprite}
              alt="Mine Shaft"
              draggable={false}
              className={buildKey > 0 ? 'built-pop' : ''}
            />
            {buildKey > 0 && (
              <div className="build-burst" key={buildKey} aria-hidden="true">
                {DEBRIS.map((d, i) => (
                  <span
                    key={i}
                    className={`debris ${d.kind}`}
                    style={{ '--dx': `${d.dx}px`, '--dy': `${d.dy}px`, '--rot': `${d.rot}deg` } as unknown as CSSProperties}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Future surface buildings will occupy these slots (see ART_CONTRACT.md). */}
        <span className="surface-slot" aria-hidden="true" />

        {/* Strike picket: always mounted so CSS transitions animate the crowd
            out of the entrance on strike and back into the shaft when ale returns. */}
        <div className={`picketers ${striking ? 'striking' : ''}`} aria-hidden="true">
          {PICKETERS.map((p, i) => (
            <div key={i} className="picketer" style={{ '--x': `${p.x}px`, '--i': i } as unknown as CSSProperties}>
              <span className="picket-sign">No Ale</span>
              <span className="picket-body"><DwarfFigure type={p.type} /></span>
            </div>
          ))}
        </div>
      </div>

      <div className="mine-frame">
        <MineWorld />
        <div className="camera-controls">
          <button className={!followDepth ? '' : 'active'} onClick={follow} title="Follow the dig face">
            ⛏ Follow
          </button>
          <button onClick={jumpToSurface} title="Jump to the surface">
            ⛰ Surface
          </button>
        </div>
      </div>

      <div className="mobile-mine-controls">
        <MineControls />
      </div>
    </section>
  );
}
