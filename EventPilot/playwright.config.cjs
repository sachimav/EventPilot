const { defineConfig } = require('@playwright/test');
const port = Number(process.env.EVENTPILOT_TEST_PORT || 8084);

module.exports = defineConfig({
  testDir: './e2e',
  timeout: 120000,
  expect: { timeout: 20000 },
  workers: 1,
  use: {
    actionTimeout: 15000,
    baseURL: `http://127.0.0.1:${port}`,
    channel: 'msedge',
    headless: true,
    viewport: { width: 390, height: 844 },
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: `node scripts/preview-web.cjs --port ${port}`,
    url: `http://127.0.0.1:${port}`,
    timeout: 120000,
    reuseExistingServer: !process.env.CI,
    env: { CI: '1', EXPO_OFFLINE: '1' },
  },
});
