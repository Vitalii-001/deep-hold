import { useState } from 'react';
import { EXPEDITIONS } from '../config/expeditions';
import { MINING_METHOD_LIST } from '../config/miningMethods';
import { MODIFIERS } from '../config/modifiers';
import { ORDER_MAP } from '../config/orders';
import { nextLayer } from '../config/layers';
import { canAfford } from '../game/economy';
import { expeditionStatuses } from '../game/expeditions';
import { formatDuration, formatNumber } from '../game/format';
import { orderStatus } from '../game/orders';
import { useGame } from '../game/store';
import { runRewardedAd } from './adGate';
import { CostLabel } from './CostLabel';
import { useUi } from './uiStore';
import { sfx } from './sfx';

function RewardLabel({ orderId }: { orderId: string }) {
  const reward = ORDER_MAP[orderId]?.reward;
  if (!reward) return <span className="desc">Unknown reward</span>;
  return (
    <span className="desc">
      Reward:{' '}
      {reward.resources && <CostLabel cost={reward.resources} />}
      {reward.resources && reward.modifier && ' + '}
      {reward.modifier && (MODIFIERS[reward.modifier]?.name ?? reward.modifier)}
    </span>
  );
}

function RoyalOrdersSection() {
  const s = useGame();
  const pushToast = useUi((u) => u.pushToast);
  const [busyOrder, setBusyOrder] = useState<string | null>(null);

  const adReroll = async (templateId: string) => {
    setBusyOrder(templateId);
    try {
      const result = await runRewardedAd();
      if (result === 'rewarded') {
        useGame.getState().rerollOrder(templateId);
        pushToast('📜 Royal courier delivered a fresh order.');
      } else {
        pushToast('📜 The courier is unavailable. Use the free reroll instead.');
      }
    } finally {
      setBusyOrder(null);
    }
  };

  return (
    <section className="orders-section">
      <div className="panel-section-title">
        <h2>Royal Orders</h2>
        <span className="desc">{s.ordersCompleted.length} completed</span>
      </div>
      {s.activeOrders.length === 0 && (
        <p className="desc">The Royal Steward is preparing contracts. Keep working for the next courier.</p>
      )}
      {s.activeOrders.map((order) => {
        const status = orderStatus(s, order);
        if (!status) return null;
        const pct = Math.max(0, Math.min(100, (status.current / status.target) * 100));
        return (
          <div key={order.templateId} className={`goal-card order-card ${status.claimable ? 'ready' : ''}`}>
            <p className="eyebrow">Royal Order · {formatDuration(order.remainingSec)} left</p>
            <h3>{status.config.title}</h3>
            <p className="desc">
              {formatNumber(Math.min(status.current, status.target))} / {formatNumber(status.target)}
              {status.config.deliver && (
                <>
                  {' '}· Deliver <CostLabel cost={status.config.deliver} />
                </>
              )}
            </p>
            <RewardLabel orderId={order.templateId} />
            <div className="goal-progress">
              <div className="goal-progress-fill" style={{ width: `${pct}%` }} />
            </div>
            <div className="goal-footer">
              <button
                disabled={!status.claimable}
                onClick={() => {
                  s.claimOrder(order.templateId);
                  sfx.coin();
                }}
              >
                {status.claimable ? 'Claim' : status.complete ? 'Need delivery' : 'In progress'}
              </button>
              <button onClick={() => s.rerollOrder(order.templateId)}>Free reroll</button>
              <button disabled={busyOrder === order.templateId} onClick={() => void adReroll(order.templateId)}>
                📺 Ad reroll
              </button>
            </div>
          </div>
        );
      })}
    </section>
  );
}

