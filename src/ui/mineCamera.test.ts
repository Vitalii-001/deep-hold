import { beforeEach, expect, test } from 'vitest';
import { useMineCamera } from './mineCamera';

beforeEach(() => useMineCamera.setState({ followDepth: true, followReq: 0, surfaceReq: 0 }));

test('starts in follow mode', () => {
  expect(useMineCamera.getState().followDepth).toBe(true);
});

test('breakFollow stops auto-follow; follow re-enables it and bumps followReq', () => {
  useMineCamera.getState().breakFollow();
  expect(useMineCamera.getState().followDepth).toBe(false);
  useMineCamera.getState().follow();
  expect(useMineCamera.getState().followDepth).toBe(true);
  expect(useMineCamera.getState().followReq).toBe(1);
});

test('jumpToSurface disables follow and bumps the request counter', () => {
  useMineCamera.getState().jumpToSurface();
  useMineCamera.getState().jumpToSurface();
  expect(useMineCamera.getState().followDepth).toBe(false);
  expect(useMineCamera.getState().surfaceReq).toBe(2);
});
