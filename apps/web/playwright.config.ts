import { defineConfig } from "@playwright/test";

const PORTA = 5199;

// Telefono stretto (375 px) nei due temi: lo stile è a token CSS, quindi ogni schermata va vista in entrambi.
const telefono = { viewport: { width: 375, height: 812 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true };

export default defineConfig({
  testDir: "./e2e",
  snapshotPathTemplate: "{testDir}/__screenshots__/{projectName}/{testFilePath}/{arg}{ext}",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  expect: { toHaveScreenshot: { maxDiffPixelRatio: 0.01, animations: "disabled" } },
  use: { ...telefono, baseURL: `http://localhost:${PORTA}`, locale: "it-IT", serviceWorkers: "block" },
  projects: [
    { name: "scuro", use: { colorScheme: "dark" } },
    { name: "chiaro", use: { colorScheme: "light" } },
  ],
  webServer: {
    command: `pnpm exec vite --port ${PORTA} --strictPort`,
    url: `http://localhost:${PORTA}`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
