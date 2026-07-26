#!/usr/bin/env node
// Zero-dependency guard (docs/coding-standards.md §2).
// The published package must have ZERO runtime dependencies. This script is
// the mechanical enforcement of that rule — it fails CI if anyone adds one.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));

const runtimeDeps = Object.keys(pkg.dependencies ?? {});

if (runtimeDeps.length > 0) {
  console.error(
    `\n✖ Zero-dependency core violated. package.json has ${runtimeDeps.length} runtime ` +
      `dependenc${runtimeDeps.length === 1 ? "y" : "ies"}:\n` +
      runtimeDeps.map((d) => `  - ${d}`).join("\n") +
      `\n\nSee docs/coding-standards.md §2 — a runtime dependency requires a PR ` +
      `arguing why re-implementation is worse, maintainer approval ×2, and a comment period.\n`,
  );
  process.exit(1);
}

console.log("✓ Zero-dependency core intact (no runtime dependencies).");
