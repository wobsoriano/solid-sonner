import type { E2EConfig } from 'e2e';
import { web } from '@e2e-dev/web';

export default {
  retries: 0,
  targets: [
    {
      name: 'chromium',
      engine: web(),
      app: {
        url: 'http://localhost:3000',
        command: {
          executable: 'pnpm',
          args: ['dev'],
          reuseExisting: true,
          // `TEST_DIST=1` runs the app against the published `solid` entry.
          inheritEnv: ['TEST_DIST'],
          log: '.e2e/logs/app.log',
        },
      },
    },
  ],
} satisfies E2EConfig;
