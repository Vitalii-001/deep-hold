import { TopBar } from './TopBar';
import { BottomNav } from './BottomNav';
import { MineStage } from './MineStage';
import { RightPanel } from './RightPanel';
import { ModalLayer } from './ModalLayer';
import { Watchers } from '../Watchers';
import { TutorialHint } from '../TutorialHint';
import { useUiSettings } from '../uiSettings';

export function GameShell() {
  const highContrast = useUiSettings((s) => s.highContrast);
  const compactMode = useUiSettings((s) => s.compactMode);

  return (
    <div className={`game-shell ${highContrast ? 'high-contrast' : ''} ${compactMode ? 'compact-ui' : ''}`}>
      <TopBar />
      <MineStage />
      <BottomNav />
      <RightPanel />
      <Watchers />
      <TutorialHint />
      <ModalLayer />
    </div>
  );
}
