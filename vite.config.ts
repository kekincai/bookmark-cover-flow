import { defineConfig } from 'vitest/config'

export default defineConfig({
  base: './',
  build: {
    target: 'chrome120',
    sourcemap: true,
    outDir: 'dist',
  },
  test: {
    include: ['tests/**/*.test.ts'],
  },
})
