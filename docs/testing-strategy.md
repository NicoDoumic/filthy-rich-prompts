# Testing Strategy

> Status: **Active** — golden-test harness shipped in Phase 1 (M1); the full pyramid builds through M4.

A tool whose entire promise is _correctness of transformation_ must be tested harder than the average npm package. Our test pyramid is ordered by how bad a missed bug is: losing user intent is worse than a formatting glitch, so invariants get more machinery than snapshots.

---

## 1. The Pyramid

```
            ╱  eval tests   ╲        judged, nightly, non-blocking-except-regressions
           ╱  (LLM-as-judge) ╲
          ╱  property tests   ╲      invariants over generated inputs — the intent guard
         ╱  golden/snapshot    ╲     full-pipeline fixtures, exact expected output
        ╱     unit tests        ╲    per-pass, deterministic, fast
       ╱   (pure functions)      ╲
      ─────────────────────────────
```

| Layer              | What it catches                                    | Runs                   | Blocks merge?             |
| ------------------ | -------------------------------------------------- | ---------------------- | ------------------------- |
| Unit               | Pass logic bugs, edge cases                        | every PR               | ✅                        |
| Golden/snapshot    | Output drift, pass interactions                    | every PR               | ✅                        |
| Property           | Intent/information violations on unexpected inputs | every PR               | ✅                        |
| Eval (judged)      | Semantic quality regressions                       | nightly + `/benchmark` | ✅ on regression (>2 pts) |
| Mutation (post-M4) | Weak tests that pass against broken code           | weekly                 | ❌ (report only)          |

## 2. Unit Tests

- One spec file per pass: `structure.test.ts` next to `structure.ts`.
- Passes are pure functions → tests are `run(ctxIn) → expect(result)`. No mocks except the `ModelProvider` port for LLM-powered passes (a stub provider returning canned completions; **never** a live model in unit tests).
- Engine tests cover the contract invariants from [architecture.md §4.3](architecture.md): detection-passes-can't-mutate, transformations-require-explanations, crash-isolation, phase ordering, frozen context.
- Coverage targets: ≥ 95% lines on `src/core`, ≥ 90% on `src/passes`, enforced in CI. Coverage is a floor, not a goal — a weak assertion suite at 100% is worse than a strong one at 90%.

## 3. Golden / Snapshot Tests

Fixture pairs executed through the **full pipeline** (not single passes) — because the bugs that hurt users live in pass _interactions_:

```
tests/golden/
├── coding-001-dashboard-login/
│   ├── input.md           # raw prompt
│   ├── expected.md        # exact expected refined prompt
│   ├── expected.report.json   # diagnostics, explanations, assumptions
│   └── config.json        # optional per-fixture config override (not yet used)
```

- First 8 fixtures are ported from [examples/before-after/](../examples/before-after/) — the examples in our docs must be reproducible by the real pipeline, or the docs are fiction. CI literally tests the README's promises.
- Fixtures include edge cases: empty input, already-structured prompts, single-line terse requests, and unicode/emoji content — proving the pipeline is robust across real-world variation.
- Updating goldens requires `UPDATE_GOLDENS=1 pnpm test` + a PR section justifying each changed fixture. Drive-by golden updates are a review red flag.
- Snapshots are **exact-match** for heuristic passes. Formatting normalization (trailing whitespace, line endings) is applied before comparison and nowhere else — we test what users see.

## 4. Property-Based Tests (the intent guard)

Golden tests check the inputs we _imagined_. Property tests check the ones we didn't. Using `fast-check` (dev-dependency; the zero-dep rule applies to runtime only):

**Invariant P1 — Intent preservation (heuristic proxy).** For any generated prompt, every content token of the raw input is present in the refined output or accounted for in the report. (The semantic version of this invariant lives in the eval track; this catches gross loss mechanically.)

**Invariant P2 — Idempotence.** `refine(refine(x))` ≈ `refine(x)` — refining an already-refined prompt must produce no new transformations. A pipeline that can't stop improving its own output has no fixed point and will drift over chained uses.

**Invariant P3 — Explanation completeness.** Every diff hunk between raw and refined is covered by at least one `Explanation`. No silent edits, ever, on any input.

**Invariant P4 — Crash isolation.** For any input and any single pass forced to throw, the pipeline still returns the last good prompt with a diagnostic — never an exception, never a loss.

**Invariant P5 — Detection purity.** Detection passes return byte-identical `current` for all generated inputs (defense in depth behind engine validation).

Generators: realistic prompt-shaped strings (templates with slots: verbs, stack names, hedges, typos), not random bytes — property tests should explore _plausible_ inputs or they'll spend their budget proving the pipeline handles `"a\\\\sdf;ka"` correctly, which we know.

## 5. Eval Tests (judged)

Owned by the benchmark harness ([benchmarking.md](benchmarking.md)): the judged track is the semantic test layer. Key separation of concerns:

- **Unit/golden/property** = correctness machinery, deterministic, every-PR.
- **Eval** = quality measurement, stochastic, nightly. A flaky judge must never block an unrelated PR — hence nightly gating with regression thresholds instead.

## 6. CI Matrix & Tooling

- **Runner:** GitHub Actions; **OS:** ubuntu-latest, windows-latest, macos-latest; **Node:** active LTS versions. The pipeline is pure TS — if it fails on one OS, something non-portable sneaked in (path handling, line endings) and we want to know.
- **Jobs:** `lint` → `typecheck` → `unit` → `golden` → `property` (all parallel after lint/typecheck), then `build` + a **package smoke test** (`npm pack` → install into a clean dir → run one refinement) to catch packaging mistakes CI otherwise can't see.
- **Speed budget:** full PR suite < 5 minutes. Property tests are bounded (fixed seed in CI, seeded-random locally with failure seed printed for replay).

## 7. Contributor Rules of Thumb

1. New pass → unit tests + at least one golden fixture + property invariants still green. No exceptions.
2. Bug fix → a failing test first (fixture or unit), then the fix. The regression test is the deliverable; the fix is the detail.
3. Changed output → justify every golden diff in the PR body.
4. If you're tempted to loosen an invariant to make a test pass, stop — that is the invariant working. Bring it to the PR discussion instead.
