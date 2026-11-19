import { URL, fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import solidPlugin from '@solidjs/vite-plugin';

// `TEST_DIST=1` runs the page against the published `solid` entry, and
// `TEST_DIST=default` against the precompiled `default` entry, so build-only
// regressions fail the suite.
const entries: Partial<Record<string, string>> = {
  src: '../src/index.tsx',
  1: '../dist/index.jsx',
  default: '../dist/index.js',
};
const entry = entries[process.env.TEST_DIST ?? 'src'];
if (!entry) throw new Error(`Unknown TEST_DIST: ${process.env.TEST_DIST}`);

// Serves the page the suite drives, the counterpart of upstream sonner's `test/` app.
export default defineConfig({
  root: fileURLToPath(new URL('./app', import.meta.url)),
  plugins: [solidPlugin()],
  server: {
    port: 3001,
    strictPort: true,
  },
  resolve: {
    alias: [
      {
        find: /^solid-sonner$/,
        replacement: fileURLToPath(new URL(entry, import.meta.url)),
      },
    ],
  },
});
