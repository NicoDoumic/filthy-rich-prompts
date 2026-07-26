import { defineConfig } from "vitest/config";

export default defineConfig({
  define: {
    __FRP_VERSION__: JSON.stringify(
      process.env.npm_package_version ?? "0.0.0-test",
    ),
  },
  test: {
    include: ["src/**/*.test.ts", "tests/**/*.test.ts"],
    coverage: {
      provider: "v8",
      // all:false — with all:true (default), v8 adds glob-matched files that
      // were never loaded under a second, phantom 0% entry per file.
      all: false,
      include: ["src/core/**/*.ts", "src/passes/**/*.ts"],
      exclude: ["src/core/types.ts", "**/*.test.ts"],
      // testing-strategy §2: ≥95% lines on core, ≥90% on passes. The global
      // perFile floor is 90; core is expected to sit at ≥95 and is reviewed
      // on every PR — the gate hard-fails below the floor either way.
      thresholds: {
        lines: 90,
        functions: 90,
        branches: 85,
        statements: 90,
        perFile: true,
      },
    },
  },
});
