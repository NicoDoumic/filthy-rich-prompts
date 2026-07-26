<div align="center">

# filthy-rich-prompts

### Prettier for prompts.

An OpenCode skill that turns messy human requests into high-quality AI instructions — **without ever changing what you meant**.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Status](https://img.shields.io/badge/status-phase%200%20%C2%B7%20design-blue.svg)](ROADMAP.md)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

</div>

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

## The Name

Three candidates were considered:

| Candidate                     | Assessment                                                                                                                                         |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`filthy-rich-prompts`** ✅  | Chosen. Memorable, ownable in search results, and "rich" literally means _enriched_ — which is the product. Brand name for the repo and community. |
| `opencode-prompt-refiner`     | Descriptive and SEO-friendly, but generic and forgettable; reads like one skill among hundreds rather than a standard.                             |
| `promptforge` / `promptsmith` | Catchy, but crowded namespaces on npm and GitHub — discoverability would fight entrenched projects.                                                |

Two names are used on purpose: **`filthy-rich-prompts`** is the brand (repo, package, CLI), while **`prompt-refiner`** is the technical skill name (SKILL.md frontmatter, config keys) — what OpenCode displays and what users type.

> ⚠️ **Before publishing:** the original working directory was named `filthy-rich-promts` (typo). Rename the folder to `filthy-rich-prompts` before `git init` and pushing to GitHub, so the remote matches the brand everywhere.

## Design Philosophy

The short version — the full text lives in [docs/design-philosophy.md](docs/design-philosophy.md):

1. **Intent is sacred.** The original prompt is never mutated; every transformation is diffable against it.
2. **Never invent requirements.** Inferred additions are marked as _suggestions_, never silently merged.
3. **Never remove information.** Even "unimportant" details are preserved or explicitly accounted for.
4. **Every change explains itself.** If a pass can't justify a change, it doesn't make it.
5. **Composability over cleverness.** Many small passes, each doing one thing well.
6. **Objective improvement, measurable.** Quality gains are scored, not vibes. ([docs/evaluation-metrics.md](docs/evaluation-metrics.md))
7. **Sensible defaults, total configurability.** Zero config to start; every pass is tunable.
8. **Local-first, model-agnostic.** Heuristic passes run anywhere; LLM-powered passes are opt-in.
9. **Zero-dependency core.** The engine installs anywhere, instantly.
10. **Docs are the product.** Contributor experience is a feature.

## Architecture at a Glance

```
raw prompt
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│  REFINEMENT PIPELINE (composable passes, immutable context)  │
│                                                              │
│  DETECTION (non-mutating)                                    │
│   10 · intent detection                                      │
│   20 · ambiguity + missing-context detection                 │
│                                                              │
│  TRANSFORMATION (mutating, explained)                        │
│   30 · context enrichment                                    │
│   40 · constraint extraction                                 │
│   50 · structure + output formatting                         │
│                                                              │
│  GENERATION                                                  │
│   60 · final prompt assembly                                 │
│   70 · verification (intent-preservation check)              │
└─────────────────────────────────────────────────────────────┘
    │
    ▼
refined prompt  +  diff  +  per-change explanations  +  quality report
```

Each pass is an independent unit that receives an immutable context and returns a result. New passes can be added by anyone **without modifying existing code**. Full design: [docs/architecture.md](docs/architecture.md) · Plugin API: [docs/plugin-api.md](docs/plugin-api.md)

## A Taste

**Before**

> hey the app is kinda slow when I open the dashboard and sometimes it just spins forever lol. can you make it faster? also maybe fix the login bug where it logs me out. using react + node btw

**After** _(excerpt — full transformation with per-change rationale in [examples/before-after/coding-request.md](examples/before-after/coding-request.md))_

```markdown
# Task: Diagnose and fix two issues (dashboard performance, login sessions)

## Context

- Stack: React frontend, Node.js backend

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

Same intent. Same information. Objectively better instructions.

## Repository Layout

```
├── SKILL.md              # The skill contract (Agent Skills format) — loadable by OpenCode
├── README.md             # You are here
├── CONTRIBUTING.md       # How to contribute, label guide, how to propose a pass
├── CODE_OF_CONDUCT.md    # Contributor Covenant 2.1
├── ROADMAP.md            # Milestones M0–M5 and the Phase 1 build scope
├── CHANGELOG.md          # Keep-a-Changelog format
├── LICENSE               # MIT
├── docs/                 # All design specifications (start with architecture.md)
├── examples/             # Usage guide + worked before/after transformations
├── src/                  # Phase 1 code home (module skeleton only, no code yet)
├── tests/                # Golden fixtures land here in Phase 1
└── .github/              # Issue forms, PR template, label taxonomy
```

## Status

**Phase 0 — repository foundation.** This repository currently contains design, not implementation. Everything needed to start building is specified:

| Topic                      | Doc                                                                                             |
| -------------------------- | ----------------------------------------------------------------------------------------------- |
| Architecture & pass model  | [docs/architecture.md](docs/architecture.md)                                                    |
| Design philosophy          | [docs/design-philosophy.md](docs/design-philosophy.md)                                          |
| Plugin API (future)        | [docs/plugin-api.md](docs/plugin-api.md)                                                        |
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
| Milestones & Phase 1 scope | [ROADMAP.md](ROADMAP.md)                                                                        |

## Contributing

This project is designed to be contributed to. The most valuable contribution is a **new refinement pass** — see [CONTRIBUTING.md](CONTRIBUTING.md) and the [pass proposal template](.github/ISSUE_TEMPLATE/03-pass-proposal.yml). Good first issues will be labeled once Phase 1 begins.

## License

[MIT](LICENSE) — use it, fork it, ship it.

**Why MIT over Apache-2.0:** Apache-2.0's explicit patent grant is valuable for large corporate-backed projects, but it adds license length and contribution friction. MIT is the overwhelming norm in the TypeScript dev-tooling ecosystem (Prettier, ESLint, Vite), maximizes adoption and drive-by contributions, and keeps inbound = outbound licensing trivially understandable. If the project ever joins a foundation or attracts corporate IP concerns, relicensing to Apache-2.0 remains possible with contributor consent — the reverse path is much harder.
