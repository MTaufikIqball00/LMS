import { defineConfig, devices } from '@playwright/test';

/**
 * Konfigurasi Autonomous Playwright Engine untuk LMS Jabar Istimewa QA Platform
 */
export default defineConfig({
  testDir: './qa-engine/tests',
  timeout: 30 * 1000,
  expect: {
    timeout: 5000,
  },
  fullyParallel: false, // Menghindari race condition pada data transaksi tenant
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: 1, // Single worker default agar audit RBAC dan sesi stabil
  reporter: [
    ['list'],
    ['json', { outputFile: 'qa-data/results/playwright-report.json' }],
    ['html', { outputFolder: 'qa-data/results/html-report', open: 'never' }]
  ],
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    headless: true,
    viewport: { width: 1280, height: 720 },
    ignoreHTTPSErrors: true,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],
});
