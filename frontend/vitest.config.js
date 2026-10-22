// Esegue i test dei componenti in un browser simulato, usando la stessa trasformazione JSX di Vite.
import { mergeConfig } from 'vite'
import { defineConfig } from 'vitest/config'
import viteConfig from './vite.config.js'

export default mergeConfig(viteConfig, defineConfig({
  test: {
    environment: 'jsdom',
    maxWorkers: 1,
    setupFiles: ['./test/setup.js'],
    include: ['test/**/*.test.{js,jsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'json-summary', 'json'],
      include: ['src/**/*.{js,jsx}'],
    },
    clearMocks: true,
    restoreMocks: true,
  },
}))
