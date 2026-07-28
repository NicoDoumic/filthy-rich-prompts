# Quickstart Guide

Get from zero to running in under **3 minutes**.

---

## 1. Prerequisites

> **For users:** just run `npx filthy-rich-prompts install`. Node.js 22+ and OpenCode 1.18.5+ are the only system requirements — pnpm is only needed for development.

| Requirement       | Minimum version | Check                    |
| ----------------- | --------------- | ------------------------ |
| Node.js           | 22+             | `node --version`         |
| OpenCode          | 1.18.5+         | `opencode --version`     |

**For contributors** — additional tools:

| Requirement       | Minimum version | Check                    |
| ----------------- | --------------- | ------------------------ |
| pnpm              | 10.13.1         | `pnpm --version`         |

### Enable pnpm (contributors only)

Open **cmd.exe** or PowerShell and run:

```cmd
corepack enable
corepack prepare pnpm@10.13.1 --activate
```

Verify:

```cmd
pnpm --version
```

If `corepack` is not recognized, install Node.js 22+ from [nodejs.org](https://nodejs.org) first — Corepack ships with Node.js 22+.

---

## 2. Install

### Option A — One-command install (recommended)

```cmd
npx filthy-rich-prompts install
```

This detects your OS, locates OpenCode, and installs both the skill and the auto-refine plugin in a single step. No file copying, no manual config editing.

```cmd
npx filthy-rich-prompts doctor     # Verify installation
npx filthy-rich-prompts update     # Update to latest
```

### Option B — Manual skill install only (no auto-refine)

```cmd
mkdir "%USERPROFILE%\.config\opencode\skills\prompt-refiner"
copy SKILL.md "%USERPROFILE%\.config\opencode\skills\prompt-refiner\SKILL.md"
```

Or per-project (committed to the repo):

```cmd
mkdir .opencode\skills\prompt-refiner
copy SKILL.md .opencode\skills\prompt-refiner\SKILL.md
```

---

## 3. Restart OpenCode

Config files are read at startup only. Close OpenCode completely (Ctrl+C if running in a terminal) and start it again.

---

## 4. Verify It's Working

Inside OpenCode, run:

```
opencode debug skill
```

You should see `prompt-refiner` in the list of discovered skills.

If you installed the auto-refine plugin, type any prompt — it will be automatically refined before reaching the model. Try:

```
fix the login it's slow and sometimes doesn't work
```

The refiner will restructure this into clear sections with context, symptoms, and deliverables.

---

## 5. Configure

Create `refine.config.json` in your project root to customize behavior:

```jsonc
{
  "mode": "expert",
  "passes": {
    "task-decomposition": true,
    "structure": { "style": "markdown" }
  },
  "output": {
    "diff": true,
    "explanations": true
  }
}
```

See [docs/configuration.md](configuration.md) for the full schema and [examples/configuration-examples.md](../examples/configuration-examples.md) for worked examples.

---

## 6. Disable Auto-Refine

Set `"autoRefine": false` in `opencode.json` and restart OpenCode:

```json
{
  "plugin": [["path/to/plugin.js", { "autoRefine": false }]]
}
```

The skill remains installed but inactive. You can still invoke it manually by asking OpenCode to use the `prompt-refiner` skill.

---

## 7. Next Steps

| Resource | What you'll find |
| -------- | ---------------- |
| [examples/](../examples/) | Worked before/after transformations with per-change rationale |
| [docs/architecture.md](architecture.md) | How the pipeline works internally |
| [docs/design-philosophy.md](design-philosophy.md) | The principles behind every design decision |
| [CONTRIBUTING.md](../CONTRIBUTING.md) | How to contribute a new refinement pass |
| [docs/troubleshooting.md](troubleshooting.md) | Solutions to common issues |