import { showRewardedAd, type AdResult } from '../sdk/ads';
import { gameplayStart, gameplayStop } from '../sdk/portal';
import { useUi } from './uiStore';

// CrazyGames ad rules, enforced in ONE place for every rewarded slot:
// - the simulation pauses (game/loop.ts skips ticks while adPlaying)
// - audio is muted (ui/sfx.ts checks adPlaying)
// - the UI is blocked (AdOverlay in ModalLayer)
// - callers grant rewards ONLY on the 'rewarded' result
export async function runRewardedAd(): Promise<AdResult> {
  const ui = useUi.getState();
  if (ui.adPlaying) return 'unavailable'; // never stack ad requests
  ui.setAdPlaying(true);
  gameplayStop();
  try {
    return await showRewardedAd();
  } catch {
    return 'unavailable'; // unfilled request — the game just continues
  } finally {
    useUi.getState().setAdPlaying(false);
    gameplayStart();
  }
}
