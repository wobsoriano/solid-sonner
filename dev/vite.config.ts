import { URL, fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import solidPlugin from 'vite-plugin-solid';

export default defineConfig({
  plugins: [
    solidPlugin(),
    {
      name: 'Replace env variables',
      transform(code, id) {
        if (id.includes('node_modules')) return code;

        return code
          .replace(/process\.env\.SSR/g, 'false')
          .replace(/process\.env\.DEV/g, 'true')
          .replace(/process\.env\.PROD/g, 'false')
          .replace(/process\.env\.NODE_ENV/g, '"development"')
          .replace(/import\.meta\.env\.SSR/g, 'false')
          .replace(/import\.meta\.env\.DEV/g, 'true')
          .replace(/import\.meta\.env\.PROD/g, 'false')
          .replace(/import\.meta\.env\.NODE_ENV/g, '"development"');
      },
    },
  ],
  server: {
    port: 3000,
  },
  build: {
    target: 'esnext',
  },
  resolve: {
    alias: [
      {
        find: 'src/',
        // `TEST_DIST=1` runs the app against the published `solid` entry so
        // build-only regressions fail the suite.
        replacement: fileURLToPath(
          new URL(process.env.TEST_DIST ? '../dist/index.jsx' : '../src', import.meta.url),
        ),
      },
    ],
  },
});
