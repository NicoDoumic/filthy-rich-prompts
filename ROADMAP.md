# Roadmap

> **Looking for the actionable plan? It's [PLAN.md](PLAN.md)** — the single authoritative path to public release (phases, exit criteria, open items, and the auto-refine toggle). This file is the milestone record it draws from.

This roadmap is a living document. Dates are deliberately absent — we optimize for _correct sequencing_ and _quality gates_, not deadlines. Each milestone has explicit exit criteria; a milestone is done when its criteria are met, not before.

Legend: ✅ done · 🚧 in progress · ⬜ not started

---

## M0 — Repository Foundation ✅

**Goal:** A repository so well-designed that building the project becomes straightforward.

**Scope:** Mission, vision, philosophy, architecture, full design specs (plugin API, config, CLI, TUI, benchmarking, metrics, testing), contributor infrastructure (issue forms, PR template, labels), worked examples, and this roadmap.

**Exit criteria:**

- [x] All 30 Phase 0 deliverables present
- [x] SKILL.md written as a loadable contract (Agent Skills format)
- [x] Every future feature has a design doc with options → tradeoffs → recommendation
- [x] A new contributor can answer "what is this, why does it exist, and where do I start?" in under 10 minutes

---

## M1 — Core Engine + Foundational Passes 🚧 _(= Phase 1 — exit criteria 3/4; the last needs an external human verifier)_

**Goal:** A working refinement pipeline, end to end, with three passes and a test harness.

**Scope — exactly this, nothing more:**

1. **Package scaffold** ✅ — `package.json`, `tsconfig.json` (strict), ESM, build (`tsup`), vitest, ESLint + Prettier, npm provenance-ready. Zero runtime dependencies in core (enforced by `scripts/check-deps.mjs` in CI).
2. **Core types** ✅ — `Pass`, `PassContext`, `PassResult`, `Diagnostic`, `Explanation`, `RefinementReport` in `src/core/types.ts`, per [docs/architecture.md](docs/architecture.md) (with the documented D1 metadata deviation).
3. **Pipeline runner** ✅ — `runPipeline` in `src/core/pipeline.ts`: phase-ordered execution, immutable context snapshots, contract validation, crash isolation.
4. **Three foundational passes** ✅
   - `intent-detection` (phase 10, detection) — heuristic classifier: coding / bug-report / research / writing / planning; ties collapse to `unknown`
   - `ambiguity-detection` (phase 20, detection) — flags vague quantifiers, unresolved referents, implicit constraints, hedges, compound requests (advisory severities only)
   - `structure` (phase 50, transformation) — canonical section layout under the verbatim-span doctrine, with per-change explanations
5. **Golden-test harness** ✅ — `tests/golden/` (8 fixtures + harness) run in CI, per [docs/testing-strategy.md](docs/testing-strategy.md) (reduced-fidelity in M1 — see its §3 amendment).
6. **CI** ✅ — `.github/workflows/ci.yml`: lint, format, typecheck, zero-dep guard, unit+golden+property with coverage gates, build, pack smoke; matrix OS × Node {22, 24}. Plus PR-title check and changesets release workflow.
7. **Verification that OpenCode loads SKILL.md** ✅ — smoke-tested on OpenCode 1.18.5: discovery + frontmatter contract verified via `opencode debug skill`; install steps documented in `examples/usage.md`; Q6 resolved.

**Explicitly out of scope for M1:** CLI, TUI, LLM-powered passes, config file loading, plugins, scoring. (A `--help`-less internal `src/cli/dev.ts` entry for manual testing is allowed but is not the CLI.)

**Exit criteria:**

- [x] `refine(rawPrompt)` returns `{ refined, diff, explanations, report }` for the three passes
- [x] All golden fixtures pass; intent-preservation property tests pass
- [x] OpenCode loads the skill and the skill contract matches actual behavior (discovery + frontmatter verified on 1.18.5; SKILL.md status updated to M1)
- [ ] `CONTRIBUTING.md` setup instructions verified by a contributor who didn't write them

