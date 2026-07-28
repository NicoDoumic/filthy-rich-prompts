/**
 * config-loader — resolves `refine.config.json` with 4-level precedence.
 *
 * Precedence (highest wins):
 *   1. RefineOptions (programmatic, passed to refine())
 *   2. Project config: `<cwd>/refine.config.json`
 *   3. User config: `~/.config/filthy-rich-prompts/refine.config.json`
 *   4. Defaults
 *
 * Fail-soft: malformed JSON or invalid values produce a warning, not a crash.
 * The full schema includes mode, per-pass toggles, output flags, and model
 * config stub. Pass options (e.g. `{ structure: { style: "markdown" } }`)
 * are future — only boolean toggles are supported today.
 */
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import type { ResolvedConfig, RefineOptions } from "../core/types.js";

// ─── Schema types ───────────────────────────────────────────────────

interface RawConfig {
  autoRefine?: boolean;
  mode?: string;
  passes?: Record<string, boolean>;
  output?: { diff?: boolean; explanations?: boolean };
  model?: { provider?: string };
}

interface ConfigResult {
  autoRefine: boolean;
  mode: string;
  passes: Record<string, boolean>;
  output: { diff: boolean; explanations: boolean };
  model: { provider: string };
  source: "cli" | "project" | "user" | "default";
  warnings: string[];
}

type ConfigFileResult =
  | { ok: true; data: RawConfig }
  | { ok: false; warning: string };

// ─── Defaults ───────────────────────────────────────────────────────

const DEFAULTS: ConfigResult = {
  autoRefine: false,
  mode: "beginner",
  passes: {},
  output: { diff: true, explanations: true },
  model: { provider: "" },
  source: "default",
  warnings: [],
};

// ─── File reader ────────────────────────────────────────────────────

function readConfigFile(path: string): ConfigFileResult {
  let raw: string;
  try {
    raw = readFileSync(path, "utf8");
  } catch {
    return { ok: false, warning: "" }; // file absent is normal — caller treats as not-found
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (parsed === null || typeof parsed !== "object") {
      return { ok: false, warning: `${path} is not a JSON object` };
    }
    return { ok: true, data: parsed as RawConfig };
  } catch {
    return { ok: false, warning: `${path} is not valid JSON` };
  }
}

// ─── Validators ─────────────────────────────────────────────────────

function validateMode(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const valid = ["beginner", "expert", "silent"];
  return valid.includes(value) ? value : undefined;
}

function validatePasses(
  value: unknown,
): Record<string, boolean> | undefined {
  if (value === null || typeof value !== "object" || Array.isArray(value))
    return undefined;
  const passes: Record<string, boolean> = {};
  for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
    if (typeof val === "boolean") {
      passes[key] = val;
    }
  }
  return Object.keys(passes).length > 0 ? passes : undefined;
}

function validateOutput(
  value: unknown,
): { diff: boolean; explanations: boolean } | undefined {
  if (value === null || typeof value !== "object" || Array.isArray(value))
    return undefined;
  const obj = value as Record<string, unknown>;
  if (
    typeof obj.diff !== "boolean" &&
    typeof obj.explanations !== "boolean"
  )
    return undefined;
  return {
    diff: typeof obj.diff === "boolean" ? obj.diff : true,
    explanations:
      typeof obj.explanations === "boolean" ? obj.explanations : true,
  };
}

// ─── Merge ──────────────────────────────────────────────────────────

function applyConfigFile(
  result: ConfigResult,
  file: ConfigFileResult,
  source: "project" | "user",
): ConfigResult {
  if (!file.ok || !file.data) return result;
  const next = { ...result, warnings: [...result.warnings] };
  const d = file.data;
  let touched = false;

  if (typeof d.autoRefine === "boolean") {
    next.autoRefine = d.autoRefine;
    touched = true;
  }
  if (d.mode !== undefined) {
    const v = validateMode(d.mode);
    if (v) { next.mode = v; touched = true; }
    else next.warnings.push(`${source} config: invalid mode "${d.mode}"`);
  }
  if (d.passes !== undefined && d.passes !== null) {
    const v = validatePasses(d.passes);
    if (v) { next.passes = { ...next.passes, ...v }; touched = true; }
    else next.warnings.push(`${source} config: invalid passes`);
  }
  if (d.output !== undefined) {
    const v = validateOutput(d.output);
    if (v) { next.output = v; touched = true; }
    else next.warnings.push(`${source} config: invalid output`);
  }

  if (touched) next.source = source;
  return next;
}

// ─── Resolve ────────────────────────────────────────────────────────

export function resolveConfig(
  cwd: string,
  options?: RefineOptions,
  userConfigPath?: string,
): ConfigResult {
  let result = { ...DEFAULTS, warnings: [] as string[] };

  // Level 4: user config
  const userPath =
    userConfigPath ??
    join(homedir(), ".config", "filthy-rich-prompts", "refine.config.json");
  const userFile = readConfigFile(userPath);
  if (userFile.ok) result = applyConfigFile(result, userFile, "user");
  else if (userFile.warning) result.warnings.push(userFile.warning);

  // Level 3: project config
  const projectFile = readConfigFile(join(cwd, "refine.config.json"));
  if (projectFile.ok) result = applyConfigFile(result, projectFile, "project");
  else if (projectFile.warning) result.warnings.push(projectFile.warning);

  // Level 2: programmatic options (RefineOptions)
  if (options?.passes) {
    result.passes = { ...result.passes, ...options.passes };
  }
  if (options?.mode) {
    const v = validateMode(options.mode);
    if (v) {
      result.mode = v;
      result.source = "cli";
    }
  }

  return result;
}

// ─── Build ResolvedConfig ────────────────────────────────────────────

export function toResolvedConfig(
  result: ConfigResult,
  toolVersion: string,
): ResolvedConfig {
  return {
    passes: result.passes,
    toolVersion,
    ...(result.source !== "default" && result.mode
      ? { mode: result.mode }
      : {}),
    output: result.output,
  };
}

// ─── Backward-compat adapter for opencode-plugin ─────────────────────

export interface MinConfig {
  readonly autoRefine: boolean;
  readonly source: "project" | "user" | "default";
  readonly warning?: string;
}

export function loadMinConfig(cwd: string, userConfigPath?: string): MinConfig {
  const result = resolveConfig(cwd, undefined, userConfigPath);
  const source: "project" | "user" | "default" =
    result.source === "cli" ? "project" : result.source;
  return {
    autoRefine: result.autoRefine,
    source,
    ...(result.warnings.length > 0
      ? { warning: result.warnings.join("; ") }
      : {}),
  };
}
