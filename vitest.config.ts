import { defineConfig } from 'vitest/config';
import { loadEnv } from 'vite';
import path from 'path';

export default defineConfig(({ mode }) => {
  if (!process.env.VITEST_SIMULATE_PUBLIC_CI) {
    const env = loadEnv(mode, process.cwd(), '');
    for (const [k, v] of Object.entries(env)) {
      if (process.env[k] === undefined) {
        process.env[k] = v;
      }
    }
  }

  return {
    test: {
      environment: 'node',
      include: ['tests/**/*.test.ts'],
      exclude: ['node_modules', '.next', 'fixtures/**', 'remotion-demo/**'],
      testTimeout: 120000,
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
  };
});
