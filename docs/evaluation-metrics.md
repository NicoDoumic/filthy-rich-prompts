# Evaluation Metrics

> Status: **Proposed design** — deterministic metrics land with the M4 harness; judged metrics follow. This document defines _what_ we measure; [benchmarking.md](benchmarking.md) defines _how we run it_.

Every metric here answers one question: **is the refined prompt objectively better than the original?** We measure that in tiers, in priority order. A higher tier can veto a lower one: no clarity score can ever excuse an intent-preservation failure.

---

## Tier 0 — Intent Preservation (the gate)

**Definition.** The refined prompt asks for the same outcome as the raw prompt: same goal, same scope, same constraints, no invented requirements, no lost information.

**Measurement.**

1. _Invariant checking (deterministic):_ each benchmark fixture's `must_preserve` / `must_not_introduce` invariants are checked mechanically (see [benchmarking.md §2.2](benchmarking.md)). Pass/fail.
2. _Semantic check (judged):_ a judge model answers the binary question _"Does prompt B ask for the same thing as prompt A?"_ with a required rationale; disagreements route to human review.
3. _Information-loss check (deterministic, heuristic):_ content tokens from the raw prompt must be accounted for — present in the refined prompt, or listed in the report's accounting section. Named entities, identifiers, numbers, and negations get extra weight (losing a "not" flips meaning).

**Threshold.** **100% on the curated core benchmark set. No exceptions, no "mostly".** A single violation blocks merge. This is principle #1 of the project expressed as a number; the moment it becomes negotiable, the product isn't.

**Known limits.** Invariant coverage is human-authored and therefore incomplete; the judged binary question inherits judge fallibility. Mitigations: adversarial fixtures, judge-vs-human agreement tracking (κ ≥ 0.7), and treating every reported real-world drift as a new fixture within one release.

## Tier 1 — Quality Gains

Scored 0–100, raw vs. refined, delta reported. Deterministic where possible, judged where not.

| Metric           | What it measures                                                                                                                               | Method                                                               |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| **Clarity**      | Can a competent executor understand the request without re-reading? Sentence-level ambiguity, unresolved referents, hedge density              | judged (rubric) + deterministic ambiguity-diagnostic counts          |
| **Specificity**  | Presence of concrete anchors: versions, file paths, quantities, named entities, explicit constraints, defined output format                    | deterministic counters + judged spot-check                           |
| **Completeness** | Are the elements a good prompt needs present _or explicitly flagged as missing_? (goal, context, constraints, output format, success criteria) | deterministic checklist against `IntentModel` + diagnostics coverage |
| **Structure**    | Canonical sections, scannability, compound-request decomposition, formatting consistency                                                       | deterministic (section parser + heading/list heuristics)             |

**Target:** refined ≥ raw on every Tier-1 metric for every non-adversarial fixture, with a mean delta ≥ +20 on the benchmark at M4. A refined prompt that scores _worse_ on any Tier-1 metric is a bug report against the responsible pass (attribution via snapshot history).

## Tier 2 — Efficiency

| Metric                                  | Definition                                 | Target                                                                                                    |
| --------------------------------------- | ------------------------------------------ | --------------------------------------------------------------------------------------------------------- |
| **Token overhead**                      | (tokens_refined − tokens_raw) / tokens_raw | ≤ +60% median on benchmark; never justified by _padding_ — every added token must trace to an explanation |
| **Refine latency (heuristic pipeline)** | wall time per refinement                   | p50 < 50 ms @ 1 KB, < 250 ms @ 10 KB (see [architecture.md §10](architecture.md))                         |
| **LLM cost per run**                    | tokens consumed by LLM-powered passes      | $0 by default (heuristic-only); budget-enforced when enabled ([configuration.md](configuration.md))       |

Token overhead deserves an explicit defense: longer is not better. We accept moderate overhead because explicit structure executes better than implicit prose — but the metric exists precisely to catch passes that bloat. A pass whose only effect is lengthening prompts gets removed, not tuned.

## Tier 3 — Human Preference (the ground truth)

**Definition.** Blind pairwise comparison: raters see (raw, refined) pairs in random left/right order and answer _"Which would you rather send to an AI assistant?"_ plus an optional reason.

**Protocol.**

- Raters: maintainers + recruited community members; minimum 3 raters per pair, disagreement adjudicated
- Sample: rotating 30-fixture subset per release, weighted toward categories with recent pass changes
- **Target: ≥ 85% win rate** (refined preferred), ≤ 5% loss rate, remainder ties. Losses are reviewed individually and converted into fixtures or pass fixes.

This tier exists because Tiers 0–2 are proxies. Humans are the ground truth proxies serve. If proxies and humans ever disagree systematically, we change the proxies.

## Reporting Format

Every benchmark run emits (per fixture, per category, and aggregate):

```jsonc
// DESIGN SKETCH — results schema (stable from M4, versioned with the harness)
{
  "fixture": "coding/0001-vague-perf-request",
  "intentPreserved": true,
  "tier1": {
    "clarity": { "raw": 41, "refined": 88 },
    "specificity": { "raw": 30, "refined": 74 },
  },
  "tier2": { "tokenOverhead": 0.43, "latencyMs": 12 },
  "passAttribution": {
    "structure": { "clarity": "+30" },
    "constraint-extraction": { "specificity": "+22" },
  },
  "violations": [],
}
```

Release reports aggregate to the dashboard shown in [tui-design.md §5](tui-design.md) and the public benchmark report.

## What We Deliberately Do Not Measure (Yet)

- **Downstream task success** (did the executing model actually do better?) — the _real_ north star, but confounded by executor model choice. Post-M5: an execution-evaluation track with pinned executor models, tracked in [open-questions.md](open-questions.md).
- **Per-model-tuned scores** — we are model-agnostic; per-model numbers would invite overfitting to a judge's preferences.
- **Rater "delight"** — subjective polish is captured by Tier 3 preference; a separate delight metric rewards style over correctness.
