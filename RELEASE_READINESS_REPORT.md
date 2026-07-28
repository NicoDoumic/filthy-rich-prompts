# v1.0 Release Readiness Report

**Project:** filthy-rich-prompts · **Date:** 2026-07-28 · **Version:** v0.3.0-next.0

---

## Executive Summary

The repository is at **v0.2.0-next.0**, which is a pre-release with all 11 core refinement passes implemented and an auto-refine plugin for OpenCode. It is not yet ready for a 1.0 public release — see the phase map below.

**Estimated release readiness: 52%** toward v1.0.

---

## What v0.2.0-next.0 Has (the Foundation)

| Area | Status | Notes |
|------|--------|-------|
| 11 core heuristic passes | Done | All implemented, golden-tested, property-tested |
| Pipeline engine | Done | Zero-dependency, crash-isolated, verified |
| OpenCode skill (SKILL.md) | Done | Loadable as `prompt-refiner` skill |
| Auto-refine plugin | Done | `experimental.chat.messages.transform` hook, toggleable |
| `npx filthy-rich-prompts install` | Done | One-command install with OS detection, verification |
| `npx filthy-rich-prompts update/doctor/uninstall` | Done | Full lifecycle management |
| CI (lint, typecheck, test, build, smoke) | Done | Matrix: ubuntu/windows/macos × Node 22/24 |
| Golden fixtures (8) | Done | Full-pipeline tests |
| Property invariants (6) | Done | Intent preservation, idempotence, explanation completeness, crash isolation, detection purity |
| Documentation | Done | Quickstart, FAQ, troubleshooting, architecture, design philosophy, configuration |
| SECURITY.md | Done | Created this cycle (was deferred from Phase 1) |

---

## Remaining P0 Issues (Blockers Before Any Public Release)

| # | Issue | Impact | Required For |
|---|-------|--------|-------------|
| P0-1 | **CI never confirmed on real GitHub runners** | Unknown — workflows exist and pass locally, but no GitHub Actions run has been confirmed | v1.0 |
| P0-2 | **npm package never published** | `npm install filthy-rich-prompts` does not work today | v1.0 |
| P0-3 | **No live end-to-end verification** | Auto-refine toggle never demonstrated in an OpenCode session with a configured provider | v1.0 |
| P0-4 | **M1 exit criterion 4** | CONTRIBUTING.md setup never verified by an independent human | v1.0 |

---

## Remaining P1 Issues (Should Fix Before v1.0)

| # | Issue | Impact |
|---|-------|--------|
| P1-1 | **CLI (`frp`) not implemented** | `frp refine`, `frp lint`, `frp doctor` are spec-only. Users outside OpenCode have no way to use the tool. (M3) |
| P1-2 | **TUI not implemented** | Interactive approve/reject mode per pass is spec-only. (M3) |
| P1-3 | **Mode support not wired** | `beginner`, `expert`, `silent` modes documented but behaviorally identical — mode-specific branching not implemented |
| P1-4 | **Full config schema not implemented** | Only `autoRefine` is wired; `refine.config.json` 4-level precedence, pass options, mode, output flags are all spec-only |
| P1-5 | **Benchmark harness not built** | No dataset, no judged evaluation, no public benchmark report. "Objectively better" is asserted, not proven. (M4) |
| P1-6 | **Plugin API not stabilized** | No `definePass()` contract, no trust tiers, no third-party pass loading. Community can't ship passes. (M5) |
| P1-7 | **`structure` pass marked PROVISIONAL** | The pass's Tier 0 gate (intent preservation on the full benchmark set) has not been proven. |

---

## Remaining P2 Issues (Nice to Have Before v1.0)

| # | Issue | Impact |
|---|-------|--------|
| P2-1 | Test coverage imbalances: `final-generation` (2 tests), `verification` (2 tests), `constraint-extraction` (3 tests) | Core passes are under-tested relative to their pipeline position |
| P2-2 | Code duplication across passes: `segmentSentences()`, `HEADING_PRESENT` regex (5 copies) | Maintenance burden; should be shared utilities |
| P2-3 | `ctxOf()` test helper duplicated across 7 test files | Should be in a shared test utility file |
| P2-4 | Golden fixture output disconnect with `examples/before-after/` | Before/after documents show richer output than the pipeline currently produces |
| P2-5 | No stale-bot or issue gardening | `pinned` label exists but no workflow enforces it |
| P2-6 | `frp` binary not shipped | CLI entry point exists only as `.gitkeep`; no `bin` alias for `frp` in `package.json` |
| P2-7 | No `.github/dependabot.yml` | Dependencies are not automatically updated |
| P2-8 | No CHANGELOG automation live | Changesets set up but never triggered a real release |

---

## Documentation Gaps

| Gap | Status |
|-----|--------|
| CLI reference | Spec-only (`docs/cli-design.md`); no actual commands to document |
| TUI reference | Spec-only (`docs/tui-design.md`) |
| Plugin authoring guide | Spec-only (`docs/plugin-api.md`) |
| Benchmark contribution guide | Spec-only (`docs/benchmarking.md`) |
| API reference (generated from TSDoc) | Not started |
| Video/GIF demo | Not created |
| GitHub Pages site | Not created |
| `INSTALL.ps1` is secondary install method | Documented as fallback; primary is `npx filthy-rich-prompts install` |

