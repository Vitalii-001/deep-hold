import { useUi } from '../uiStore';
import { NAV_ITEMS } from './navItems';

export function LeftNav() {
  const activePanel = useUi((u) => u.activePanel);
  const setActivePanel = useUi((u) => u.setActivePanel);
  return (
    <nav className="left-nav">
      {NAV_ITEMS.map((n) => (
        <button
          key={n.id}
          data-hint={`nav-${n.id}`}
          className={activePanel === n.id ? 'active' : ''}
          onClick={() => setActivePanel(n.id)}
        >
          <span className="nav-icon">{n.icon}</span> {n.label}
        </button>
      ))}
    </nav>
  );
}
