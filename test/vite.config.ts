import { URL, fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import solidPlugin from '@solidjs/vite-plugin';

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
        // `TEST_DIST=1` runs the page against the published `solid` entry so
        // build-only regressions fail the suite.
        replacement: fileURLToPath(
          new URL(
            process.env.TEST_DIST ? '../dist/index.jsx' : '../src/index.tsx',
            import.meta.url,
          ),
        ),
      },
    ],
  },
});