function ExpeditionsSection() {
  const s = useGame();
  const pushToast = useUi((u) => u.pushToast);
  const [busyExpedition, setBusyExpedition] = useState<string | null>(null);
  const statuses = expeditionStatuses(s);

  const rushWithAd = async (templateId: string, seconds: number) => {
    setBusyExpedition(templateId);
    try {
      const result = await runRewardedAd();
      if (result === 'rewarded') {
        useGame.getState().rushExpedition(templateId, seconds, true);
        pushToast('⏳ The crew found a shortcut.');
      } else {
        pushToast('⏳ Ad rush unavailable. Assign extra crew or wait it out.');
      }
    } finally {
      setBusyExpedition(null);
    }
  };

  return (
    <section className="orders-section">
      <div className="panel-section-title">
        <h2>Return Timers</h2>
        <span className="desc">Progress while away</span>
      </div>
      {EXPEDITIONS.map((cfg) => {
        const active = statuses.find((x) => x.expedition.templateId === cfg.id);
        const unlocked = cfg.unlock(s);
        const canStart = unlocked && (!cfg.canStart || cfg.canStart(s));
        const affordable = !cfg.cost || canAfford(s.resources, cfg.cost);
        const freeRushAffordable = canAfford(s.resources, cfg.freeRushCost);
        const target = cfg.id === 'scoutReport' ? nextLayer(s.depth) : null;
        return (
          <div key={cfg.id} className={`goal-card expedition-card ${active?.ready ? 'ready' : ''}`}>
            <p className="eyebrow">{active ? (active.ready ? 'Ready' : formatDuration(active.expedition.remainingSec)) : 'Available timer'}</p>
            <h3>{cfg.title}</h3>
            <p className="desc">
              {cfg.description}
              {target && ` Target: ${target.name}.`}
            </p>
            <p className="desc">Reward: {cfg.rewardLabel}</p>
            {!active && cfg.cost && (
              <p className="goal-cost">
                Cost <CostLabel cost={cfg.cost} />
              </p>
            )}
            <div className="goal-footer">
              {!active && (
                <button
                  disabled={!canStart || !affordable}
                  onClick={() => {
                    s.startExpedition(cfg.id);
                    sfx.coin();
                  }}
                >
                  {!unlocked ? 'Locked' : !canStart ? 'No target' : 'Start'}
                </button>
              )}
              {active?.ready && (
                <button
                  onClick={() => {
                    s.claimExpedition(cfg.id);
                    sfx.coin();
                  }}
                >
                  Claim
                </button>
              )}
              {active && !active.ready && (
                <>
                  <button
                    disabled={!freeRushAffordable}
                    title={`Free alternative: spend crew supplies to rush ${formatDuration(cfg.freeRushSec)}`}
                    onClick={() => s.rushExpedition(cfg.id, cfg.freeRushSec)}
                  >
                    Rush <CostLabel cost={cfg.freeRushCost} />
                  </button>
                  <button disabled={busyExpedition === cfg.id} onClick={() => void rushWithAd(cfg.id, cfg.adRushSec)}>
                    📺 Rush {formatDuration(cfg.adRushSec)}
                  </button>
                </>
              )}
            </div>
          </div>
        );
      })}
    </section>
  );
}

function OvernightPlanSection() {
  const s = useGame();
  return (
    <section className="orders-section">
      <div className="panel-section-title">
        <h2>Overnight Plan</h2>
        <span className="desc">Used while offline</span>
      </div>
      <p className="desc">Your current mining method stays active while you are away. Choose the risk profile before leaving.</p>
      <div className="dig-mode">
        {MINING_METHOD_LIST.map((m) => (
          <button
            key={m.id}
            className={s.miningMethod === m.id ? 'active' : ''}
            title={m.description}
            onClick={() => s.setMiningMethod(m.id)}
          >
            {m.name}
          </button>
        ))}
      </div>
    </section>
  );
}

export function OrdersPanel() {
  return (
    <div className="panel orders-panel">
      <RoyalOrdersSection />
      <ExpeditionsSection />
      <OvernightPlanSection />
    </div>
  );
}
