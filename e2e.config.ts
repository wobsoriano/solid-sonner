import type { E2EConfig } from 'e2e';
import { web } from '@e2e-dev/web';

const app = {
  url: 'http://localhost:3001',
  command: {
    executable: 'pnpm',
    args: ['dev:test'],
    // On native Windows a run that starts this server passes but never exits,
    // so start `pnpm dev:test` first and the run reuses it.
    reuseExisting: true,
    // `TEST_DIST` picks the entry the page loads, as tests/vite.config.ts says.
    inheritEnv: ['TEST_DIST'],
    log: '.e2e/logs/app.log',
  },
};

// Chromium and WebKit, the browsers sonner's own suite runs on.
export default {
  retries: 0,
  targets: [
    { name: 'chromium', engine: web(), app },
    { name: 'webkit', engine: web({ browser: 'webkit' }), app },
  ],
} satisfies E2EConfig;
