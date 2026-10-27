import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['fixtures/buggy-order-service/tests/**/*.test.ts', 'tests/**/*.test.ts'],
  },
});
