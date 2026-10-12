import { defineConfig } from 'vite';
import { execSync } from 'node:child_process';

// la versión que se ve en la pantalla de inicio: el commit (Netlify lo da en COMMIT_REF) y la fecha del build
const commit = (() => {
  if (process.env.COMMIT_REF) return process.env.COMMIT_REF.slice(0, 7);
  try { return execSync('git rev-parse --short HEAD').toString().trim(); } catch { return 'local'; }
})();
const fecha = new Date().toISOString().slice(0, 16).replace('T', ' ');

export default defineConfig({
  base: './',
  define: { __VERSION__: JSON.stringify(`${commit} · ${fecha}`) },
  server: { host: true },
  build: { chunkSizeWarningLimit: 2000 },
  test: { include: ['src/**/*.test.ts'] },
} as never);
