#!/usr/bin/env node
/**
 * filthy-rich-prompts — Installer / Uninstaller / Updater CLI
 *
 * npx filthy-rich-prompts install   [--project]
 * npx filthy-rich-prompts uninstall
 * npx filthy-rich-prompts update
 * npx filthy-rich-prompts doctor
 *
 * Detects the operating system, locates OpenCode, installs the skill
 * and auto-refine plugin, and updates configuration safely.
 *
 * The official one-command installation for filthy-rich-prompts.
 * Works on Windows, macOS, and Linux.
 */

import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  copyFileSync,
  readFileSync,
  writeFileSync,
  rmSync,
  statSync,
} from "node:fs";
import { homedir, platform } from "node:os";
import { join } from "node:path";

// ─── Helpers ────────────────────────────────────────────────────────

function home(...parts: string[]): string {
  return join(homedir(), ...parts);
}

function getOpenCodeDirs(project?: boolean) {
  const os = platform();
  if (project) {
    const cwd = process.cwd();
    return {
      configDir: join(cwd, ".opencode"),
      skillDir: join(cwd, ".opencode", "skills"),
      pluginDir: join(cwd, ".opencode", "plugin"),
      configFile: join(cwd, ".opencode", "opencode.json"),
    };
  }
  if (os === "win32") {
    const appdata = process.env.APPDATA || home("AppData", "Roaming");
    return {
      configDir: join(appdata, "opencode"),
      skillDir: join(appdata, "opencode", "skills"),
      pluginDir: join(appdata, "opencode", "plugin"),
      configFile: join(appdata, "opencode", "opencode.json"),
    };
  }
  return {
    configDir: home(".config", "opencode"),
    skillDir: home(".config", "opencode", "skills"),
    pluginDir: home(".config", "opencode", "plugin"),
    configFile: home(".config", "opencode", "opencode.json"),
  };
}

