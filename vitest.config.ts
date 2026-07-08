import { defineConfig } from 'vitest/config';

// Pure-logic unit tests run in Node (the interview engine's core is
// side-effect-free). Worker-integration tests (D1/KV) would use
// @cloudflare/vitest-pool-workers in a separate project later.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts'],
  },
});
