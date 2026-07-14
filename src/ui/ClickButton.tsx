import { useRef, useState, type CSSProperties, type PointerEvent } from 'react';
import { useGame } from '../game/store';
import { BALANCE } from '../config/balance';
import { statMult } from '../game/economy';
import { formatNumber } from '../game/format';
import { sfx } from './sfx';

interface FloatNum {
  id: number;
  x: number;
  text: string;
}

interface Chip {
  id: number;
  dx: number;
  dy: number;
  rot: number;
  tri: boolean;
}

const CHIP_LIFETIME_MS = 500;

export function ClickButton() {
  const clickMine = useGame((s) => s.clickMine);
  const clickMult = useGame((s) => statMult(s, 'click', Date.now()));
  const [floats, setFloats] = useState<FloatNum[]>([]);
  const [chips, setChips] = useState<Chip[]>([]);
  const nextId = useRef(0);
  const nextChipId = useRef(0);
  const btnRef = useRef<HTMLButtonElement>(null);

  const onPress = (e: PointerEvent<HTMLButtonElement>) => {
    if (e.button !== 0) return;
    sfx.pick();
    clickMine();

    const id = nextId.current++;
    const x = 15 + Math.random() * 70;
    const text = `+${formatNumber(BALANCE.click.stonePerClick * clickMult)}`;
    setFloats((f) => [...f.slice(-8), { id, x, text }]);
    setTimeout(() => setFloats((f) => f.filter((o) => o.id !== id)), 800);

    // Stone-chip burst: a few small squares/triangles fly out and fade.
    const burst: Chip[] = Array.from({ length: 4 + Math.floor(Math.random() * 2) }, () => {
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 0.9;
      const dist = 22 + Math.random() * 28;
      return {
        id: nextChipId.current++,
        dx: Math.cos(angle) * dist,
        dy: Math.sin(angle) * dist,
        rot: (Math.random() - 0.5) * 360,
        tri: Math.random() < 0.5,
      };
    });
    setChips((c) => [...c.slice(-16), ...burst]);
    burst.forEach((chip) => {
      setTimeout(() => setChips((c) => c.filter((o) => o.id !== chip.id)), CHIP_LIFETIME_MS);
    });

    // Squash/scale punch on press — remove+reflow+add so the animation
    // restarts even on rapid repeated clicks.
    const btn = btnRef.current;
    if (btn) {
      btn.classList.remove('punch');
      void btn.offsetWidth;
      btn.classList.add('punch');
    }
  };

  return (
    <div className="click-area">
      <button ref={btnRef} className="mine-btn" data-hint="mine-btn" onPointerDown={onPress}>
        ⛏️ MINE
      </button>
      {floats.map((f) => (
        <span key={f.id} className="float-num" style={{ left: `${f.x}%` }}>
          {f.text}
        </span>
      ))}
      {chips.map((c) => (
        <span
          key={c.id}
          className={`chip ${c.tri ? 'chip-tri' : 'chip-sq'}`}
          style={{ '--dx': `${c.dx}px`, '--dy': `${c.dy}px`, '--rot': `${c.rot}deg` } as CSSProperties}
        />
      ))}
    </div>
  );
}
