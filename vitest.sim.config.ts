import { defineConfig } from 'vitest/config';

// Separate config for the balance simulator (`npm run sim:balance`).
// The *.sim.ts pattern is deliberately outside the default test glob so the
// simulator never runs as part of the normal `npm run test` suite.
export default defineConfig({
  test: {
    include: ['scripts/**/*.sim.ts'],
  },
});
