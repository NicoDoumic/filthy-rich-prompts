import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { resolveConfig, toResolvedConfig, loadMinConfig } from "./config-loader.js";

let work: string;

beforeEach(() => {
  work = mkdtempSync(join(tmpdir(), "frp-config-"));
});

afterEach(() => {
  rmSync(work, { recursive: true, force: true });
});

function writeConfig(dir: string, content: string): string {
  const path = join(dir, "refine.config.json");
  writeFileSync(path, content);
  return path;
}

// ─── resolveConfig ──────────────────────────────────────────────────

describe("resolveConfig", () => {
  it("returns defaults when no config files exist", () => {
    const result = resolveConfig(work, undefined, join(work, "nope.json"));
    expect(result.autoRefine).toBe(false);
    expect(result.mode).toBe("beginner");
    expect(result.source).toBe("default");
    expect(result.output).toEqual({ diff: true, explanations: true });
  });

  it("reads autoRefine from project config", () => {
    writeConfig(work, '{ "autoRefine": true }');
    const result = resolveConfig(work, undefined, join(work, "nope.json"));
    expect(result.autoRefine).toBe(true);
    expect(result.source).toBe("project");
  });

  it("reads mode from project config", () => {
    writeConfig(work, '{ "mode": "silent" }');
    const result = resolveConfig(work, undefined, join(work, "nope.json"));
    expect(result.mode).toBe("silent");
    expect(result.source).toBe("project");
  });

  it("rejects invalid mode values", () => {
    writeConfig(work, '{ "mode": "aggressive" }');
    const result = resolveConfig(work, undefined, join(work, "nope.json"));
    expect(result.mode).toBe("beginner"); // stays default
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it("reads pass toggles from project config", () => {
    writeConfig(work, '{ "passes": { "structure": false, "task-decomposition": false } }');
    const result = resolveConfig(work, undefined, join(work, "nope.json"));
    expect(result.passes).toEqual({ structure: false, "task-decomposition": false });
  });

  it("ignores non-boolean pass values", () => {
    writeConfig(work, '{ "passes": { "structure": "yes", "format": true } }');
    const result = resolveConfig(work, undefined, join(work, "nope.json"));
    expect(result.passes).toEqual({ format: true }); // structure ignored
  });

  it("merges user and project configs with project winning", () => {
    const userPath = join(work, "user-refine.config.json");
    writeFileSync(userPath, '{ "autoRefine": true, "mode": "silent" }');
    writeConfig(work, '{ "mode": "expert", "passes": { "structure": false } }');
    const result = resolveConfig(work, undefined, userPath);
    expect(result.autoRefine).toBe(true); // from user
    expect(result.mode).toBe("expert"); // project overrides user
    expect(result.passes).toEqual({ structure: false }); // from project
  });

  it("does not duplicate warnings", () => {
    // file absent is normal, no warning
    const result = resolveConfig(work, undefined, join(work, "nope.json"));
    expect(result.warnings).toEqual([]);
  });

  it("fails soft on malformed JSON", () => {
    writeConfig(work, "{ not json");
    const result = resolveConfig(work, undefined, join(work, "nope.json"));
    expect(result.autoRefine).toBe(false); // defaults
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it("applies programmatic RefineOptions as highest precedence", () => {
    writeConfig(work, '{ "mode": "silent", "passes": { "structure": false } }');
    const result = resolveConfig(work, { mode: "expert", passes: { "task-decomposition": false } });
    expect(result.mode).toBe("expert"); // CLI overrides
    expect(result.source).toBe("cli");
    expect(result.passes).toEqual({ structure: false, "task-decomposition": false }); // merged
  });

  it("reads output config", () => {
    writeConfig(work, '{ "output": { "diff": false, "explanations": false } }');
    const result = resolveConfig(work, undefined, join(work, "nope.json"));
    expect(result.output).toEqual({ diff: false, explanations: false });
  });

  it("defaults includeOriginal and minQuestions", () => {
    const result = resolveConfig(work, undefined, join(work, "nope.json"));
    expect(result.includeOriginal).toBe(true);
    expect(result.minQuestions).toBe(5);
  });

  it("reads includeOriginal and minQuestions from project config", () => {
    writeConfig(
      work,
      '{ "includeOriginal": false, "minQuestions": 8 }',
    );
    const result = resolveConfig(work, undefined, join(work, "nope.json"));
    expect(result.includeOriginal).toBe(false);
    expect(result.minQuestions).toBe(8);
    expect(result.source).toBe("project");
  });

  it("warns and keeps defaults on invalid minQuestions", () => {
    writeConfig(work, '{ "minQuestions": "lots" }');
    const result = resolveConfig(work, undefined, join(work, "nope.json"));
    expect(result.minQuestions).toBe(5);
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it("warns on invalid includeOriginal", () => {
    writeConfig(work, '{ "includeOriginal": "yes" }');
    const result = resolveConfig(work, undefined, join(work, "nope.json"));
    expect(result.includeOriginal).toBe(true); // stays default
    expect(result.warnings.join(" ")).toContain("invalid includeOriginal");
  });

  it("warns and ignores passes whose values are all invalid", () => {
    writeConfig(work, '{ "passes": { "structure": "yes" } }');
    const result = resolveConfig(work, undefined, join(work, "nope.json"));
    expect(result.passes).toEqual({}); // nothing accepted
    expect(result.warnings.join(" ")).toContain("invalid passes");
  });

  it("warns and keeps defaults on an invalid output object", () => {
    writeConfig(work, '{ "output": { "diff": "yes", "explanations": [] } }');
    const result = resolveConfig(work, undefined, join(work, "nope.json"));
    expect(result.output).toEqual({ diff: true, explanations: true });
    expect(result.warnings.join(" ")).toContain("invalid output");
  });

  it("warns on a JSON primitive instead of an object", () => {
    writeConfig(work, "123");
    const result = resolveConfig(work, undefined, join(work, "nope.json"));
    expect(result.warnings.join(" ")).toContain("is not a JSON object");
  });

  it("warns on a non-ENOENT file read error", () => {
    // Reading a directory throws EISDIR (not ENOENT) → read-error warning.
    const result = resolveConfig(work, undefined, work);
    expect(result.warnings.join(" ")).toContain("read error");
  });

  it("treats partial output config as valid", () => {
    writeConfig(work, '{ "output": { "diff": false } }');
    const result = resolveConfig(work, undefined, join(work, "nope.json"));
    expect(result.output.diff).toBe(false);
    expect(result.output.explanations).toBe(true); // default
  });

  it("ignores empty object as config", () => {
    writeConfig(work, "{}");
    const result = resolveConfig(work, undefined, join(work, "nope.json"));
    expect(result.mode).toBe("beginner");
    expect(result.source).toBe("default");
  });
});

// ─── toResolvedConfig ───────────────────────────────────────────────

describe("toResolvedConfig", () => {
  it("converts ConfigResult to ResolvedConfig", () => {
    writeConfig(work, '{ "mode": "beginner" }');
    const result = resolveConfig(work, undefined, join(work, "nope.json"));
    const resolved = toResolvedConfig(result, "1.0.0");
    expect(resolved.passes).toEqual({});
    expect(resolved.toolVersion).toBe("1.0.0");
    expect(resolved.mode).toBe("beginner");
    expect(resolved.output).toEqual({ diff: true, explanations: true });
  });

  it("omits mode when source is default", () => {
    const result = resolveConfig(work, undefined, join(work, "nope.json"));
    const resolved = toResolvedConfig(result, "1.0.0");
    expect(resolved.mode).toBeUndefined();
  });
});

// ─── loadMinConfig (backward compat) ─────────────────────────────────

describe("loadMinConfig", () => {
  it("defaults to OFF when no config file exists", () => {
    const config = loadMinConfig(work, join(work, "nope.json"));
    expect(config).toEqual({
      autoRefine: false,
      includeOriginal: true,
      minQuestions: 5,
      source: "default",
    });
  });

  it("reads autoRefine from the project config", () => {
    writeConfig(work, '{ "autoRefine": true }');
    const config = loadMinConfig(work, join(work, "nope.json"));
    expect(config).toEqual({
      autoRefine: true,
      includeOriginal: true,
      minQuestions: 5,
      source: "project",
    });
  });

  it("reads autoRefine from the user config when the project has none", () => {
    const userPath = join(work, "user-level-refine.config.json");
    writeFileSync(userPath, '{ "autoRefine": true }');
    const projectDir = mkdtempSync(join(tmpdir(), "frp-config-proj-"));
    try {
      const config = loadMinConfig(projectDir, userPath);
      expect(config).toEqual({
        autoRefine: true,
        includeOriginal: true,
        minQuestions: 5,
        source: "user",
      });
    } finally {
      rmSync(projectDir, { recursive: true, force: true });
    }
  });

  it("project config wins over user config", () => {
    const userPath = join(work, "user-refine.config.json");
    writeFileSync(userPath, '{ "autoRefine": true }');
    writeConfig(work, '{ "autoRefine": false }');
    const config = loadMinConfig(work, userPath);
    expect(config).toEqual({
      autoRefine: false,
      includeOriginal: true,
      minQuestions: 5,
      source: "project",
    });
  });

  it("fails soft to default with a warning on malformed JSON", () => {
    writeConfig(work, "{ not json");
    const config = loadMinConfig(work, join(work, "nope.json"));
    expect(config.autoRefine).toBe(false);
    expect(config.warning).toContain("not valid JSON");
  });

  it("carries includeOriginal and minQuestions through loadMinConfig", () => {
    writeConfig(work, '{ "includeOriginal": false, "minQuestions": 9 }');
    const config = loadMinConfig(work, join(work, "nope.json"));
    expect(config.includeOriginal).toBe(false);
    expect(config.minQuestions).toBe(9);
  });
});
