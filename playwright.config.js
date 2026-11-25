// Automatische Browser-Tests für AssistCoach. Start: `npm test`
const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  timeout: 20000,
  retries: 0,
  use: {
    baseURL: 'http://localhost:3000',
    viewport: { width: 1200, height: 900 },
    trace: 'off',
  },
  // Startet die App automatisch lokal, falls sie nicht schon läuft
  webServer: {
    command: 'npx --yes serve -l 3000 .',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 60000,
  },
});
