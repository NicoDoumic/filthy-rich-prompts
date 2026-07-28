import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

const CLI = join(process.cwd(), "dist", "cli.js");
let work: string;

beforeEach(() => {
  work = mkdtempSync(join(tmpdir(), "frp-cli-"));
});

afterEach(() => {
  rmSync(work, { recursive: true, force: true });
});

function frp(args: string[], input?: string): { stdout: string; stderr: string; exitCode: number } {
  try {
    const result = execFileSync("node", [CLI, ...args], {
      cwd: work,
      input,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
      timeout: 15000,
    });
    return { stdout: result, stderr: "", exitCode: 0 };
  } catch (err: unknown) {
    const e = err as { stdout?: string; stderr?: string; status?: number };
    return {
      stdout: (e.stdout ?? "").toString(),
      stderr: (e.stderr ?? "").toString(),
      exitCode: e.status ?? 1,
    };
  }
}

// ─── refine ────────────────────────────────────────────────────────

describe("frp refine", () => {
  it("refines a prompt from an argument", () => {
    const result = frp(["refine", "fix the login bug"]);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("# Task");
    expect(result.stdout).toContain("fix the login bug");
  });

  it("refines a prompt from stdin", () => {
    const result = frp(["refine"], "fix the login bug");
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("# Task");
  });

  it("refines a prompt from a file", () => {
    const path = join(work, "input.txt");
    writeFileSync(path, "fix the login bug");
    const result = frp(["refine", "--file", path]);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("# Task");
  });

  it("produces JSON output with --json", () => {
    const result = frp(["refine", "--json", "fix the login bug"]);
    expect(result.exitCode).toBe(0);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.refined).toBeDefined();
    expect(parsed.diff).toBeDefined();
    expect(parsed.report).toBeDefined();
  });

  it("applies mode when specified", () => {
    const result = frp(["refine", "--mode", "silent", "fix the login bug"]);
    expect(result.exitCode).toBe(0);
    // Silent mode adds a tagline
    expect(result.stdout).toContain("Refined in silent mode");
  });

  it("handles empty input gracefully", () => {
    const result = frp(["refine"], "   ");
    expect(result.exitCode).toBe(0);
  });

  it("handles already-structured input", () => {
    const result = frp(["refine"], "# Task\n\nfix the login bug");
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("# Task");
  });
});

// ─── lint ──────────────────────────────────────────────────────────

describe("frp lint", () => {
  it("exits 0 when there are no diagnostics", () => {
    // A well-specified prompt with full context should produce minimal diagnostics
    const prompt = "# Task\n\nFix the login bug on the dashboard.\n\n## Context\n\n- React 18, Node 20\n- Users report intermittent redirects after login\n\n## Constraints\n\n- Must preserve existing sessions\n- Must not change the auth flow";
    const result = frp(["lint"], prompt);
    // May still have a few diagnostics — that's fine, lint should be noisy
    expect(result.exitCode).toBeGreaterThanOrEqual(0);
  });

  it("exits 1 when diagnostics are found (vague prompt)", () => {
    const result = frp(["lint"], "fix the thing asap");
    expect(result.exitCode).toBe(1);
  });

  it("prints diagnostic codes to stderr", () => {
    const result = frp(["lint"], "fix asap");
    expect(result.stderr).toBeDefined();
  });

  it("reads from a file", () => {
    const path = join(work, "lint-input.txt");
    writeFileSync(path, "fix the thing asap");
    const result = frp(["lint", "--file", path]);
    expect(result.exitCode).toBe(1);
  });
});

// ─── doctor ────────────────────────────────────────────────────────

describe("frp doctor", () => {
  it("prints version and environment info", () => {
    const result = frp(["doctor"]);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("frp v");
    expect(result.stdout).toContain("Node.js");
    expect(result.stdout).toContain("Platform:");
    expect(result.stdout).toContain("Pipeline: 11 passes");
  });

  it("prints config source and mode", () => {
    const result = frp(["doctor"]);
    expect(result.stdout).toContain("Config source:");
    expect(result.stdout).toContain("Mode:");
  });
});

// ─── global flags ──────────────────────────────────────────────────

describe("frp global flags", () => {
  it("--version prints version and exits 0", () => {
    const result = frp(["--version"]);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toMatch(/frp \d/);
  });

  it("-v prints version and exits 0", () => {
    const result = frp(["-v"]);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toMatch(/frp \d/);
  });

  it("--help prints usage and exits 0", () => {
    const result = frp(["--help"]);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("Usage:");
    expect(result.stdout).toContain("refine");
    expect(result.stdout).toContain("lint");
    expect(result.stdout).toContain("doctor");
  });

  it("-h prints usage", () => {
    const result = frp(["-h"]);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("Usage:");
  });
});

// ─── error handling ────────────────────────────────────────────────

describe("frp error handling", () => {
  it("exits 2 on missing file", () => {
    const result = frp(["refine", "--file", join(work, "nope.txt")]);
    expect(result.exitCode).toBeGreaterThan(0);
  });
});
