import { useState } from 'react';
import { useGame } from '../game/store';
import { BALANCE } from '../config/balance';
import { runRewardedAd } from './adGate';
import { formatDuration } from '../game/format';
import { sfx } from './sfx';

export function AdBoosts() {
  const s = useGame();
  const [busy, setBusy] = useState(false);
  const now = Date.now();
  const blessed = s.blessingUntil > now;
  const hasTemple = s.buildings.temple >= 1;
  const hasBrewery = s.buildings.brewery >= 1;
  const feastCooling = s.playedSec < s.feastCooldownUntilSec && s.playedSec >= s.feastUntilSec;
  if (!hasTemple && !hasBrewery) return null;

  const watch = async (kind: 'blessing' | 'ale' | 'feastCooldown') => {
    setBusy(true);
    try {
      const result = await runRewardedAd();
      if (result === 'rewarded') {
        if (kind === 'blessing') s.claimBlessing(Date.now());
        else if (kind === 'ale') {
          s.claimAleBarrel();
          sfx.burp();
        } else {
          s.rushFeastCooldown(BALANCE.feast.cooldownSec);
        }
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="ad-boosts">
      {hasTemple && (
        <button disabled={busy || blessed} onClick={() => watch('blessing')}>
          {blessed
            ? `🙏 Blessed! ${formatDuration((s.blessingUntil - now) / 1000)} left`
            : "📺 Ancestors' Blessing: x2 production for 4h"}
        </button>
      )}
      {hasBrewery && (
        <button disabled={busy} onClick={() => watch('ale')}>
          📺 Free barrel of ale
        </button>
      )}
      {hasBrewery && feastCooling && (
        <button disabled={busy} onClick={() => watch('feastCooldown')}>
          📺 Finish Feast cooldown
        </button>
      )}
    </div>
  );
}
