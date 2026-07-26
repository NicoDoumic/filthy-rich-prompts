#!/usr/bin/env node
// Package smoke test (docs/testing-strategy.md §6).
// Packs the package, installs it into a clean temp directory, and runs one
// refinement through the published entry point. Catches packaging mistakes
// (missing dist files, bad exports map) that unit tests cannot see.
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const run = (cmd, args, cwd) =>
  execFileSync(cmd, args, {
    cwd,
    stdio: ["ignore", "pipe", "inherit"],
    shell: process.platform === "win32",
  }).toString();

const work = mkdtempSync(join(tmpdir(), "frp-smoke-"));
try {
  console.log("• packing package…");
  const out = run(
    "npm",
    ["pack", "--json", "--pack-destination", work],
    process.cwd(),
  );
  const [{ filename }] = JSON.parse(out);

  console.log("• installing into clean directory…");
  writeFileSync(
    join(work, "package.json"),
    JSON.stringify({ name: "frp-smoke", type: "module" }),
  );
  run(
    "npm",
    ["install", "--no-audit", "--no-fund", join(work, filename)],
    work,
  );

  console.log("• running refinement through installed package…");
  const script = `
    import { refine } from 'filthy-rich-prompts';
    const result = await refine('write a blog post about why tabs are better than spaces');
    if (typeof result.refined !== 'string' || result.refined.length === 0) {
      throw new Error('refined output missing');
    }
    if (!result.report || !Array.isArray(result.report.diagnostics)) {
      throw new Error('report malformed');
    }
    console.log('refined output:', JSON.stringify(result.refined.slice(0, 60)) + '…');
  `;
  writeFileSync(join(work, "smoke.mjs"), script);
  run("node", ["smoke.mjs"], work);

  console.log("✓ Package smoke test passed.");
} finally {
  rmSync(work, { recursive: true, force: true });
}
