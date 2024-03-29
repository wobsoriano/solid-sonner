import type { PlaywrightTestConfig } from '@playwright/test'

const config: PlaywrightTestConfig = {
  webServer: {
    command: 'npm run dev',
    port: 3000,
  },
  testDir: 'test',
  testMatch: /(.+\.)?(test|spec)\.[jt]s/,
}

export default config
