#!/usr/bin/env node
/**
 * frp — filthy-rich-prompts CLI.
 *
 *   frp refine "messy prompt"
 *   echo "messy" | frp refine
 *   frp lint "fix asap"
 *   frp doctor
 *
 * Thin shell over the core pipeline. Zero runtime dependencies.
 * Unix-native: stdin in, stdout out, pipe-safe, scriptable.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { refine } from "../index.js";
import { resolveConfig } from "../integrations/config-loader.js";
import { TOOL_VERSION } from "../core/version.js";

const USAGE = `\
Usage: frp <command> [options]

Commands:
  refine [prompt]    Refine a prompt (stdin or argument)
  lint [prompt]      Run diagnostics without transforming (exit 1 on findings)
  doctor             Audit environment, config, and installation

Options:
  --file <path>      Read prompt from file (aliases: -f)
  --mode <mode>      beginner | expert | silent
  --json             Output as JSON
  --help, -h         Show this help
  --version, -v      Show version

Examples:
  frp refine "fix the login bug"
  echo "fix the login bug" | frp refine
  frp lint --file messy.txt
  frp doctor

Docs: https://github.com/NicoDoumic/filthy-rich-prompts
`;

function help(): never {
  process.stdout.write(USAGE);
  process.exit(0);
}

function version(): never {
  process.stdout.write(`frp ${TOOL_VERSION}\n`);
  process.exit(0);
}

function readPrompt(filePath?: string, positional?: string): string {
  if (filePath) {
    try {
      return readFileSync(resolve(filePath), "utf-8");
    } catch (err) {
      process.stderr.write(`Error: cannot read file "${filePath}": ${(err as Error).message}\n`);
      process.exit(2);
    }
  }
  if (positional && positional.length > 0) {
    return positional;
  }
  // Read from stdin
  try {
    const stdin = process.stdin;
    if (stdin.isTTY) {
      process.stderr.write("No input provided (stdin is a terminal). Pipe a prompt or provide an argument.\n");
      process.exit(2);
    }
    stdin.resume();
    return readFileSync(0, "utf-8");
  } catch {
    process.stderr.write("Could not read from stdin.\n");
    process.exit(2);
  }
}

// ─── Commands ──────────────────────────────────────────────────────

function findFileIndex(args: string[]): number {
  const long = args.indexOf("--file");
  const short = args.indexOf("-f");
  return long !== -1 ? long : short;
}

async function cmdRefine(args: string[]) {
  const json = args.includes("--json");
  const fileIdx = findFileIndex(args);
  const filePath = fileIdx !== -1 ? args[fileIdx + 1] : undefined;
  const modeIdx = args.indexOf("--mode");
  const mode = modeIdx !== -1 ? args[modeIdx + 1] : undefined;
  const positional = args.filter((a, i) =>
    !a.startsWith("-") &&
    a !== "refine" &&
    i !== fileIdx + 1 &&
    i !== modeIdx + 1,
  );

  const raw = readPrompt(filePath, positional[0]);

  const options: Record<string, unknown> = {};
  if (mode) options.mode = mode;
  if (json) options.output = { diff: true, explanations: true };

  const result = await refine(raw, options as Parameters<typeof refine>[1]);

  if (json) {
    process.stdout.write(JSON.stringify({
      refined: result.refined,
      diff: result.diff,
      explanations: result.explanations,
      report: result.report,
    }, null, 2) + "\n");
  } else {
    process.stdout.write(result.refined + "\n");
  }
}

async function cmdLint(args: string[]) {
  const fileIdx = findFileIndex(args);
  const filePath = fileIdx !== -1 ? args[fileIdx + 1] : undefined;
  const positional = args.filter((a) =>
    !a.startsWith("-") && a !== "lint" && a !== filePath,
  );

  const raw = readPrompt(filePath, positional[0]);
  const result = await refine(raw);

  const diagnostics = result.report.diagnostics ?? [];

  if (diagnostics.length === 0) {
    process.exit(0);
  }

  for (const d of diagnostics) {
    const prefix = d.severity === "blocking" ? "✗" : d.severity === "warning" ? "⚠" : "ℹ";
    process.stderr.write(`${prefix} ${d.code}: ${d.message}\n`);
  }

  process.exit(1);
}

async function cmdDoctor() {
  process.stdout.write(`frp v${TOOL_VERSION}\n`);
  process.stdout.write(`Node.js ${process.version}\n`);
  process.stdout.write(`Platform: ${process.platform}\n\n`);

  const resolved = resolveConfig(process.cwd());
  process.stdout.write(`Config source: ${resolved.source}\n`);
  process.stdout.write(`Mode: ${resolved.mode}\n`);
  process.stdout.write(`Auto-refine: ${resolved.autoRefine ? "on" : "off"}\n`);
  process.stdout.write(`Passes: ${Object.keys(resolved.passes).length} overrides\n`);

  if (resolved.warnings.length > 0) {
    process.stdout.write(`\nWarnings:\n`);
    for (const w of resolved.warnings) {
      process.stdout.write(`  ⚠ ${w}\n`);
    }
  }

  process.stdout.write(`\nPipeline: 11 passes (heuristic-only, zero network requests)\n`);
}

// ─── Main ──────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const command = args[0] ?? "--help";

  // Global flags
  if (args.includes("--help") || args.includes("-h")) help();
  if (args.includes("--version") || args.includes("-v")) version();

  switch (command) {
    case "refine":
      await cmdRefine(args);
      break;
    case "lint":
      await cmdLint(args);
      break;
    case "doctor":
      await cmdDoctor();
      break;
    default:
      help();
  }
}

main().catch((err) => {
  process.stderr.write(`Error: ${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(4);
});
