import { expect, test } from 'vitest';
import { isAllowedHost, SITELOCK_ENABLED } from './portal';

test('sitelock is shipped disabled until CrazyGames submission', () => {
  expect(SITELOCK_ENABLED).toBe(false);
  // disabled: any host passes (itch.io demo, local dev, previews)
  expect(isAllowedHost('some-random-site.example', false)).toBe(true);
});

test('when enabled, only whitelisted hosts (and their subdomains) pass', () => {
  expect(isAllowedHost('www.crazygames.com', true)).toBe(true);
  expect(isAllowedHost('crazygames.com', true)).toBe(true);
  expect(isAllowedHost('games.crazygames.com', true)).toBe(true);
  expect(isAllowedHost('localhost', true)).toBe(true);
  expect(isAllowedHost('evil-crazygames.com', true)).toBe(false);
  expect(isAllowedHost('crazygames.com.evil.example', true)).toBe(false);
  expect(isAllowedHost('itch.io', true)).toBe(false);
});
