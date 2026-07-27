/**
 * min-config — the MINIMAL config loader for the pre-release auto-refine toggle.
 *
 * This is deliberately a small subset of the M2 config design
 * (docs/configuration.md): it reads ONLY `autoRefine` from `refine.config.json`
 * using strict JSON — no JSONC comments, no full schema, no mode, no pass
 * toggles. The full 4-level precedence loader replaces this in M2; this file
 * exists so the pre-release toggle has a documented, conservative home.
 *
 * Precedence (highest wins): plugin options (handled in opencode-plugin.ts) →
 * project `<cwd>/refine.config.json` → user `~/.config/filthy-rich-prompts/
 * refine.config.json` → default OFF.
 */
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

export interface MinConfig {
  readonly autoRefine: boolean;
  /** Where the winning value came from: 'project' | 'user' | 'default'. */
  readonly source: "project" | "user" | "default";
  /** Set when a config file existed but could not be parsed (fail-soft to default). */
  readonly warning?: string;
}

const DEFAULTS = { autoRefine: false, source: "default" } as const;

function readAutoRefine(
  path: string,
): { autoRefine: boolean } | { warning: string } {
  let raw: string;
  try {
    raw = readFileSync(path, "utf8");
  } catch {
    return { warning: "unreadable" }; // file absent is normal — caller treats as not-found
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (
      parsed !== null &&
      typeof parsed === "object" &&
      "autoRefine" in parsed &&
      typeof (parsed as Record<string, unknown>).autoRefine === "boolean"
    ) {
      return { autoRefine: (parsed as { autoRefine: boolean }).autoRefine };
    }
    return { warning: `${path} has no boolean "autoRefine" field` };
  } catch {
    return {
      warning: `${path} is not valid JSON (strict mode in the pre-release; JSONC lands in M2)`,
    };
  }
}

/**
 * Resolves the minimal config for a working directory.
 * `userConfigPath` is injectable for tests; defaults to the real user path.
 */
export function loadMinConfig(cwd: string, userConfigPath?: string): MinConfig {
  const project = readAutoRefine(join(cwd, "refine.config.json"));
  if ("autoRefine" in project)
    return { autoRefine: project.autoRefine, source: "project" };
  if (project.warning !== "unreadable") {
    return { ...DEFAULTS, warning: project.warning };
  }

  const userPath =
    userConfigPath ??
    join(homedir(), ".config", "filthy-rich-prompts", "refine.config.json");
  const user = readAutoRefine(userPath);
  if ("autoRefine" in user)
    return { autoRefine: user.autoRefine, source: "user" };
  if (user.warning !== "unreadable") {
    return { ...DEFAULTS, warning: user.warning };
  }

  return { ...DEFAULTS };
}
