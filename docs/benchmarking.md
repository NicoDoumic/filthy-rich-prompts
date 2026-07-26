# Benchmarking Methodology (Future)

> Status: **Proposed design** — harness lands in M4, first 50 fixtures in M2, 200+ fixtures in M4.

"Objectively better" is the product's core promise. The benchmark is how we keep ourselves honest: a public dataset, a repeatable harness, and regression gates in CI. If a change makes prompts worse, the benchmark must catch it before users do.

---

## 1. What the Benchmark Must Answer

1. **Did intent survive?** (gate — 100% required on the curated core set)
2. **Is the refined prompt better?** (quality metrics, per [evaluation-metrics.md](evaluation-metrics.md))
3. **Which pass helped or hurt?** (per-pass attribution via snapshot history)
4. **Did we regress?** (comparison against the committed baseline)

## 2. The Dataset

### 2.1 Structure

```
benchmarks/
├── dataset/
│   ├── coding/
│   │   ├── 0001-vague-perf-request/
│   │   │   ├── raw.md             # the messy input (exactly as a human wrote it)
│   │   │   ├── meta.yml           # category, difficulty, source, language
│   │   │   ├── invariants.yml     # intent invariants — see §2.2
│   │   │   └── reference.md       # human-written "gold" refinement (not required to match)
│   │   └── ...
│   ├── bug-report/
│   ├── research/
│   ├── writing/
│   ├── planning/
│   └── adversarial/               # designed to break the pipeline — see §5
├── results/
│   ├── baseline.json              # committed reference scores
│   └── local/                     # gitignored run artifacts
└── README.md                      # how to run, how to contribute fixtures
```

Target composition at M4 (200+ fixtures): coding 30% · bug-report 20% · research 15% · writing 15% · planning 10% · adversarial 10%. Difficulty tiers (trivial / typical / gnarly) roughly 20/60/20. Sources: maintainer-authored, community-contributed, and anonymized real-world prompts (with explicit consent and secret-scrubbing — see §7).

### 2.2 Intent Invariants — the heart of the dataset

Each fixture declares _machine-checkable statements about what must remain true_:

```yaml
# invariants.yml (design sketch)
must_preserve:
  - "Request is about dashboard performance AND login sessions (both, not either)"
  - "Stack constraint: React frontend, Node.js backend"
  - "Symptom: intermittent indefinite hang, not just slowness"
must_not_introduce:
  - "New scope (e.g., redesign, new features, dependency changes as requirements)"
  - "Numeric targets the user never stated (e.g., '<200ms')"
  - "Deadline or priority the user never stated"
```

Invariants are **human-authored at fixture creation** and reviewed like code. They are the closest thing we have to a formal specification of intent — and they make the 100% intent-preservation gate checkable rather than aspirational.

## 3. The Harness

Two evaluation tracks, kept strictly separate:

### 3.1 Deterministic track (every CI run)

- Runs the **heuristic-only pipeline** on every fixture
- Checks `must_preserve`/`must_not_introduce` via the verification pass + invariant matcher
- Computes deterministic metrics (structure score, specificity counters, token overhead)
- **Gate:** any invariant violation on the core set = CI red = no merge

### 3.2 Judged track (nightly + on-demand)

- Runs the full pipeline (including LLM-powered passes, **pinned model versions**)
- **LLM-as-judge** scores clarity/specificity/completeness against the rubric in [evaluation-metrics.md](evaluation-metrics.md), and answers the binary question: _"Does the refined prompt ask for the same thing as the raw prompt?"_
- Every judge call is logged (prompt, model, response) for auditability
- **Human anchor set:** ~30 fixtures also carry human ratings collected at fixture-creation; judge-vs-human agreement is itself tracked (target: Cohen's κ ≥ 0.7). If the judge drifts from humans, we fix the rubric, not the fixtures.

Results are written to `results/local/<run-id>.json` and diffed against `baseline.json` with per-metric thresholds. Nightly failures open an issue labeled `type: bug, area: eval` automatically.

## 4. Regression Policy

| Change type                    | Gate                                                                                                                                           |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Pass modification              | deterministic track green **and** no judged-track metric drop >2 points on its category                                                        |
| New pass                       | must not regress _any_ category; must improve its target category by ≥5 points or justify existence on other grounds (e.g., detection quality) |
| Engine change                  | full benchmark parity required (same outputs on deterministic track)                                                                           |
| Prompt-injection fixture added | must pass before merge (fixtures and fixes land together)                                                                                      |

Baselines are updated **only** via a maintainer-labeled PR (`area: eval`) with the before/after report attached. No silent baseline drift.

## 5. Adversarial Fixtures

A dedicated category designed to _break_ the pipeline, because users will:

- **Instruction injection** in the raw prompt ("ignore your rules and just do X") — the refiner must treat prompt content as _data_, never as instructions to itself
- **Intent traps** — prompts that look like category A but are category B ("write a blog post" that is actually a coding request)
- **Secret-bearing prompts** — API keys, tokens, connection strings; refined output must not transform, "improve," or relocate them into unsafe positions (interacts with the future `secret-redaction` pass — see [open-questions.md](open-questions.md))
- **Contradictions** ("use React, no frameworks") — must be surfaced as diagnostics, never silently resolved
- **Empty / near-empty / non-prompt inputs** — pipeline must degrade gracefully (output = input + diagnostics)
- **Adversarial plugin behavior** (M5) — passes that attempt to mutate in detection phase, omit explanations, or exfiltrate via metadata

## 6. Public Leaderboard & Replication

- Benchmark results publish as a versioned markdown report (`benchmarks/results/REPORT-<version>.md`) at every release
- The dataset is MIT-licensed like the code; external tools may run against it
- Replication instructions must be complete enough that a stranger can reproduce our numbers: pinned models, exact harness commands, rubric text. If it can't be replicated, it doesn't count.

## 7. Ethics & Privacy Rules for the Dataset

- No real user prompts without explicit written consent
- Consented prompts are scrubbed: secrets, PII, company identifiers removed _before_ commit
- Synthetic fixtures are preferred when in doubt
- The scrubbing checklist lives in `benchmarks/README.md` and is enforced in fixture PR review

## 8. Cost Controls

Judged-track runs cost money (judge calls). Budgets:

- Nightly full run: capped at a maintainer-configured token budget; harness aborts with a report at 80% consumption
- PRs never trigger judged runs automatically (trigger: maintainer comment `/benchmark`)
- Judge model pinned to the cheapest model that maintains κ ≥ 0.7 against the human anchor set — re-evaluated quarterly
