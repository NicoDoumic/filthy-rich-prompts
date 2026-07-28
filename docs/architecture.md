# Architecture

> Status: **Implemented** — canonical spec for the pipeline. All passes, context model, and engine described here are built and tested.

This document defines how filthy-rich-prompts works internally. If you only read one design doc, read this one.

---

## 1. Design Goals

| Goal                                          | Consequence                                                            |
| --------------------------------------------- | ---------------------------------------------------------------------- |
| Intent preservation is verifiable             | Immutable original + full snapshot history; diff is always computable  |
| Passes compose safely                         | Passes are pure functions over context; no pass can reach into another |
| Contributors add passes without touching core | Stable `Pass` contract + registry; core never imports a pass           |
| Every change is explainable                   | `Explanation` is a first-class, mandatory part of mutation results     |
| Runs anywhere                                 | Zero-dependency core; heuristic passes need no model, no network       |
| "Better" is measurable                        | Pipeline emits a `RefinementReport` consumed by the eval harness       |

### Non-goals

- **Not a prompt library.** We refine the user's prompt; we don't serve templates.
- **Not an agent runtime.** We output a better prompt; execution belongs to OpenCode.
- **Not model-tuned output (initially).** Model-agnostic by default; per-model tuning is an [open question](open-questions.md).

## 2. The Pipeline Model

```
                ┌──────────────────────────────────────────────────────┐
 raw prompt ──► │  PIPELINE                                            │ ──► RefinementResult
 (immutable)    │                                                      │      { refined, diff,
                │   phase 10 ──► phase 20 ──► ... ──► phase 70         │        explanations,
                │   (passes ordered by phase, then registration order) │        report }
                │                                                      │
                │   context flows left→right as immutable snapshots    │
                └──────────────────────────────────────────────────────┘
```

**Why a pipeline and not one big rewrite prompt?**

| Option                                    | Tradeoff                                                                                         | Verdict |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------ | ------- |
| Single LLM "improve this prompt" call     | Unverifiable intent drift, no explanations, needs a model for everything                         | ❌      |
| Rule engine over the whole prompt at once | Pass interactions become undebuggable                                                            | ❌      |
| **Sequential composable passes**          | Each pass small, testable, explainable; ordering explicit; mixing heuristic + LLM passes trivial | ✅      |

The cost of the pipeline approach is pass _interaction management_ (two passes editing the same text). We mitigate this with phases (§3), the immutability model (§4), and golden tests that run the _full_ pipeline, not just single passes.

## 3. Pass Kinds & Phases

There are exactly **three kinds** of passes:

| Kind             | May mutate prompt?    | May emit diagnostics? | May emit explanations?       |
| ---------------- | --------------------- | --------------------- | ---------------------------- |
| `detection`      | ❌ never              | ✅                    | ✅ (observations only)       |
| `transformation` | ✅                    | ✅                    | ✅ **must** (one per change) |
| `generation`     | ✅ (assembles output) | ✅                    | ✅                           |

The kind is enforced by the engine: a detection pass that returns a mutated prompt **fails validation loudly**. This is our primary composability guarantee — you can reason about detection passes as read-only queries.

### Pass Phases

Passes declare a **phase**; the engine sorts by phase, then by registration order. Phases are namespaced in tens so plugin passes can slot between built-ins (e.g., a plugin at phase `35` runs after context enrichment, before constraint extraction).

| Phase | Name            | Built-in passes                                                            |
| ----: | --------------- | -------------------------------------------------------------------------- |
|    10 | `detect-intent` | intent detection (request type, primary goal)                              |
|    20 | `diagnose`      | ambiguity detection, missing-context detection                             |
|    30 | `enrich`        | context enrichment                                                         |
|    40 | `constrain`     | constraint extraction, goal extraction, role inference                     |
|    50 | `structure`     | structure & output formatting, output-format inference, task decomposition |
|    60 | `generate`      | final prompt assembly                                                      |
|    70 | `verify`        | intent-preservation & information-loss verification                        |

Rules:

- **Phases are the only ordering mechanism.** Passes never reference other passes by name.
- **Detection passes must run in phases ≤ 50** (a detection pass after generation is meaningless).
- The `verify` phase (70) is reserved for non-mutating validation passes; mutations there fail validation. _(Rationale: nothing may change after verification, or the verification is void.)_
- Within a phase, order is registration order — deterministic and configurable.

## 4. The Context Model

### 4.1 Immutable snapshots (recommended) vs. mutable context

