# Changelog

## 0.2.0-next.0

### Minor Changes

- Pre-release: **OpenCode auto-refine hook** — with `autoRefine: true`, every outgoing OpenCode prompt passes through the refiner before reaching the model (`experimental.chat.messages.transform`, self-contained `dist/opencode-plugin.js`, core inlined, zero deps). Blocking diagnostics append an `## Open questions` section so the model asks for missing context before executing. Toggle via plugin options or minimal `refine.config.json` (`autoRefine` only — strict JSON, M2 subset); default off. Includes `refine-outgoing` (pure hook logic), `min-config` (minimal loader), 22 hook tests, standalone plugin bundle smoke test, and CI step. `structure` remains PROVISIONAL against the Tier 0 gate (see release notes).

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

Starting with Phase 1, this file is generated from [changesets](https://github.com/changesets/changesets) — do not edit release sections by hand.

## [Unreleased]

(The Phase 0 repository foundation — mission, vision, philosophy, architecture, SKILL.md, design specs, contributor infrastructure, worked examples, and the roadmap — shipped as part of 0.1.0 above.)
