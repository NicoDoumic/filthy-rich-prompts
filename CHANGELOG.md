# Changelog

## Unreleased (next)

### Added

- **Pre-Refinement Discovery phase** — new `interaction` pass kind at phase 5. The refiner now asks targeted clarifying questions before any detection or transformation pass runs. Silent mode skips discovery. Protocol: 2-5 questions per round, timeout/fallback, locale-agnostic free-text option. (`SKILL.md`, `docs/architecture.md`)
- **`PassContext.userAnswers` field** — discovery-phase responses are stored in the context and available to all downstream passes. (`src/core/types.ts`, `src/core/context.ts`)
- **`interactive` mode** added to `Mode` union type (`beginner | expert | interactive | silent`) and `VALID_MODES`. (`src/core/types.ts`, `src/core/modes.ts`, `SKILL.md`)

### Changed

- **`Mode` type canonicalized in `types.ts`** — was `string` in `ResolvedConfig.mode`, `RefineOptions.mode`, `RefinementReport.mode`. Now properly typed as the `Mode` union. Removed `as _Mode` cast in `src/index.ts`. (`src/core/types.ts`, `src/index.ts`)
- **`VERIFY_PHASE` exported from `registry.ts`** — replaces hardcoded `70` in `pipeline.ts`. (`src/core/registry.ts`, `src/core/pipeline.ts`)
- **`VALID_MODES` as single source of truth** — exported from `modes.ts`, consumed by `config-loader.ts`. No more duplicated `["beginner", "expert", "silent"]` array. (`src/core/modes.ts`, `src/integrations/config-loader.ts`)
- **Strategy pattern for mode behavior** — `switch(mode)` ×3 replaced by `MODE_STRATEGIES: Record<Mode, ModeStrategy>`. Adding a mode now requires only a new strategy object. (`src/core/modes.ts`)
- **Installer improvements** — `autoRefine` defaults to `false` (opt-in). `cmdUninstall` accepts `--project`. `NO_COLOR` env var respected. Plugin path detection uses `endsWith("filthy-rich-prompts.js")` instead of loose `includes`. Package root detection loops to filesystem root instead of hardcoded 5 iterations. (`src/installer/index.ts`)
- **CLI improvements** — `-f` short flag implemented as alias for `--file`. `readFileSync` wrapped with user-friendly error for missing files. `--no-color` removed from USAGE (unimplemented). (`src/cli/index.ts`)
- **Config-loader error handling** — `readConfigFile` now distinguishes `ENOENT` (normal) from permission/other errors. (`src/integrations/config-loader.ts`)
- **`segmentSentences` cached by locale** — `Map<string, Intl.Segmenter>` prevents re-creation per call. Accepts optional `locale` parameter (default `"en"`). (`src/core/sentences.ts`)
- **`diffLines` input size cap** — rejects inputs >100,000 lines with explicit error. (`src/core/diff.ts`)
- **`OPEN_QUESTIONS_HEADING` deduplicated** — single constant in `modes.ts`, re-exported from `refine-outgoing.ts`. (`src/core/modes.ts`, `src/integrations/refine-outgoing.ts`)

### Fixed

- **Task decomposition dead code** — unreachable `hasHeading` branch removed (`src/passes/task-decomposition.ts`).
- **OpenCode plugin performance** — `[...messages].reverse().find()` replaced with backward iteration. Nested ternary refactored to if/else chain. (`src/integrations/opencode-plugin.ts`)
- **Silent error swallowing** — `console.warn` added to catch blocks in `refine-outgoing.ts` and `opencode-plugin.ts` (non-production only). (`src/integrations/refine-outgoing.ts`, `src/integrations/opencode-plugin.ts`)

### Tests

