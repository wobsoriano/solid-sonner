import { type PlaywrightTestConfig, devices } from '@playwright/test';

const config: PlaywrightTestConfig = {
  webServer: {
    command: 'pnpm dev:test',
    port: 3001,
    reuseExistingServer: true,
  },
  testDir: 'test',
  testMatch: /(.+\.)?(test|spec)\.[jt]sx?$/,
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
};

export default config;
