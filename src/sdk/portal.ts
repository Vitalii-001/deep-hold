// Portal lifecycle wrapper (CrazyGames). Like ads.ts, this is the ONLY module
// that may ever talk to the portal SDK — everything else calls these functions.
// All bodies are stubs until submission; the integration points are already
// wired (main.tsx boot, game/loop.ts visibility, ui/adGate.ts ads).

// Flip to true at CrazyGames submission (their QA checks for a sitelock).
export const SITELOCK_ENABLED = false;

const ALLOWED_HOSTS = [
  'localhost',
  '127.0.0.1',
  'crazygames.com',
  '1001juegos.com', // CrazyGames regional portal
];

export function isAllowedHost(hostname: string, enabled: boolean = SITELOCK_ENABLED): boolean {
  if (!enabled) return true;
  return ALLOWED_HOSTS.some((h) => hostname === h || hostname.endsWith(`.${h}`));
}

// Called once before rendering. Returns false when the sitelock rejects the
// host — main.tsx then shows a static "play on CrazyGames" note instead of the game.
export function initPortal(): boolean {
  // At submission: await CrazyGames.SDK.init() here.
  return isAllowedHost(window.location.hostname);
}

// Gameplay start/stop events: the portal measures initial download up to the
// first gameplayStart and uses these for engagement metrics. We fire start on
// boot / tab return / ad end, stop on tab hide / ad begin.
export function gameplayStart(): void {
  // At submission: CrazyGames.SDK.game.gameplayStart();
}

export function gameplayStop(): void {
  // At submission: CrazyGames.SDK.game.gameplayStop();
}
