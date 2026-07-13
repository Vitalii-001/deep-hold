// v1 stub. Before CrazyGames submission this becomes a thin wrapper around
// their SDK's rewarded-ad call. Nothing outside this file may know about the SDK.
export type AdResult = 'rewarded' | 'unavailable' | 'dismissed';

export async function showRewardedAd(): Promise<AdResult> {
  await new Promise((resolve) => setTimeout(resolve, 800));
  return 'rewarded';
}
