<div align="center">

# filthy-rich-prompts

### Prettier for prompts.

An OpenCode skill that turns messy human requests into high-quality AI instructions — **without ever changing what you meant**.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node: ≥22](https://img.shields.io/badge/Node-%E2%89%A522-green.svg)](package.json)
[![Status](https://img.shields.io/badge/status-v0.2.0--next.0-important.svg)](PLAN.md)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

<p>
  <a href="#quick-start">Quick start</a> ·
  <a href="#the-problem">Why</a> ·
  <a href="#what-it-is--what-it-is-not">What</a> ·
  <a href="#architecture">Architecture</a> ·
  <a href="#contributing">Contribute</a>
</p>

</div>

---

## Installation

The **one-command** path — goes from zero to working in under 60 seconds:

```bash
npx filthy-rich-prompts install
```

This detects your OS, locates OpenCode, installs the skill and auto-refine plugin, updates your config safely (preserves existing settings), and verifies the installation. Then restart OpenCode, and every prompt you type is automatically refined before reaching the model.

```bash
npx filthy-rich-prompts doctor    # Check installation health
npx filthy-rich-prompts update    # Update to latest
npx filthy-rich-prompts uninstall # Remove everything
```

**System requirements:** [Node.js 22+](https://nodejs.org), [OpenCode 1.18.5+](https://opencode.ai)

> **What gets installed:** (1) the `prompt-refiner` skill (SKILL.md), so you can invoke refinement manually, and (2) the auto-refine plugin, so every prompt is automatically refined when `autoRefine: true` is set. Both are set up by a single command.

| Platform | Status |
|----------|--------|
| Windows  | Supported |
| macOS    | Supported |
| Linux    | Supported |

**Troubleshooting:** [docs/troubleshooting.md](docs/troubleshooting.md)

---

## The Problem

LLM output quality is bounded by prompt quality. Humans, however, write prompts the way we think: vague, unstructured, missing context, with implicit constraints and compound requests mashed into a single paragraph.

Most "prompt improver" tools silently rewrite your request into something _different_ — adding requirements you never asked for, dropping details you cared about, or changing your goal entirely. That is not refinement. That is drift.

## Mission Statement

> **Transform raw human requests into high-quality AI instructions while provably preserving the user's original intent.**

We improve structure, clarity, constraints, objectives, context, terminology, ambiguity, and formatting — and _only_ those. We never change intent, never invent requirements, and never remove information.

## Vision

Become the standard preprocessing layer between every OpenCode user and the model — the skill everyone installs first, the way Prettier became a default in every JavaScript project. A community-driven, extensible refinement engine with a public benchmark, a plugin ecosystem, and documentation good enough to teach prompt engineering by reading it.

## What It Is / What It Is Not

| ✅ It is                                                              | ❌ It is not                                  |
| --------------------------------------------------------------------- | --------------------------------------------- |
| A deterministic-first pipeline of small, composable refinement passes | A single mega-prompt that rewrites everything |
| An intent-preserving normalizer                                       | A tool that changes your goals or scope       |
| Fully explainable — every change carries a reason                     | A black box                                   |
| Model-agnostic and local-first                                        | Tied to any one LLM vendor                    |
| Extensible via community plugins                                      | A closed monolith                             |

## A Taste

**Before**

> hey the app is kinda slow when I open the dashboard and sometimes it just spins forever lol. can you make it faster? also maybe fix the login bug where it logs me out. using react + node btw

**After** — same intent, same information, objectively better instructions:

```markdown
# Task: Diagnose and fix two issues (dashboard performance, login sessions)

## Context
- Stack: React frontend, Node.js backend
- Warning: the following are assumptions — correct them if wrong.

## Issue 1 — Dashboard performance
- Symptom: slow initial load; intermittently hangs indefinitely
- Investigate: frontend rendering vs. API latency vs. data volume

## Issue 2 — Login session
- Symptom: user is unexpectedly logged out
- Expected: session persists until explicit logout or documented expiry

## Deliverables
1. Root-cause hypothesis per issue, with evidence to gather
2. Smallest viable fix per issue
3. Measurements to verify improvement
```

Full transformations with per-change rationale: [examples/before-after/](examples/before-after/)

---

## Quick Start

### Install

```bash
npx filthy-rich-prompts install
```

### Restart OpenCode

Config is read at startup only. Close and restart.

### Verify

Inside OpenCode, run:

```
opencode debug skill
```

`prompt-refiner` should appear in the list. Type any prompt — it will be auto-refined.

### Disable

Set `"autoRefine": false` in `opencode.json` and restart. The skill stays installed for manual use.

**Full guide:** [docs/quickstart.md](docs/quickstart.md) · **Troubleshooting:** [docs/troubleshooting.md](docs/troubleshooting.md)

---

## Design Philosophy

1. **Intent is sacred.** The original prompt is never mutated; every transformation is diffable against it.
2. **Never invent requirements.** Inferred additions are marked as _suggestions_, never silently merged.
3. **Never remove information.** Even "unimportant" details are preserved or explicitly accounted for.
4. **Every change explains itself.** If a pass can't justify a change, it doesn't make it.
5. **Composability over cleverness.** Many small passes, each doing one thing well.
6. **Objective improvement, measurable.** Quality gains are scored, not vibes.
7. **Sensible defaults, total configurability.** Zero config to start; every pass is tunable.
8. **Local-first, model-agnostic.** Heuristic passes run anywhere; LLM-powered passes are opt-in.
9. **Zero-dependency core.** The engine installs anywhere, instantly.
10. **Docs are the product.** Contributor experience is a feature.

Full text: [docs/design-philosophy.md](docs/design-philosophy.md)

---

## Architecture

```
raw prompt
    │
    ▼
┌──────────────────────────────────────────────────────────────┐
│  REFINEMENT PIPELINE (composable passes, immutable context)   │
│                                                               │
│  DETECTION (non-mutating)                                     │
│   10 · intent detection                                       │
│   20 · ambiguity + missing-context detection                  │
│                                                               │
│  TRANSFORMATION (mutating, explained)                         │
│   30 · context enrichment                                     │
│   40 · constraint extraction + goal/role extraction           │
│   50 · structure + output formatting + task decomposition     │
│                                                               │
│  GENERATION                                                   │
│   60 · final prompt assembly                                  │
│   70 · verification (intent-preservation check)               │
└──────────────────────────────────────────────────────────────┘
    │
    ▼
refined prompt  +  diff  +  per-change explanations  +  quality report
```

Each pass is an independent unit that receives an immutable context and returns a result. New passes can be added by anyone **without modifying existing code**.

Full design: [docs/architecture.md](docs/architecture.md) · Plugin API: [docs/plugin-api.md](docs/plugin-api.md)

---

## FAQ

**What's the difference between "filthy-rich-prompts" and "prompt-refiner"?**

Two names, one project. `filthy-rich-prompts` is the brand (repo, package, CLI). `prompt-refiner` is the technical skill name (what OpenCode displays and what you type to invoke it).

**Does this send my prompts to an external API?**

No. The core pipeline (all 11 built-in passes) is heuristic-only — pure TypeScript, zero network requests, runs entirely offline. LLM-powered passes are opt-in.

**Can I use this without OpenCode?**

Currently, the primary integration is OpenCode. The standalone CLI (`frp`) is planned for a future release. The `refine()` function is exported from the package for programmatic use.

**How is this different from other prompt improvers?**

Most tools are single LLM calls that rewrite your prompt from scratch — changing intent, inventing requirements, dropping information. filthy-rich-prompts is a pipeline of small, composable, explained passes that never change your intent.

**Is there a CLI?**

Not yet. The `frp` binary (`frp refine`, `frp lint`, `frp doctor`) is planned. Current interface is the OpenCode skill + auto-refine plugin.

More: [docs/faq.md](docs/faq.md)

---

## Repository Layout

```
├── SKILL.md              # The skill contract — loadable by OpenCode
├── README.md             # You are here
├── CONTRIBUTING.md       # How to contribute
├── CODE_OF_CONDUCT.md    # Contributor Covenant 2.1
├── SECURITY.md           # Security policy
├── ROADMAP.md            # Milestones M0–M5
├── PLAN.md               # Actionable path to public release
├── CHANGELOG.md          # Keep-a-Changelog format
├── LICENSE               # MIT
├── docs/                 # Design specs, architecture, troubleshooting
├── examples/             # Worked before/after transformations
├── src/                  # Core engine, built-in passes, integrations
├── tests/                # Golden fixtures, property tests
├── scripts/              # Build, smoke, dependency checks
└── .github/              # Issue forms, PR template, CI workflows
```

## Status

**v0.3.0-next.0 — Phase 2 complete, M3+M4 in progress.** The full refinement pipeline (11 passes) is implemented, tested (177 tests, 6/6 property invariants, coverage gates), and verified to load in OpenCode 1.18.5. The path to a public 1.0 lives in **[PLAN.md](PLAN.md)**.

| Topic                      | Doc                                                                                             |
| -------------------------- | ----------------------------------------------------------------------------------------------- |
| **Path to public release** | **[PLAN.md](PLAN.md)**                                                                          |
| Architecture & pass model  | [docs/architecture.md](docs/architecture.md)                                                    |
| Design philosophy          | [docs/design-philosophy.md](docs/design-philosophy.md)                                          |
| Plugin API                 | [docs/plugin-api.md](docs/plugin-api.md)                                                        |
| Configuration format       | [docs/configuration.md](docs/configuration.md)                                                  |
| CLI design                 | [docs/cli-design.md](docs/cli-design.md)                                                        |
| Interactive TUI design     | [docs/tui-design.md](docs/tui-design.md)                                                        |
| Benchmarking methodology   | [docs/benchmarking.md](docs/benchmarking.md)                                                    |
| Evaluation metrics         | [docs/evaluation-metrics.md](docs/evaluation-metrics.md)                                        |
| Testing strategy           | [docs/testing-strategy.md](docs/testing-strategy.md)                                            |
| Development workflow       | [docs/development-workflow.md](docs/development-workflow.md)                                    |
| Coding standards           | [docs/coding-standards.md](docs/coding-standards.md)                                            |
| Versioning & releases      | [docs/versioning.md](docs/versioning.md) · [docs/release-strategy.md](docs/release-strategy.md) |
| Open questions             | [docs/open-questions.md](docs/open-questions.md)                                                |
| Milestones & build scope   | [ROADMAP.md](ROADMAP.md)                                                                        |
| Troubleshooting            | [docs/troubleshooting.md](docs/troubleshooting.md)                                              |
| FAQ                        | [docs/faq.md](docs/faq.md)                                                                      |

---

## Contributing

This project is designed to be contributed to. The most valuable contribution is a **new refinement pass** — see [CONTRIBUTING.md](CONTRIBUTING.md) and the [pass proposal template](.github/ISSUE_TEMPLATE/03-pass-proposal.yml). Good first issues are labeled `good first issue`.

## License

[MIT](LICENSE) — use it, fork it, ship it.

**Why MIT over Apache-2.0:** Apache-2.0's explicit patent grant is valuable for large corporate-backed projects, but it adds license length and contribution friction. MIT is the overwhelming norm in the TypeScript dev-tooling ecosystem (Prettier, ESLint, Vite), maximizes adoption and drive-by contributions, and keeps inbound = outbound licensing trivially understandable. If the project ever joins a foundation or attracts corporate IP concerns, relicensing to Apache-2.0 remains possible with contributor consent — the reverse path is much harder.
