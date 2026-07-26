#!/usr/bin/env node
// Regenerates golden fixtures (docs/testing-strategy.md §3).
// Cross-platform wrapper for UPDATE_GOLDENS=1 — setting env vars inline is
// shell-dependent, and this works identically on cmd, PowerShell, and bash.
// Every changed golden file must be justified in the PR body.
import { execFileSync } from "node:child_process";

execFileSync("npx", ["vitest", "run", "tests/golden"], {
  stdio: "inherit",
  shell: process.platform === "win32",
  env: { ...process.env, UPDATE_GOLDENS: "1" },
});

console.log(
  "\n✓ Golden files regenerated. Review every change with git diff before committing.",
);
