import { useGameLoop } from './game/loop';
import { GameShell } from './ui/layout/GameShell';

export default function App() {
  useGameLoop();
  return <GameShell />;
}