---

## Technical Debt

| Item | Severity | Fix |
|------|----------|-----|
| `any` types in `src/installer/index.ts` (5 occurrences) | Low | Replace with `unknown` + type guards |
| `segmentSentences()` duplicated 3 times | Medium | Extract to `src/core/sentences.ts` |
| `HEADING_PRESENT` regex duplicated 5 times | Medium | Export from a shared location |
| `verification` pass comment says "generation" but kind is "detection" | Fixed | ✅ |
| `final-generation` kind was "transformation", should be "generation" | Fixed | ✅ |
| `context-enrichment` had unreachable code branch | Fixed | ✅ |
| `src/README.md` had outdated pass file names | Fixed | ✅ |
| `faq.md` had redundant `../docs/` link prefixes | Fixed | ✅ |
| `testing-strategy.md` had stale fixture counts/names | Fixed | ✅ |
| `CHANGELOG.md` had confusing `[Unreleased]` section | Fixed | ✅ |
| `INSTALL.ps1` had ambiguous verification instructions | Fixed | ✅ |

---

## Recommended Quick Wins (before v1.0)

1. **Publish to npm** — even as `0.2.0-next.0`, to validate the release pipeline and get `npx filthy-rich-prompts install` landing on real machines.
2. **Run CI on GitHub Actions once** — push a no-op commit to trigger the matrix and confirm it passes on real runners.
3. **Wire mode support** — `beginner` and `silent` modes are the most requested features and require minimal engine changes (the `Mode` type already exists).
4. **Implement full config loading** — the 4-level precedence schema is designed; users want per-project configs.
5. **GIF/video demo** — 30-second screen capture of auto-refine in OpenCode would be the single highest-ROI piece of content.

---

## Phase Map to v1.0

| Phase | What | Status | Blocks |
|-------|------|--------|--------|
| Phase 1 (M1) | Core engine + 11 passes + tests | Done | — |
| Phase 2 (M2) | Integration, config, modes | 70% (auto-refine done; config/modes pending) | CLI, TUI |
| Phase 3 (M3) | `frp` CLI + interactive TUI | 0% | Public install |
| Phase 4 (M4) | Benchmarks, evaluation harness | 0% | 1.0 confidence |
| Phase 5 (M5) | Plugin API, docs sweep, npm publish | 0% | Community ecosystem |

---

## Blocker Summary

To ship v1.0, the project needs:

1. ✅ Working engine with all passes
2. ✅ One-command installer (`npx filthy-rich-prompts install`)
3. ✅ Auto-refine plugin for OpenCode
4. ✅ Documentation suite (quickstart, FAQ, troubleshooting, architecture)
5. ⬜ CLI binary (`frp refine`) — **M3**
6. ⬜ Interactive TUI — **M3**
7. ⬜ Benchmark suite proving "objectively better" — **M4**
8. ⬜ Plugin API for community passes — **M5**
9. ⬜ npm publish with provenance — **anytime**
10. ⬜ Live end-to-end verification — **Phase 2**

**Next milestone:** Ship v0.3.0 with mode support, full config loading, and a confirmed green CI run. This would bring readiness to ~65%.

**1.0 requires:** M3 (CLI + TUI) + M4 (benchmarks) + M5 (plugin API). At current velocity, a realistic v1.0 target is Q4 2026.

---

## Changes Made This Cycle

| File | Change |
|------|--------|
| `src/installer/index.ts` | Major overhaul: added `update`, `doctor` commands, `--project` flag, OS-version display, verification step, dynamic version from package.json, improved help text |
| `README.md` | Complete rewrite for v1.0 readiness: one-command install flow, badges, FAQ inline, architecture diagram, platform support table, cleaner structure |
| `SECURITY.md` | Created (was deferred from Phase 1) |
| `CONTRIBUTING.md` | Updated security reporting to point to SECURITY.md |
| `CHANGELOG.md` | Removed confusing `[Unreleased]` placeholder section |
| `SKILL.md` | Removed test count (drift-prone), kept status current |
| `docs/faq.md` | Fixed redundant `../docs/` link prefixes (4 links) |
| `docs/testing-strategy.md` | Fixed fixture count (10→8), example name, removed stale M1 amendment |
| `docs/quickstart.md` | Reorganized: one-command install as Option A, manual as Option B |
| `INSTALL.ps1` | Added note that `npx install` is recommended; fixed log path; clarified verification |
| `src/passes/verification.ts` | Fixed comment: "generation" → "detection" |
| `src/passes/final-generation.ts` | Fixed kind: "transformation" → "generation" |
| `src/passes/context-enrichment.ts` | Removed unreachable dead code branch |
| `src/README.md` | Updated pass file names, removed Phase 1/2 references |
| `tests/golden/*/expected.report.json` | Regenerated (8 files) to reflect `kind: "generation"` change |
