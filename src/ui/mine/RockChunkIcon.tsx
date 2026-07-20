import type { ResourceId } from '../../game/types';

// Drawn 30×30 wall-deposit icons, one per mineable resource, in the same
// light-cartoon inline-SVG style as DwarfFigure. `stage` is visible damage:
// 0 untouched, 1 first cracks, 2 nearly mined out — crack overlays stack.

function Cracks({ stage }: { stage: number }) {
  if (stage < 1) return null;
  return (
    <g stroke="rgba(30, 22, 12, 0.72)" strokeWidth="1.4" fill="none" strokeLinecap="round">
      <path d="M10 7 L14 14 L12 20" />
      {stage >= 2 && (
        <>
          <path d="M21 9 L17 15 L21 21" />
          <path d="M14 14 L19 16" />
          <path d="M8 16 L12 17" strokeWidth="1.1" />
        </>
      )}
    </g>
  );
}

export function RockChunkIcon({ resource, stage }: { resource: ResourceId; stage: number }) {
  if (resource === 'gem') {
    return (
      <svg viewBox="0 0 30 30" className="rock-chunk rock-gem" aria-hidden="true">
        <polygon points="24,17 28,21 25,27 20,26" fill="#7b4fa0" stroke="#4d2e6b" strokeWidth="1.4" strokeLinejoin="round" />
        <polygon points="15,2 22,11 19,27 11,27 8,11" fill="#9a6cc4" stroke="#4d2e6b" strokeWidth="1.5" strokeLinejoin="round" />
        <polygon points="15,2 18,11 15,27 12,11" fill="#b78fe0" />
        <polygon points="15,2 22,11 18,11" fill="#8659b3" />
        <path d="M12.5 6 L11 11" stroke="#e6d4fb" strokeWidth="1.2" strokeLinecap="round" />
        <Cracks stage={stage} />
      </svg>
    );
  }
  if (resource === 'gold') {
    return (
      <svg viewBox="0 0 30 30" className="rock-chunk rock-gold" aria-hidden="true">
        <path
          d="M6 19 q-2 -8 6 -12 q9 -4 12 3 q3 8 -3 13 q-10 4 -15 -4z"
          fill="#e2b93b"
          stroke="#8a6a10"
          strokeWidth="1.5"
        />
        <path d="M9 11 q4 -4 9 -3 q-1 4 -5 5 q-3 1 -4 -2z" fill="#f4d76a" />
        <circle cx="19" cy="18" r="2.4" fill="#c99a1e" />
        <path d="M11 6.5 l1 -2 M23 8 l2 -1.4" stroke="#fff4b0" strokeWidth="1.6" strokeLinecap="round" />
        <Cracks stage={stage} />
      </svg>
    );
  }
  if (resource === 'ore') {
    return (
      <svg viewBox="0 0 30 30" className="rock-chunk rock-ore" aria-hidden="true">
        <polygon points="4,20 7,9 15,4 24,8 27,19 20,27 9,27" fill="#8a6a4a" stroke="#4a3524" strokeWidth="1.5" strokeLinejoin="round" />
        <polygon points="7,9 15,4 17,12 9,16" fill="#9c7a55" />
        <polygon points="17,12 24,8 27,19 19,18" fill="#755639" />
        <circle cx="11" cy="13" r="2.2" fill="#c77b3a" stroke="#8a4f1e" strokeWidth="0.8" />
        <circle cx="18" cy="20" r="1.8" fill="#c77b3a" stroke="#8a4f1e" strokeWidth="0.8" />
        <circle cx="16" cy="9" r="1.4" fill="#d98f4d" />
        <Cracks stage={stage} />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 30 30" className="rock-chunk rock-stone" aria-hidden="true">
      <polygon points="4,20 7,9 15,4 24,8 27,19 20,27 9,27" fill="#9c968c" stroke="#57524a" strokeWidth="1.5" strokeLinejoin="round" />
      <polygon points="7,9 15,4 17,12 9,16" fill="#b3ada2" />
      <polygon points="17,12 24,8 27,19 19,18" fill="#87817a" />
      <path d="M11 21 l4 1" stroke="#6e6a62" strokeWidth="1.2" strokeLinecap="round" />
      <Cracks stage={stage} />
    </svg>
  );
}
