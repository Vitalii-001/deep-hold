import { MineView } from '../MineView';
import { ClickButton } from '../ClickButton';
import { DepthPanel } from '../DepthPanel';

export function MineStage() {
  return (
    <section className="mine-stage">
      <div className="surface-strip" aria-hidden="true">
        <span>⛰️</span>
        <span>🏘️</span>
        <span>🌲</span>
      </div>
      <div className="mine-frame">
        <MineView />
      </div>
      <ClickButton />
      <DepthPanel />
    </section>
  );
}
