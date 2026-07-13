import { useState } from 'react';
import { useGame } from '../game/store';
import { showRewardedAd } from '../sdk/ads';
import { formatDuration } from '../game/format';
import { sfx } from './sfx';

export function AdBoosts() {
  const s = useGame();
  const [busy, setBusy] = useState(false);
  const now = Date.now();
  const blessed = s.blessingUntil > now;
  const hasTemple = s.buildings.temple >= 1;
  const hasBrewery = s.buildings.brewery >= 1;
  if (!hasTemple && !hasBrewery) return null;

  const watch = async (kind: 'blessing' | 'ale') => {
    setBusy(true);
    try {
      const result = await showRewardedAd();
      if (result === 'rewarded') {
        if (kind === 'blessing') s.claimBlessing(Date.now());
        else {
          s.claimAleBarrel();
          sfx.burp();
        }
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="panel ad-boosts">
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
    </div>
  );
}