| Option                  | Pros                                                                                                           | Cons                                                                                                           |
| ----------------------- | -------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Mutable shared context  | Fast, low memory                                                                                               | Passes can corrupt each other's work; diffs unrecoverable; explanations unreliable; third-party plugins unsafe |
| **Immutable snapshots** | Free diff/time-travel; safe plugins; trivially testable (snapshot in → snapshot out); enables TUI step-through | Slightly more memory; engine must apply results                                                                |

**Decision: immutable snapshots.** Prompts are kilobytes, not gigabytes; the memory cost is noise. The debuggability and safety gains are the entire product.

### 4.2 Context shape

The context is what flows through the pipeline. Proposed shape (design sketch, not final code):

> **Implemented deviation (D1, Phase 1):** `metadata` is a `Readonly<Record<string, unknown>>`, not a `ReadonlyMap` — golden fixtures serialize reports to JSON, which `ReadonlyMap` does not support, and `PassResult.metadata` below was already a `Record`. The sketch has been updated to match the implementation.

```ts
// DESIGN SKETCH — Phase 1 implements this in src/core/types.ts
interface PassContext {
  /** The original user prompt. Never mutated. The ground truth for diffs. */
  readonly raw: string;

  /** The working prompt as of this snapshot. Equals `raw` for the first pass. */
  readonly current: string;

  /** Structured intent model, filled by phase-10 detection (unknown until then). */
  readonly intent: IntentModel;

  /** All diagnostics emitted by earlier passes (ambiguities, missing context, ...). */
  readonly diagnostics: readonly Diagnostic[];

  /** All explanations recorded so far. */
  readonly explanations: readonly Explanation[];

  /** Explicitly labeled assumptions/suggestions — never blended into the prompt. */
  readonly assumptions: readonly Assumption[];

  /** Resolved configuration for this run. */
  readonly config: ResolvedConfig;

  /** Pass-scoped scratch space: a pass may read what earlier passes published. */
  readonly metadata: Readonly<Record<string, unknown>>;
}
```

Supporting types:

```ts
// DESIGN SKETCH
type PassKind = "detection" | "transformation" | "generation";

interface Diagnostic {
  pass: string; // which pass emitted it
  severity: "info" | "warning" | "blocking";
  code: string; // machine-readable, e.g. 'AMBIGUOUS_QUANTIFIER'
  message: string; // human-readable
  span?: { start: number; end: number }; // where in the prompt, if localizable
  suggestions?: string[]; // possible resolutions (ambiguity interpretations, etc.)
}

interface Explanation {
  pass: string;
  change: string; // what changed, one line
  reason: string; // why it improves the prompt, one line
  before?: string; // excerpt before
  after?: string; // excerpt after
}

interface Assumption {
  pass: string;
  statement: string; // the inferred fact
  confidence: "low" | "medium" | "high";
  basis: string; // what in the prompt motivated it
}

interface IntentModel {
  category:
    | "coding"
    | "bug-report"
    | "research"
    | "writing"
    | "planning"
    | "other"
    | "unknown";
  goal?: string; // extracted primary goal, if confidently detected
  confidence: number; // 0..1
}
```

### 4.3 The Pass Contract

```ts
// DESIGN SKETCH
interface Pass {
  /** Unique kebab-case id, e.g. 'ambiguity-detection'. */
  readonly id: string;

  /** One-sentence description, shown in `frp passes list` and reports. */
  readonly description: string;

  readonly kind: PassKind;

  /** Pipeline phase — see §3. */
  readonly phase: number;

  /** Declared capabilities, used by the trust model (see plugin-api.md). */
  readonly requiresLLM: boolean;
  readonly requiresNetwork: boolean;

  /**
   * The pass itself. Receives an immutable snapshot; returns a result.
   * MUST be a pure function of its input: no global state, no hidden I/O
   * (LLM access is mediated — see §7).
   */
  run(ctx: PassContext): Promise<PassResult> | PassResult;
}

interface PassResult {
  /** New working prompt. Only allowed for transformation/generation passes. */
  prompt?: string;
  diagnostics?: Diagnostic[];
  explanations?: Explanation[];
  assumptions?: Assumption[];
  intent?: Partial<IntentModel>;
  metadata?: Record<string, unknown>; // published to context.metadata for later passes
}
```

**Contract invariants** (enforced by the engine, tested by the harness):

1. `run()` receives a frozen context; attempting mutation throws in dev mode.
2. `detection` pass returning `prompt` → validation error.
3. `transformation` pass returning `prompt` without at least one `Explanation` → validation error.
4. Returned `prompt` that drops the original entirely (empty/whitespace) → validation error.
5. Exceptions inside a pass are caught by the engine: the pass is skipped, a `blocking` diagnostic is recorded, and the pipeline continues. **One bad pass must never lose the user's prompt.**

