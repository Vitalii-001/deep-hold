import { useEffect, useReducer, useRef } from 'react';
import { useGame } from '../game/store';
import { useUi } from './uiStore';
import { evaluateTutorial } from '../game/tutorial';

export function TutorialHint() {
  const s = useGame();
  const activePanel = useUi((u) => u.activePanel);
  const hallOpen = useUi((u) => u.kingsHallOpen);
  const shownIdRef = useRef<string | null>(null);
  const [, forceRerender] = useReducer((n: number) => n + 1, 0);

  // Reposition on viewport resize (store ticks already re-render ~10x/s otherwise).
  useEffect(() => {
    window.addEventListener('resize', forceRerender);
    return () => window.removeEventListener('resize', forceRerender);
  }, []);

  const { toComplete, active } = evaluateTutorial(s, shownIdRef.current);

  // Commit completions outside render. completeTutorialStep is idempotent.
  const completeKey = toComplete.join(',');
  useEffect(() => {
    toComplete.forEach((id) => s.completeTutorialStep(id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [completeKey]);

  // Remember what is shown now so the next pass can honor requiresShown.
  useEffect(() => {
    shownIdRef.current = active ? active.id : null;
  });

  // The hall modal covers the stage — a hand pointing at covered UI is noise
  // (the steward card has its own in-modal pointer).
  if (!active || hallOpen) return null;
  const detail = active.detail?.(s);

  // If the target lives in a side-panel tab that isn't open, point at that tab.
  const targetKey = active.tab && active.tab !== activePanel ? `nav-${active.tab}` : active.target;
  const els = Array.from(document.querySelectorAll<HTMLElement>(`[data-hint="${targetKey}"]`));
  const el = els.find((e) => e.getBoundingClientRect().width > 0) ?? null;
  if (!el) return null;

  const rect = el.getBoundingClientRect();
  const below = rect.bottom < window.innerHeight * 0.7;
  const cx = rect.left + rect.width / 2;
  const y = below ? rect.bottom + 3 : rect.top - 3;

  return (
    <div className={`tutorial-hint ${below ? 'below' : 'above'}`} style={{ left: cx, top: y }}>
      <svg className="tutorial-hand" viewBox="0 0 40 56" aria-hidden="true">
        <path
          d="M12 9 a5 5 0 0 1 10 0 V24 Q34 22 35 34 V44 Q35 52 27 52 H13 Q6 52 6 45 V40 Q3 39 3 35 Q3 31 7 31 Q11 31 12 34 Z"
          fill="#fff"
          stroke="#5e3c22"
          strokeWidth="2.4"
          strokeLinejoin="round"
        />
        <path d="M8 45 Q20 49 33 44" fill="none" stroke="#c9bfa8" strokeWidth="2" strokeLinecap="round" />
        <path d="M23 27 v6 M28 28 v6" fill="none" stroke="#c9bfa8" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
      <div className="tutorial-bubble">
        <div>{active.text}</div>
        {detail && <p className="tutorial-detail">{detail}</p>}
        <button className="tutorial-skip" onClick={() => s.completeTutorialStep(active.id)}>
          Skip
        </button>
      </div>
    </div>
  );
}
