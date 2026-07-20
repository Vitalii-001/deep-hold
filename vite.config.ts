/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // CrazyGames requirement: only relative paths inside the bundle —
  // absolute /assets/... URLs fail to load in the portal iframe.
  base: './',
  plugins: [react()],
  test: { environment: 'node' },
});