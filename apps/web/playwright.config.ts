import { defineConfig, devices } from '@playwright/test';

const PORT = 3100;
const isCI = Boolean(process.env.CI);

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  reporter: isCI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://localhost:${PORT}/ViajaCol/`,
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      // En local se usa el Chrome instalado; en CI, el Chromium que instala Playwright.
      use: { ...devices['Desktop Chrome'], channel: isCI ? undefined : 'chrome' },
    },
  ],
  webServer: {
    command: `npx next start --port ${PORT}`,
    url: `http://localhost:${PORT}/ViajaCol`,
    reuseExistingServer: !isCI,
    timeout: 120_000,
  },
});
