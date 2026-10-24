import { defineConfig } from 'vitest/config';

// Security-rules tests: run inside `npm run test:rules` (Firebase emulators required).
export default defineConfig({
  test: {
    include: ['tests/rules/**/*.test.ts'],
    environment: 'node',
    testTimeout: 20000,
    hookTimeout: 30000,
    fileParallelism: false,
  },
});