---

## M2 — OpenCode Integration & the Core Pass Suite ⬜

**Goal:** The skill is genuinely useful inside OpenCode for the four flagship use cases.

**Scope:**

- Config loading (`refine.config.json` per [docs/configuration.md](docs/configuration.md))
- Remaining core passes: missing-context detection, constraint extraction, goal/role extraction, output-format inference, task decomposition
- Mode support: beginner / expert / silent (interactive deferred to M3 with the TUI)
- Specialized refinements: bug-report generation, specification generation, coding-request optimization
- First 50 benchmark fixtures ([docs/benchmarking.md](docs/benchmarking.md))

**Exit criteria:**

- [ ] All passes from the SKILL.md pipeline table exist (heuristic implementations acceptable)
- [ ] Four flagship before/after examples reproduce through the real pipeline
- [ ] Silent mode requires zero interaction end-to-end

---

## M3 — CLI + Interactive TUI ⬜

**Goal:** Refinement as a standalone tool, usable outside OpenCode.

**Scope:** `frp` binary per [docs/cli-design.md](docs/cli-design.md) (`refine`, `lint`, `diff`, `explain`, `score`, `init`, `doctor`); interactive TUI per [docs/tui-design.md](docs/tui-design.md) with per-pass approve/reject; interactive mode end-to-end.

**Exit criteria:**

- [ ] `echo "messy prompt" | frp refine` works on macOS, Linux, Windows
- [ ] TUI step-through approve/reject produces identical results to equivalent config
- [ ] npm install works globally; binary size + startup time documented

---

## M4 — Evaluation Harness & Quality Bar ⬜

**Goal:** "Objectively better" becomes measurable and enforced.

**Scope:** Intent-preservation scoring, LLM-as-judge rubric, 200+ fixture benchmark dataset, nightly eval runs, public results dashboard (even if just a markdown report), regression gates in CI per [docs/evaluation-metrics.md](docs/evaluation-metrics.md).

**Exit criteria:**

- [ ] Every merged pass moves (or holds) the benchmark; regressions block merge
- [ ] Intent-preservation gate at 100% on the curated core set
- [ ] Benchmark methodology documented well enough for external replication

---

## M5 — Plugin API & Public Launch ⬜

**Goal:** Open the ecosystem. 1.0.

**Scope:** Stable plugin API per [docs/plugin-api.md](docs/plugin-api.md) (semver-guaranteed), plugin discovery + trust model, 3 reference plugins, docs site, launch materials.

**Exit criteria:**

- [ ] A community member ships a third-party pass without touching this repo
- [ ] API freeze commitment published
- [ ] 1.0.0 released per [docs/release-strategy.md](docs/release-strategy.md)

---

## Beyond M5 (aspirational)

- Agent planning & multi-step execution planning passes
- Prompt scoring as a hosted check (GitHub Action: "lint your prompts in CI")
- Research-request and writing-request optimization packs
- Local-model backends for fully offline LLM-powered passes
- Localization of refined output ([open question](docs/open-questions.md))

---

## What Phase 1 Should Build (detailed handoff)

Phase 1 = M1 above. Concretely, in dependency order:

1. `package.json` + toolchain (strict TS, ESM, vitest, tsup, eslint/prettier)
2. `src/core/types.ts` — every interface in [docs/architecture.md §Pass Contract](docs/architecture.md)
3. `src/core/pipeline.ts` — phase ordering + immutable snapshots
4. `src/core/registry.ts` — pass registration and validation (kind/phase/uniqueness rules)
5. `src/passes/intent-detection.ts`
6. `src/passes/ambiguity-detection.ts`
7. `src/passes/structure.ts`
8. `tests/golden/` harness + first 10 fixtures (port the four examples)
9. GitHub Actions CI
10. OpenCode smoke test + docs update

**Definition of done for Phase 1:** the M1 exit criteria above, all green in CI, and a tagged `v0.1.0`.
