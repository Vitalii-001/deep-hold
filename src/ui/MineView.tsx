import { useEffect, useRef } from 'react';
import { useGame } from '../game/store';
import { LAYERS } from '../config/layers';

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
      if (canvas.width !== Math.round(w * dpr)) {
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(h * dpr);
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const viewDepth = Math.max(s.depth * 1.25, 60); // meters visible
      const yOf = (m: number) => (m / viewDepth) * h;

      // layer bands
      for (let i = 0; i < LAYERS.length; i++) {
        const top = yOf(LAYERS[i].depth);
        if (top > h) break;
        const bottom = i + 1 < LAYERS.length ? Math.min(yOf(LAYERS[i + 1].depth), h) : h;
        ctx.fillStyle = LAYERS[i].color;
        ctx.fillRect(0, top, w, bottom - top);
      }

      // shaft
      const shaftX = w / 2 - 12;
      ctx.fillStyle = '#0d0a07';
      ctx.fillRect(shaftX, 0, 24, yOf(s.depth));

      // miner pixels near the bottom of the shaft
      const n = Math.min(s.workers.miner, 16);
      ctx.fillStyle = '#f0c040';
      for (let i = 0; i < n; i++) {
        const jitter = Math.sin(t / 300 + i * 1.7) * 3;
        const dx = shaftX + 4 + (i % 4) * 5;
        const dy = yOf(s.depth) - 6 - Math.floor(i / 4) * 6 + jitter;
        ctx.fillRect(dx, Math.max(0, dy), 3, 4);
      }

      // depth line + label
      ctx.strokeStyle = '#e8dcc8';
      ctx.beginPath();
      ctx.moveTo(0, yOf(s.depth));
      ctx.lineTo(w, yOf(s.depth));
      ctx.stroke();
      ctx.fillStyle = '#e8dcc8';
      ctx.font = '12px monospace';
      ctx.fillText(`${Math.floor(s.depth)} m`, 6, Math.max(12, yOf(s.depth) - 4));

      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, []);

  return <canvas ref={ref} className="mine-view" />;
}
