import { useGameLoop } from './game/loop';
import { ResourceBar } from './ui/ResourceBar';
import { ClickButton } from './ui/ClickButton';
import { DepthPanel } from './ui/DepthPanel';

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
          <div className="mine-view-placeholder" />
          <ClickButton />
          <DepthPanel />
        </section>
        <aside className="side-col" />
      </main>
    </div>
  );
}
