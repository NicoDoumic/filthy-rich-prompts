/**
 * Core types for the refinement pipeline.
 *
 * Implements the contract specified in docs/architecture.md §4.2–4.3, with one
 * documented deviation (D1): `PassContext.metadata` is a
 * `Readonly<Record<string, unknown>>` rather than a `ReadonlyMap`, because the
 * golden-test fixtures serialize reports to JSON and `ReadonlyMap` does not.
 *
 * @packageDocumentation
 */

/** The three pass kinds — see docs/architecture.md §3. */
export type PassKind = "detection" | "transformation" | "generation";

/** Request categories the intent-detection pass can assign. */
export type IntentCategory =
  | "coding"
  | "bug-report"
  | "research"
  | "writing"
  | "planning"
  | "other"
  | "unknown";

/**
 * Structured model of what the user is asking for.
 * Filled by phase-10 detection; `unknown` until then.
 */
export interface IntentModel {
  readonly category: IntentCategory;
  /** Extracted primary goal (verbatim from the prompt), if confidently detected. */
  readonly goal?: string;
  /** 0..1 — heuristic confidence. Below the pass's tie threshold, category is `unknown`. */
  readonly confidence: number;
}

/** Machine-checkable observation about the prompt. Detection passes emit these. */
export interface Diagnostic {
  /** ID of the pass that emitted it. */
  readonly pass: string;
  readonly severity: "info" | "warning" | "blocking";
  /** Machine-readable code, SCREAMING_SNAKE, namespaced by pass (e.g. `VAGUE_QUANTIFIER`). */
  readonly code: string;
  /** Human-readable explanation. */
  readonly message: string;
  /** Character offsets into the prompt, when the finding is localizable. */
  readonly span?: { readonly start: number; readonly end: number };
  /** Possible resolutions (ambiguity interpretations, etc.). */
  readonly suggestions?: readonly string[];
}

/**
 * The mandatory rationale attached to every transformation.
 * The engine rejects transformations that lack one (architecture §4.3, invariant 3).
 */
export interface Explanation {
  /** ID of the pass that made the change. */
  readonly pass: string;
  /** What changed, one line. */
  readonly change: string;
  /** Why it improves the prompt, one line. */
  readonly reason: string;
  readonly before?: string;
  readonly after?: string;
}

/** An inferred fact — labeled, never blended into the prompt (prime directive #2). */
export interface Assumption {
  readonly pass: string;
  readonly statement: string;
  readonly confidence: "low" | "medium" | "high";
  /** What in the prompt motivated the inference. */
  readonly basis: string;
}

/**
 * Resolved, immutable configuration for one pipeline run.
 */
export interface ResolvedConfig {
  /** Per-pass enable/disable overrides. Absent = enabled. */
  readonly passes: Readonly<Record<string, boolean>>;
  /** Tool version at build time, recorded in every report (open-questions Q11). */
  readonly toolVersion: string;
  /** Refinement mode: beginner, expert, or silent. */
  readonly mode?: string;
  /** Output control flags. */
  readonly output?: { readonly diff: boolean; readonly explanations: boolean };
}

/** Options accepted by {@link refine}. Resolved into {@link ResolvedConfig}. */
export interface RefineOptions {
  /** Per-pass enable/disable overrides, e.g. `{ structure: false }`. */
  readonly passes?: Record<string, boolean>;
  /** Refinement mode override. */
  readonly mode?: string;
}

/** The immutable state that flows through the pipeline (architecture §4.2). */
export interface PassContext {
  /** The original user prompt. Never mutated. Ground truth for diffs. */
  readonly raw: string;
  /** The working prompt as of this snapshot. Equals `raw` for the first pass. */
  readonly current: string;
  readonly intent: IntentModel;
  readonly diagnostics: readonly Diagnostic[];
  readonly explanations: readonly Explanation[];
  readonly assumptions: readonly Assumption[];
  readonly config: ResolvedConfig;
  /**
   * Pass-scoped scratch space published by earlier passes (D1: Record, not
   * ReadonlyMap). Plugins must namespace keys: `my-plugin:key`.
   */
  readonly metadata: Readonly<Record<string, unknown>>;
}

/** The pass contract (architecture §4.3). Built-in passes are plain literals of this shape. */
export interface Pass {
  /** Unique kebab-case id, e.g. `ambiguity-detection`. */
  readonly id: string;
  /** One-sentence description, shown in reports and (M3) `frp passes list`. */
  readonly description: string;
  readonly kind: PassKind;
  /** Pipeline phase — see architecture §3. */
  readonly phase: number;
  /** Declared capabilities, used by the (M5) trust model. */
  readonly requiresLLM: boolean;
  readonly requiresNetwork: boolean;
  /**
   * The pass itself. MUST be pure: no global state, no hidden I/O.
   * Receives a deep-frozen context; returns a result the engine validates
   * and applies as a new immutable snapshot.
   */
  run(ctx: PassContext): Promise<PassResult> | PassResult;
}

/** What a pass may return. Returning `{}` (a no-op) is always valid. */
export interface PassResult {
  /** New working prompt. Only transformation/generation passes may set this. */
  readonly prompt?: string;
  readonly diagnostics?: Diagnostic[];
  readonly explanations?: Explanation[];
  readonly assumptions?: Assumption[];
  readonly intent?: Partial<IntentModel>;
  /** Published to `context.metadata` for later passes. */
  readonly metadata?: Record<string, unknown>;
}

/** One line of a line-wise diff between two prompt snapshots. */
export interface DiffLine {
  readonly type: "same" | "add" | "remove";
  readonly line: string;
}

/** What happened to one pass during a run. */
export interface PassRun {
  readonly id: string;
  readonly phase: number;
  readonly kind: PassKind;
  /**
   * `applied` — ran and its result was accepted (possibly a no-op).
   * `skipped` — disabled via config.
   * `failed` — threw or returned a contract-violating result; pipeline continued (architecture §8).
   */
  readonly status: "applied" | "skipped" | "failed";
}

/**
 * The aggregated outcome of a pipeline run — the single object rendered by
 * CLI/TUI/OpenCode (architecture §5). Deliberately contains no timing fields:
 * golden fixtures must be byte-stable (D8).
 */
export interface RefinementReport {
  readonly toolVersion: string;
  readonly passRuns: readonly PassRun[];
  readonly intent: IntentModel;
  readonly diagnostics: readonly Diagnostic[];
  readonly explanations: readonly Explanation[];
  readonly assumptions: readonly Assumption[];
  readonly mode?: string;
}

/** The public result of {@link refine} (ROADMAP M1 exit criterion). */
export interface RefineResult {
  readonly refined: string;
  readonly diff: readonly DiffLine[];
  readonly explanations: readonly Explanation[];
  readonly report: RefinementReport;
}
