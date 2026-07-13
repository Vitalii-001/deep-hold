import { useGameLoop } from './game/loop';
import { ResourceBar } from './ui/ResourceBar';
import { ClickButton } from './ui/ClickButton';
import { DepthPanel } from './ui/DepthPanel';
import { SidePanels } from './ui/SidePanels';
import { AleStatus } from './ui/AleStatus';
import { MineView } from './ui/MineView';

export default function App() {
  useGameLoop();
  return (
    <div className="app">
      <header className="header">
        <h1>Deep Hold</h1>
        <ResourceBar />
      </header>
      <main className="main">
        <section className="mine-col">
          <MineView />
          <ClickButton />
          <DepthPanel />
        </section>
        <aside className="side-col">
          <AleStatus />
          <SidePanels />
        </aside>
      </main>
    </div>
  );
}
