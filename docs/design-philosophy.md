# Design Philosophy

Every project has values. Ours are written down so that when two reasonable people disagree in a PR, we can point at a principle instead of arguing taste.

These are ordered. When principles conflict, the earlier one wins.

---

## The Ten Principles

### 1. Intent is sacred

The user's _goal_ is never up for negotiation. The refined prompt must ask for the same thing the raw prompt asked for — nothing more, nothing less, nothing different.

- **In practice:** the original prompt is immutable; every run ends by diffing against it; a verification pass checks for drift.
- **Why first:** the moment a "refiner" changes what you wanted, it becomes an obstacle. Trust is the product.

### 2. Never invent requirements

Adding constraints, deliverables, or scope the user didn't ask for is a change of intent wearing a costume.

- **In practice:** inferred additions are emitted as labeled `Assumptions`/`suggestions` — visually and structurally separate from the user's own words.
- **The fine line:** _restructuring_ what the user said is refinement; _adding_ what they didn't say is invention. "Make it fast" → "## Performance constraint: fast (user-stated)" is refinement. Adding "must load in <200ms" is invention — it belongs in the report as a question or suggestion.

### 3. Never remove information

Tone markers can go ("lol"). Information cannot. Even details that seem irrelevant ("it worked yesterday") often carry diagnostic weight (regression hint!).

- **In practice:** information-loss is checked explicitly by the verification pass; the report must account for anything absent from the refined prompt.
- **Test:** if deleting a phrase would change the set of plausible correct executions, it's information.

### 4. Every change explains itself

An unexplained improvement is indistinguishable from vandalism.

- **In practice:** the engine _rejects_ transformations without explanations (enforced invariant, not a style rule).
- **Side effect:** the explanations teach prompt engineering. The tool educates by being read.

### 5. Composability over cleverness

No giant prompts. Many small passes, each doing one thing, each independently testable, each removable without breaking the others.

- **In practice:** the three pass kinds and phase ordering in [architecture.md](architecture.md); contributors add passes without touching core.
- **Why:** monoliths don't get contributors; pipelines do.

### 6. Objective improvement, measurable

"Better" is a claim that needs evidence, or it's marketing.

- **In practice:** every run emits a `RefinementReport`; the benchmark suite ([benchmarking.md](benchmarking.md)) gates merges; intent preservation is a hard 100% gate, not a target.
- **Honesty clause:** some metrics are proxies. We document their limits in [evaluation-metrics.md](evaluation-metrics.md) rather than pretend otherwise.

### 7. Sensible defaults, total configurability

Zero-config must produce a good result for a first-time user. Every behavior must be overridable for the thousandth-time user.

- **In practice:** convention-over-configuration defaults; every pass individually enable/disable/configurable ([configuration.md](configuration.md)).

### 8. Local-first, model-agnostic

The core pipeline runs offline, for free, deterministically. LLM-powered refinement is an enhancement, never a requirement.

- **In practice:** zero-dependency heuristic passes are the baseline; LLM access goes through an injected provider port; `requiresLLM` is a declared capability.
- **Why:** a skill that phones home by default isn't a skill, it's a client.

### 9. Zero-dependency core

The engine and built-in passes have no runtime dependencies.

- **In practice:** anything needing a dependency (schema validation, TUI widgets, diff rendering polish) lives outside `src/core` or is vendored deliberately with justification in the PR.
- **Tradeoff we accept:** occasionally re-implementing small utilities. The payoff: instant install, no supply-chain blast radius, no dependency-update churn breaking users' prompts.

### 10. Docs are the product

A refinement tool whose own docs are confusing has failed at its job.

- **In practice:** design docs precede code; examples show per-change rationale; CONTRIBUTING is written for a first-time contributor; this very file exists so decisions outlive maintainers.

---

## What We Optimize For (and Against)

**For:** maintainability, extensibility, contributor experience, verifiable correctness.

**Against:** quick implementation, clever abstractions, feature count, benchmark-gaming.

When forced to choose between "easy to build" and "easy to build _upon_", we choose the latter — every time, even when it makes Phase 1 slower. This repository is designed to still make sense at 1,000 stars and 50 passes.

## Precedents We Admire

- **Prettier** — opinionated defaults, near-zero config, explains almost nothing and is loved anyway (we add the explanations Prettier never needed)
- **ESLint** — rule-based plugin architecture; rules compose; severity levels; disable comments
- **rust-analyzer / TypeScript diagnostics** — machine-readable diagnostic codes with human messages
- **PostCSS / Babel** — the plugin-pipeline model done right, and the ecosystem it unlocked
