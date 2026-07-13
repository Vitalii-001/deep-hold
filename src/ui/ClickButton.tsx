import { useRef, useState, type PointerEvent } from 'react';
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

export function ClickButton() {
  const clickMine = useGame((s) => s.clickMine);
  const clickMult = useGame((s) => statMult(s, 'click', Date.now()));
  const [floats, setFloats] = useState<FloatNum[]>([]);
  const nextId = useRef(0);

  const onPress = (e: PointerEvent<HTMLButtonElement>) => {
    if (e.button !== 0) return;
    sfx.pick();
    clickMine();
    const id = nextId.current++;
    const x = 15 + Math.random() * 70;
    const text = `+${formatNumber(BALANCE.click.stonePerClick * clickMult)}`;
    setFloats((f) => [...f.slice(-8), { id, x, text }]);
    setTimeout(() => setFloats((f) => f.filter((o) => o.id !== id)), 800);
  };

  return (
    <div className="click-area">
      <button className="mine-btn" onPointerDown={onPress}>
        ⛏️ MINE
      </button>
      {floats.map((f) => (
        <span key={f.id} className="float-num" style={{ left: `${f.x}%` }}>
          {f.text}
        </span>
      ))}
    </div>
  );
}
