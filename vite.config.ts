/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ command }) => ({
  // Production builds are served from GitHub Pages at https://bpneal.github.io/spellings/.
  // Override with BASE_PATH (e.g. BASE_PATH=/ yarn build) to host somewhere else.
  base: command === 'build' ? (process.env.BASE_PATH ?? '/spellings/') : '/',
  plugins: [react()],
  server: { port: 5173, open: !process.env.CI && !process.env.NO_OPEN },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
  },
}));