- **`modes.test.ts`** — 15 tests covering `VALID_MODES`, `modeTagline`, `clarifyingQuestions` across all 4 modes. (`src/core/modes.test.ts`)
- **`output-format.test.ts` expanded** — 4→13 tests: all 7 format categories (list, table, code, json, markdown, prose, diagram), multi-format detection, no-op paths. (`src/passes/output-format.test.ts`)
- **`verification.test.ts` boundary tests** — NaN edge case (empty prompt), exactly 20% token loss threshold, empty raw prompt. (`src/passes/verification.test.ts`)
- **`pipeline.test.ts` `validateResult` tests** — 5 direct unit tests for all 4 validation branches + valid case. (`src/core/pipeline.test.ts`)
- **`goal-role-extraction.test.ts` strengthened** — concrete assertions on role text and explanation content. (`src/passes/goal-role-extraction.test.ts`)
- **`shouldAppendQuestions` un-exported** — removed `export` keyword (internal use only). (`src/core/modes.ts`)

### Removed

- **`formatExplanations` dead code** — exported but never imported, wrong signature (`string[]` vs `Explanation[]`). Removed entirely. (`src/core/modes.ts`)
- **`REFACTORS.md`** — comprehensive audit document with 69 findings across 4 tiers. Tracked in-repo for future sessions.

## 0.2.0-next.0

### Minor Changes

- Pre-release: **OpenCode auto-refine hook** — with `autoRefine: true`, every outgoing OpenCode prompt passes through the refiner before reaching the model (`experimental.chat.messages.transform`, self-contained `dist/opencode-plugin.js`, core inlined, zero deps). Blocking diagnostics append an `## Open questions` section so the model asks for missing context before executing. Toggle via plugin options or minimal `refine.config.json` (`autoRefine` only — strict JSON, M2 subset); default off. Includes `refine-outgoing` (pure hook logic), `min-config` (minimal loader), 22 hook tests, standalone plugin bundle smoke test, and CI step. `structure` remains PROVISIONAL against the Tier 0 gate (see release notes).

## 0.1.1

### Patch Changes

- **Phase 1 completion — 7 new heuristic passes.** The full 10-pass pipeline is now implemented:

  **Detection passes:** `missing-context-detection` (phase 20) — flags absent information the task depends on.

  **Transformation passes:** `context-enrichment` (phase 30) — surfaces and structures existing context; `constraint-extraction` (phase 40) — turns implicit constraints into explicit statements; `goal-role-extraction` (phase 40) — states the objective and infers the expert role; `output-format-inference` (phase 50) — specifies the desired output format; `task-decomposition` (phase 50) — splits compound requests into ordered sub-tasks.

  **Generation passes:** `verification` (phase 70) — checks the refined prompt against the original for intent drift and information loss.

  All passes are heuristic-only, zero-dependency, and idempotent (skip already-structured prompts). 134 tests green (up from 100), 6/6 property invariants passing, coverage gates enforced.

  **Idempotency fix:** All new passes skip prompts with existing markdown headings, ensuring P2 invariance (refine(refine(x)) ≈ refine(x)).

## 0.1.0

### Minor Changes

- M1 — core refinement engine and foundational passes (first release).

  **Engine:** `refine()` returning `{ refined, diff, explanations, report }`; phase-ordered pipeline over immutable, deep-frozen context snapshots; registry with registration-time contract validation; run-time crash isolation with `blocking` diagnostics (one bad pass never loses the prompt); hand-rolled Myers line diff; deterministic report (no timing fields); zero runtime dependencies.

  **Passes:** `intent-detection` (phase 10, cue-scoring classifier, ties collapse to `unknown`), `ambiguity-detection` (phase 20, advisory diagnostics for vague quantifiers/qualifiers/deadlines, hedges, sentence-initial referents, compound requests, implicit constraints), `structure` (phase 50, canonical `# Task`/`## Context` layout under the verbatim-span doctrine — reorganize and label, never reword).

  **Testing:** unit tests for all engine invariants (architecture §4.3), 8 golden fixtures through the full pipeline, fast-check property invariants P1–P5 (intent preservation, idempotence, explanation completeness, crash isolation, detection purity). Coverage gates: 95% core / 90% passes.

  **Tooling:** CI matrix (OS × Node {22,24}) with lint/format/typecheck/zero-dep guard/coverage/build/pack-smoke, PR-title Conventional Commit check, changesets release workflow.

All notable changes to this project will be documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html)
(see [docs/versioning.md](docs/versioning.md) for our 0.x-era policy).

This file is generated from [changesets](https://github.com/changesets/changesets).
