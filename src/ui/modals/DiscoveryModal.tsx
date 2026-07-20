import { useGame } from '../../game/store';
import { useUi } from '../uiStore';
import { DISCOVERY_MAP } from '../../config/discoveries';
import { canAfford } from '../../game/economy';
import { sfx } from '../sfx';

// One-time depth event with a permanent choice. No backdrop dismiss: the
// discovery stays pending (and persists in the save) until the player picks.
export function DiscoveryModal() {
  const pendingId = useGame((s) => s.pendingDiscoveryId);
  const resources = useGame((s) => s.resources);
  const chooseDiscovery = useGame((s) => s.chooseDiscovery);
  const pushToast = useUi((u) => u.pushToast);

  const discovery = pendingId ? DISCOVERY_MAP[pendingId] : undefined;
  if (!discovery) return null;

  return (
    <div className="modal-backdrop">
      <div className="modal discovery-modal" onClick={(e) => e.stopPropagation()}>
        <p className="eyebrow">Discovery — {discovery.depth} m</p>
        <h2>{discovery.name}</h2>
        <p className="desc discovery-text">{discovery.text}</p>
        <div className="discovery-options">
          {discovery.options.map((opt) => {
            const affordable = !opt.cost || canAfford(resources, opt.cost);
            return (
              <button
                key={opt.id}
                className="discovery-option"
                disabled={!affordable}
                onClick={() => {
                  chooseDiscovery(opt.id);
                  pushToast(opt.toast);
                  sfx.coin();
                }}
              >
                <strong>{opt.label}</strong>
                <span className="desc">
                  {opt.hint}
                  {!affordable && ' — not enough resources'}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
