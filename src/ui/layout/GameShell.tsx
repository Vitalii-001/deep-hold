import { TopBar } from './TopBar';
import { LeftNav } from './LeftNav';
import { BottomNav } from './BottomNav';
import { MineStage } from './MineStage';
import { RightPanel } from './RightPanel';
import { ModalLayer } from './ModalLayer';
import { Watchers } from '../Watchers';
import { TutorialHint } from '../TutorialHint';

export function GameShell() {
  return (
    <div className="game-shell">
      <TopBar />
      <LeftNav />
      <MineStage />
      <BottomNav />
      <RightPanel />
      <Watchers />
      <TutorialHint />
      <ModalLayer />
    </div>
  );
}
