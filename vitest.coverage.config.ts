import { defineConfig } from "vitest/config";

/**
 * Configurazione unica per i test unitari e d'integrazione di tutto il monorepo
 * (`pnpm coverage`); non si chiama vitest.config.ts per non essere ereditata dai pacchetti. Ogni pacchetto ha comunque il suo `pnpm test` (vitest run).
 * I test grafici stanno in apps/web/e2e e usano Playwright: qui sono esclusi.
 */
export default defineConfig({
  test: {
    include: ["{apps,packages,games}/*/src/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["{apps,packages,games}/*/src/**/*.ts"],
      exclude: ["**/*.test.ts", "**/index.ts", "apps/web/**", "**/*.d.ts", "apps/server/src/index.ts"],
      reporter: ["text-summary", "text", "html"],
      reportsDirectory: "coverage",
    },
  },
});