function detectOpenCode(): { found: boolean; version?: string } {
  try {
    const out = execFileSync("opencode", ["--version"], {
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    return { found: true, version: out.trim() };
  } catch {
    return { found: false };
  }
}

function detectPackageRoot(): string {
  // When run via npx, import.meta.url points into the installed package.
  const candidate = new URL(".", import.meta.url).pathname;
  // On Windows, the pathname starts with a leading slash after the drive letter.
  const normalized = process.platform === "win32" && candidate.startsWith("/")
    ? candidate.slice(1)
    : candidate;
  let dir = normalized;
  for (let i = 0; i < 5; i++) {
    if (existsSync(join(dir, "package.json"))) {
      return dir;
    }
    dir = join(dir, "..");
  }
  return process.cwd();
}

function getVersion(): string {
  try {
    const pkgRoot = detectPackageRoot();
    const pkg = JSON.parse(readFileSync(join(pkgRoot, "package.json"), "utf-8"));
    return pkg.version || "unknown";
  } catch {
    return "unknown";
  }
}

// ─── Print helpers ──────────────────────────────────────────────────

const colors = {
  green: (s: string) => `\x1b[32m${s}\x1b[0m`,
  red: (s: string) => `\x1b[31m${s}\x1b[0m`,
  yellow: (s: string) => `\x1b[33m${s}\x1b[0m`,
  cyan: (s: string) => `\x1b[36m${s}\x1b[0m`,
  bold: (s: string) => `\x1b[1m${s}\x1b[0m`,
  dim: (s: string) => `\x1b[2m${s}\x1b[0m`,
};

const noColors: typeof colors = {
  green: (s: string) => s,
  red: (s: string) => s,
  yellow: (s: string) => s,
  cyan: (s: string) => s,
  bold: (s: string) => s,
  dim: (s: string) => s,
};

function useColors(): typeof colors {
  return process.stdout.isTTY ? colors : noColors;
}

function banner(c: typeof colors, title: string) {
  const version = getVersion();
  console.log(c.cyan(`\n  ╭──────────────────────────────────────────╮`));
  console.log(c.cyan(`  │  ${c.bold("filthy-rich-prompts")} ${title.padEnd(22)}  │`));
  console.log(c.cyan(`  │  v${(version || "0.0.0").padEnd(38)}  │`));
  console.log(c.cyan(`  ╰──────────────────────────────────────────╯\n`));
}

// ─── Verify Installation ─────────────────────────────────────────────

interface VerificationResult {
  pass: boolean;
  checks: { label: string; status: "ok" | "warn" | "fail"; detail: string }[];
}

function verifyInstall(opencodeDirs: ReturnType<typeof getOpenCodeDirs>): VerificationResult {
  const checks: VerificationResult["checks"] = [];

  // 1. Check OpenCode binary
  const oc = detectOpenCode();
  if (oc.found) {
    checks.push({ label: "OpenCode", status: "ok", detail: oc.version || "installed" });
  } else {
    checks.push({ label: "OpenCode", status: "fail", detail: "not found in PATH" });
  }

  // 2. Check skill
  const skillPath = join(opencodeDirs.skillDir, "prompt-refiner", "SKILL.md");
  if (existsSync(skillPath)) {
    const size = statSync(skillPath).size;
    checks.push({ label: "Skill (SKILL.md)", status: "ok", detail: `${size} bytes` });
  } else {
    checks.push({ label: "Skill (SKILL.md)", status: "fail", detail: "not found" });
  }

  // 3. Check plugin
  const pluginPath = join(opencodeDirs.pluginDir, "filthy-rich-prompts.js");
  if (existsSync(pluginPath)) {
    const size = statSync(pluginPath).size;
    checks.push({ label: "Plugin", status: "ok", detail: `${size} bytes` });
  } else {
    checks.push({ label: "Plugin", status: "warn", detail: "not installed (optional)" });
  }

  // 4. Check config
  const configPath = opencodeDirs.configFile;
  if (existsSync(configPath)) {
    try {
      const cfg = JSON.parse(readFileSync(configPath, "utf-8"));
      const hasPlugin = (cfg.plugin ?? []).some(
        (p: unknown) => Array.isArray(p) && typeof p[0] === "string" && p[0].includes("filthy-rich-prompts"),
      );
      checks.push({
        label: "Config",
        status: hasPlugin ? "ok" : "warn",
        detail: hasPlugin ? "plugin registered" : "plugin not in config",
      });
    } catch {
      checks.push({ label: "Config", status: "fail", detail: "invalid JSON" });
    }
  } else {
    checks.push({ label: "Config", status: "warn", detail: "no opencode.json found" });
  }

  const pass = checks.every((ch) => ch.status !== "fail");
  return { pass, checks };
}

// ─── Install Logic ──────────────────────────────────────────────────

async function cmdInstall(project: boolean) {
  const c = useColors();
  banner(c, "Installer");

  const os = platform();
  const label = project ? "project" : "global";
  console.log(`  ${c.dim("→")} OS: ${os === "win32" ? "Windows" : os === "darwin" ? "macOS" : "Linux"} · ${label} install`);

  const opencodeDirs = getOpenCodeDirs(project);
  const pkgRoot = detectPackageRoot();

  // Step 1: Check OpenCode
  const oc = detectOpenCode();
  if (!oc.found) {
    console.log(`  ${c.yellow("⚠")} OpenCode CLI not found in PATH`);
    console.log(`    ${c.dim("→")} Install OpenCode from https://opencode.ai`);
    console.log(`    ${c.dim("→")} The skill will be installed but won't activate until OpenCode is available.`);
  } else {
    console.log(`  ${c.green("✓")} OpenCode detected ${c.dim(`(${oc.version})`)}`);
  }

  // Step 2: Install skill
  const skillSource = join(pkgRoot, "SKILL.md");
  const skillDest = join(opencodeDirs.skillDir, "prompt-refiner", "SKILL.md");

  mkdirSync(join(opencodeDirs.skillDir, "prompt-refiner"), { recursive: true });
  if (existsSync(skillSource)) {
    copyFileSync(skillSource, skillDest);
    console.log(`  ${c.green("✓")} Skill installed → ${c.dim(skillDest)}`);
  } else {
    console.log(`  ${c.yellow("⚠")} SKILL.md not found in package — skill not installed`);
    console.log(`    ${c.dim("→")} Try reinstalling the package or running from the repo root.`);
  }

  // Step 3: Install plugin
  const pluginDest = join(opencodeDirs.pluginDir, "filthy-rich-prompts.js");
  const pluginSource = join(pkgRoot, "dist", "opencode-plugin.js");

  if (existsSync(pluginSource)) {
    mkdirSync(opencodeDirs.pluginDir, { recursive: true });
    copyFileSync(pluginSource, pluginDest);
    console.log(`  ${c.green("✓")} Plugin installed → ${c.dim(pluginDest)}`);
  } else {
    console.log(`  ${c.yellow("⚠")} Plugin bundle not found`);
    console.log(`    ${c.dim("→")} The plugin requires a build step. From the repo, run: pnpm build`);
    console.log(`    ${c.dim("→")} Then run: npx filthy-rich-prompts install`);
  }

  // Step 4: Update config — preserve existing
  const configPath = opencodeDirs.configFile;
  let config: Record<string, unknown> = {};

  if (existsSync(configPath)) {
    try {
      config = JSON.parse(readFileSync(configPath, "utf-8"));
      console.log(`  ${c.dim("→")} Existing config found at ${configPath}`);
    } catch {
      console.log(`  ${c.yellow("⚠")} Could not parse existing config — creating new`);
      config = {};
    }
  }

  const pluginEntry = [pluginDest, { autoRefine: true }];
  const existingPlugins: unknown[][] = (config.plugin as unknown[][]) ?? [];
  const alreadyInstalled = existingPlugins.some(
    (p: unknown) => Array.isArray(p) && p[0] === pluginDest,
  );

  if (alreadyInstalled) {
    console.log(`  ${c.green("✓")} Plugin already registered in config`);
  } else {
    config.plugin = [...existingPlugins, pluginEntry];
    mkdirSync(opencodeDirs.configDir, { recursive: true });
    writeFileSync(configPath, JSON.stringify(config, null, 2) + "\n", "utf-8");
    console.log(`  ${c.green("✓")} Config updated → ${c.dim(configPath)}`);
  }

  // Step 5: Verify
  console.log(`\n  ${c.bold("── Verification ──")}\n`);
  const result = verifyInstall(opencodeDirs);
  for (const check of result.checks) {
    const icon = check.status === "ok" ? c.green("✓") : check.status === "warn" ? c.yellow("⚠") : c.red("✗");
    console.log(`  ${icon} ${check.label.padEnd(20)} ${c.dim(check.detail)}`);
  }

  // Summary
  console.log(`\n  ${c.bold("── Installation complete ──")}\n`);
  if (result.pass) {
    console.log(`  ${c.green("✓")} OpenCode skill:     ${c.dim(skillDest)}`);
    console.log(`  ${c.green("✓")} Auto-refine plugin: ${c.dim(pluginDest)}`);
    console.log(`  ${c.green("✓")} Config:         ${c.dim(configPath)}`);
    console.log(`\n  ${c.bold("Next steps:")}`);
    console.log(`  1. ${c.cyan("Restart OpenCode")} ${c.dim("(config is read at startup only)")}`);
    console.log(`  2. Inside OpenCode, run: ${c.cyan('opencode debug skill')} ${c.dim("→ verify")} ${c.bold("prompt-refiner")} ${c.dim("appears")}`);
    console.log(`  3. Type any prompt — it will be auto-refined before reaching the model`);
  } else {
    console.log(`  ${c.yellow("⚠")} Some checks failed. Review the verification output above.`);
  }
  console.log(`\n  ${c.dim("To disable:")} set ${c.dim('"autoRefine": false')} in ${c.dim("opencode.json")} and restart`);
  console.log(`  ${c.dim("To uninstall:")} npx filthy-rich-prompts uninstall`);
  console.log(`  ${c.dim("To update:")} npx filthy-rich-prompts update\n`);
}

// ─── Update Logic ────────────────────────────────────────────────────

async function cmdUpdate(project: boolean) {
  const c = useColors();
  banner(c, "Updater");

  const opencodeDirs = getOpenCodeDirs(project);
  const pkgRoot = detectPackageRoot();

  let updated = false;

  // Update skill
  const skillSource = join(pkgRoot, "SKILL.md");
  const skillDest = join(opencodeDirs.skillDir, "prompt-refiner", "SKILL.md");
  if (existsSync(skillSource) && existsSync(skillDest)) {
    const srcContent = readFileSync(skillSource, "utf-8");
    const destContent = readFileSync(skillDest, "utf-8");
    if (srcContent !== destContent) {
      copyFileSync(skillSource, skillDest);
      console.log(`  ${c.green("✓")} Skill updated → ${c.dim(skillDest)}`);
      updated = true;
    } else {
      console.log(`  ${c.green("✓")} Skill is up to date`);
    }
  } else if (existsSync(skillSource)) {
    mkdirSync(join(opencodeDirs.skillDir, "prompt-refiner"), { recursive: true });
    copyFileSync(skillSource, skillDest);
    console.log(`  ${c.green("✓")} Skill installed (was missing) → ${c.dim(skillDest)}`);
    updated = true;
  } else {
    console.log(`  ${c.yellow("⚠")} SKILL.md not found in package`);
  }

  // Update plugin
  const pluginSource = join(pkgRoot, "dist", "opencode-plugin.js");
  const pluginDest = join(opencodeDirs.pluginDir, "filthy-rich-prompts.js");
  if (existsSync(pluginSource) && existsSync(pluginDest)) {
    const srcContent = readFileSync(pluginSource, "utf-8");
    const destContent = readFileSync(pluginDest, "utf-8");
    if (srcContent !== destContent) {
      mkdirSync(opencodeDirs.pluginDir, { recursive: true });
      copyFileSync(pluginSource, pluginDest);
      console.log(`  ${c.green("✓")} Plugin updated → ${c.dim(pluginDest)}`);
      updated = true;
    } else {
      console.log(`  ${c.green("✓")} Plugin is up to date`);
    }
  } else if (existsSync(pluginSource)) {
    mkdirSync(opencodeDirs.pluginDir, { recursive: true });
    copyFileSync(pluginSource, pluginDest);
    console.log(`  ${c.green("✓")} Plugin installed (was missing) → ${c.dim(pluginDest)}`);
    updated = true;
  } else {
    console.log(`  ${c.dim("—")} Plugin not found in package — skipping (optional)`);
  }

  if (updated) {
    console.log(`\n  ${c.bold("── Update complete ──")}`);
    console.log(`  ${c.dim("Restart OpenCode to apply changes.")}\n`);
  } else {
    console.log(`\n  ${c.green("✓")} Everything is up to date.\n`);
  }
}

// ─── Doctor Logic ────────────────────────────────────────────────────

async function cmdDoctor(project: boolean) {
  const c = useColors();
  banner(c, "Doctor");

  const os = platform();
  console.log(`  ${c.dim("→")} OS: ${os === "win32" ? "Windows" : os === "darwin" ? "macOS" : "Linux"}`);
  console.log(`  ${c.dim("→")} Node.js: ${process.version}`);
  console.log(`  ${c.dim("→")} Version: ${getVersion()}`);

  const opencodeDirs = getOpenCodeDirs(project);

  console.log(`\n  ${c.bold("── Checks ──")}\n`);
  const result = verifyInstall(opencodeDirs);
  for (const check of result.checks) {
    const icon = check.status === "ok" ? c.green("✓") : check.status === "warn" ? c.yellow("⚠") : c.red("✗");
    console.log(`  ${icon} ${check.label.padEnd(20)} ${c.dim(check.detail)}`);
  }

  console.log(`\n  ${c.bold("── Paths ──")}\n`);
  console.log(`  Config:   ${c.dim(opencodeDirs.configFile)}`);
  console.log(`  Skill:    ${c.dim(join(opencodeDirs.skillDir, "prompt-refiner", "SKILL.md"))}`);
  console.log(`  Plugin:   ${c.dim(join(opencodeDirs.pluginDir, "filthy-rich-prompts.js"))}`);

  if (result.pass) {
    console.log(`\n  ${c.green("✓")} Installation looks healthy.\n`);
  } else {
    console.log(`\n  ${c.yellow("⚠")} Some checks failed. Run ${c.cyan("npx filthy-rich-prompts install")} to fix.\n`);
  }
}

// ─── Uninstall Logic ────────────────────────────────────────────────

async function cmdUninstall() {
  const c = useColors();
  banner(c, "Uninstaller");

  const opencodeDirs = getOpenCodeDirs();

  const skillPath = join(opencodeDirs.skillDir, "prompt-refiner", "SKILL.md");
  if (existsSync(skillPath)) {
    rmSync(skillPath);
    console.log(`  ${c.green("✓")} Skill removed`);
  } else {
    console.log(`  ${c.dim("—")} Skill not found — nothing to remove`);
  }

    // Also remove the skill directory if empty
    const skillDir = join(opencodeDirs.skillDir, "prompt-refiner");
    try {
      rmSync(skillDir, { force: true });
    } catch {
      // Directory doesn't exist — fine.
    }

  const pluginPath = join(opencodeDirs.pluginDir, "filthy-rich-prompts.js");
  if (existsSync(pluginPath)) {
    rmSync(pluginPath);
    console.log(`  ${c.green("✓")} Plugin removed`);
  } else {
    console.log(`  ${c.dim("—")} Plugin not found — nothing to remove`);
  }

  const configPath = opencodeDirs.configFile;
  if (existsSync(configPath)) {
    try {
      const config = JSON.parse(readFileSync(configPath, "utf-8"));
      const before = (config.plugin ?? []).length;
      config.plugin = (config.plugin ?? []).filter(
        (p: unknown) =>
          !(Array.isArray(p) && typeof p[0] === "string" && p[0].includes("filthy-rich-prompts")),
      );
      const after = config.plugin.length;
      if (after < before) {
        writeFileSync(configPath, JSON.stringify(config, null, 2) + "\n", "utf-8");
        console.log(`  ${c.green("✓")} Config cleaned — plugin entry removed`);
      } else {
        console.log(`  ${c.dim("—")} No plugin entry found in config`);
      }
    } catch {
      console.log(`  ${c.yellow("⚠")} Could not parse config — clean manually at ${configPath}`);
    }
  }

  console.log(`\n  ${c.bold("── Uninstall complete ──")}\n`);
  console.log(`  ${c.dim("OpenCode skill and auto-refine plugin have been removed.")}`);
  console.log(`  ${c.dim("Restart OpenCode for changes to take effect.")}\n`);
}

// ─── Main ───────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const command = args[0] ?? "install";
  const project = args.includes("--project");

  switch (command) {
    case "install":
      await cmdInstall(project);
      break;
    case "uninstall":
      await cmdUninstall();
      break;
    case "update":
      await cmdUpdate(project);
      break;
    case "doctor":
      await cmdDoctor(project);
      break;
    case "--help":
    case "help":
    case "-h": {
      const version = getVersion();
      console.log(`
  ${"\x1b[1m"}filthy-rich-prompts${"\x1b[0m"} v${version}  —  Prettier for prompts

  ${"\x1b[4m"}Usage:${"\x1b[0m"} npx filthy-rich-prompts <command> [options]

  ${"\x1b[4m"}Commands:${"\x1b[0m"}
    install       Install the skill and auto-refine plugin (default: global)
    uninstall     Remove the skill and plugin
    update        Update the skill and plugin to the latest version
    doctor        Verify your installation is healthy

  ${"\x1b[4m"}Options:${"\x1b[0m"}
    --project     Install/update in the current project (.opencode/) instead of globally
    --help, -h    Show this help message

  ${"\x1b[4m"}Examples:${"\x1b[0m"}
    npx filthy-rich-prompts install                # Global install (recommended)
    npx filthy-rich-prompts install --project      # Per-project install
    npx filthy-rich-prompts doctor                 # Check installation health
    npx filthy-rich-prompts update                 # Update to latest
    npx filthy-rich-prompts uninstall              # Remove everything

  ${"\x1b[2m"}Docs: https://github.com/NicoDoumic/filthy-rich-prompts${"\x1b[0m"}
      `);
      break;
    }
    default:
      console.error(
        `Unknown command: ${command}. Use "install", "uninstall", "update", or "doctor".`,
      );
      process.exit(1);
  }
}

main().catch((err) => {
  console.error("Operation failed:", err instanceof Error ? err.message : err);
  process.exit(1);
});