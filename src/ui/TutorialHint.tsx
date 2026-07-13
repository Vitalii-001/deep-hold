import { useEffect, useReducer, useRef } from 'react';
import { useGame } from '../game/store';
import { useUi } from './uiStore';
import { evaluateTutorial } from '../game/tutorial';

export function TutorialHint() {
  const s = useGame();
  const completeTutorialStep = useGame((g) => g.completeTutorialStep);
  const activeTab = useUi((u) => u.activeTab);
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
    toComplete.forEach((id) => completeTutorialStep(id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [completeKey]);

  // Remember what is shown now so the next pass can honor requiresShown.
  useEffect(() => {
    shownIdRef.current = active ? active.id : null;
  });

  if (!active) return null;

  // If the target lives in a side-panel tab that isn't open, point at that tab.
  const targetKey = active.tab && active.tab !== activeTab ? `tab-${active.tab}` : active.target;
  const el = document.querySelector<HTMLElement>(`[data-hint="${targetKey}"]`);
  if (!el) return null;

  const rect = el.getBoundingClientRect();
  const below = rect.bottom < window.innerHeight * 0.7;
  const cx = rect.left + rect.width / 2;
  const y = below ? rect.bottom + 10 : rect.top - 10;

  return (
    <div className={`tutorial-hint ${below ? 'below' : 'above'}`} style={{ left: cx, top: y }}>
      <div className="tutorial-arrow" />
      <div className="tutorial-bubble">{active.text}</div>
    </div>
  );
}