## 5. Engine Internals

The engine is deliberately small — its whole job is orchestration + validation:

```
runPipeline(passes, rawPrompt, config):
  ctx = initialContext(rawPrompt, config)
  for pass in sortByPhase(passes):
    result = validate(pass.run(freeze(ctx)))
    ctx = apply(ctx, result)        // new snapshot; history retained
  report = buildReport(ctx.history)
  return { refined: ctx.current, diff: diff(raw, ctx.current),
           explanations: all, report }
```

Key behaviors:

- **Validation** enforces the §4.3 invariants between every pass.
- **History retention** is what powers `frp diff`, the TUI step-through, and eval attribution (which pass helped/hurt).
- **Report building** aggregates diagnostics, explanations, assumptions, and (in M4) quality scores into the `RefinementReport` — the single object rendered by CLI/TUI/OpenCode.

## 6. Diff & Explanation Model

- Diffs are computed **line-wise** between `raw` and `refined`, and **per-pass** between consecutive snapshots.
- Every `Explanation` links to the snapshot transition that produced it, so "why did this change?" is always answerable with before/after evidence.
- Long prompts: the report groups explanations by pass, ordered by phase — matching how the user watched the pipeline run.

## 7. Heuristic Passes vs. LLM-Powered Passes

Passes come in two flavors:

|              | Heuristic passes                                                               | LLM-powered passes                                                    |
| ------------ | ------------------------------------------------------------------------------ | --------------------------------------------------------------------- |
| Examples     | structure, ambiguity detection (patterns), constraint extraction (cue phrases) | nuanced intent detection, semantic ambiguity resolution, verification |
| Dependencies | none (pure TS)                                                                 | a model provider                                                      |
| Latency/cost | ~0 / free                                                                      | real                                                                  |
| Determinism  | full — golden-testable                                                         | partial — eval-tested with pinned models                              |
| Offline      | ✅                                                                             | ❌ (unless local model)                                               |

**Decisions:**

1. **The core pipeline works with zero LLM passes.** LLM-powered passes are opt-in enhancements, never required. This keeps the skill free, fast, offline-capable, and CI-testable.
2. **LLM access is mediated by a provider port**, not called directly by passes:

```ts
// DESIGN SKETCH — the only way a pass may touch a model
interface ModelProvider {
  complete(request: CompletionRequest): Promise<CompletionResponse>;
}
// Injected via config; pass declares `requiresLLM: true` and receives
// the provider via context (ctx.config.modelProvider).
```

3. Passes declare `requiresLLM`/`requiresNetwork` so the trust model ([plugin-api.md](plugin-api.md)) and `frp doctor` can surface exactly what will run and what it costs.

## 8. Error Handling Philosophy

- **Passes never throw at the user.** Engine catches, downgrades the pass to a diagnostic, continues.
- **Expected failures are values.** Validation problems are returned as diagnostics, not exceptions (see [coding-standards.md](coding-standards.md)).
- **The raw prompt is the ultimate fallback.** If everything fails, output = input + a report of what failed. Refinement must never be worse than doing nothing.

## 9. Security & Trust Notes

- Third-party passes run with the same process privileges as OpenCode — the plugin trust model (declared capabilities, community review tiers) is specified in [plugin-api.md](plugin-api.md).
- Prompts may contain secrets. A future `secret-redaction` detection pass is anticipated; the privacy tradeoffs are tracked in [open-questions.md](open-questions.md). The `.gitignore` already treats `.env` and eval caches as sensitive.

## 10. Performance Budget

Targets for the heuristic-only pipeline (measured in M4 benchmarks):

- p50 refine latency < 50 ms for a 1 KB prompt, < 250 ms for 10 KB.
- Memory: snapshot history ≤ ~2× prompt size per pass (strings are interned; we never copy the raw prompt).
- CLI cold start < 150 ms (constrains dependency choices; hence zero-dep core).

## 11. What This Architecture Explicitly Enables Later

| Future feature                        | Enabled by                                                     |
| ------------------------------------- | -------------------------------------------------------------- |
| Diff visualization                    | immutable snapshots (§4)                                       |
| Explain why each improvement was made | mandatory `Explanation` (§4.3)                                 |
| Interactive approval                  | per-pass boundaries + snapshot resume (§5)                     |
| Prompt scoring/metrics                | `RefinementReport` as first-class output (§5)                  |
| Plugin architecture                   | registry + pass contract + capability declarations (§4.3, §7)  |
| Benchmarking                          | deterministic heuristic passes + per-pass attribution (§7, §5) |
