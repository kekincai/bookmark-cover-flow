import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  base: './',
  build: {
    target: 'chrome120',
    sourcemap: true,
    outDir: 'dist',
    rollupOptions: {
      input: {
        app: fileURLToPath(new URL('./index.html', import.meta.url)),
        background: fileURLToPath(new URL('./src/background/service-worker.ts', import.meta.url)),
      },
      output: {
        entryFileNames: 'assets/[name].js',
      },
    },
  },
  test: {
    include: ['tests/**/*.test.ts'],
  },
})
