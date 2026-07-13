import { expect, test } from 'vitest';
import { formatNumber, formatDuration } from './format';

test('integers below 1000 are shown as-is', () => {
  expect(formatNumber(0)).toBe('0');
  expect(formatNumber(999)).toBe('999');
});

test('small fractional values keep one decimal', () => {
  expect(formatNumber(5.5)).toBe('5.5');
});

test('values from 10 to 999 are floored', () => {
  expect(formatNumber(999.9)).toBe('999');
});

test('thousands use K with one decimal', () => {
  expect(formatNumber(1000)).toBe('1K');
  expect(formatNumber(12400)).toBe('12.4K');
});

test('large units', () => {
  expect(formatNumber(1_500_000)).toBe('1.5M');
  expect(formatNumber(2_500_000_000)).toBe('2.5B');
  expect(formatNumber(999_999)).toBe('999K');
});

test('formatDuration', () => {
  expect(formatDuration(42)).toBe('42s');
  expect(formatDuration(300)).toBe('5m');
  expect(formatDuration(8010)).toBe('2h 13m');
});