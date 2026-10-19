import { defineConfig, devices } from '@playwright/test';

// Dans l'environnement cloud, un Chromium est déjà installé : on l'utilise via cette variable.
// Sur un PC, laisser vide et lancer une fois `npx playwright install chromium`.
const executablePath = process.env.KOLO_CHROMIUM_PATH || undefined;
const launchOptions = executablePath ? { executablePath } : {};

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'mobile',
      use: { ...devices['Pixel 7'], launchOptions },
    },
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], launchOptions },
    },
  ],
  webServer: {
    command: 'npm run build && npm run preview -- --port 4173 --strictPort',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
