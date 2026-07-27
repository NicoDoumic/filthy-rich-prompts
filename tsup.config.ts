import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    // Self-contained single-file OpenCode plugin (pre-release D2): tsup inlines
    // our zero-dep core, so dist/opencode-plugin.js works standalone in
    // .opencode/plugin/ with no package resolution at all.
    "opencode-plugin": "src/integrations/opencode-plugin.ts",
  },
  format: ["esm"],
  dts: true,
  sourcemap: true,
  clean: true,
  minify: false,
  splitting: false,
  target: "node22",
  // Tool version is injected from package.json at build time (npm sets
  // npm_package_version for all pnpm scripts) so it can never drift from the
  // published version. See docs/open-questions.md Q11.
  define: {
    __FRP_VERSION__: JSON.stringify(
      process.env.npm_package_version ?? "0.0.0-dev",
    ),
  },
});
