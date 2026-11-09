import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    environment: 'node',
    // PGlite démarre une base par fichier : quelques secondes au premier test.
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
});
