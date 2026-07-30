/**
 * Context construction, application of pass results, and deep-freezing.
 * See docs/architecture.md §4 (immutable snapshots) and §4.3 (invariants).
 */
import type {
  IntentModel,
  PassContext,
  PassResult,
  ResolvedConfig,
} from "./types.js";

/** The intent state before any detection pass has run. */
export const UNKNOWN_INTENT: IntentModel = {
  category: "unknown",
  confidence: 0,
};

/**
 * Deeply freezes a value in place (arrays and plain objects).
 *
 * D5: every context snapshot is frozen, always — not just in dev. Prompts are
 * kilobytes, so the cost is noise, and "frozen in dev but mutable in prod"
 * would be two behaviors instead of one guarantee (architecture §4.1).
 */
export function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const key of Object.keys(value)) {
      deepFreeze((value as Record<string, unknown>)[key]);
    }
  }
  return value;
}

/** Builds the initial (frozen) context for a pipeline run. */
export function initialContext(
  raw: string,
  config: ResolvedConfig,
): PassContext {
  return deepFreeze<PassContext>({
    raw,
    current: raw,
    intent: UNKNOWN_INTENT,
    diagnostics: [],
    explanations: [],
    assumptions: [],
    config,
    metadata: {},
    userAnswers: {},
  });
}

/**
 * Applies a validated pass result, producing the next immutable snapshot.
 * The previous context is never modified; `raw` and `config` always carry through.
 */
export function applyResult(ctx: PassContext, result: PassResult): PassContext {
  return deepFreeze<PassContext>({
    raw: ctx.raw,
    current: result.prompt ?? ctx.current,
    intent: result.intent ? { ...ctx.intent, ...result.intent } : ctx.intent,
    diagnostics: result.diagnostics
      ? [...ctx.diagnostics, ...result.diagnostics]
      : ctx.diagnostics,
    explanations: result.explanations
      ? [...ctx.explanations, ...result.explanations]
      : ctx.explanations,
    assumptions: result.assumptions
      ? [...ctx.assumptions, ...result.assumptions]
      : ctx.assumptions,
    config: ctx.config,
    metadata: result.metadata
      ? { ...ctx.metadata, ...result.metadata }
      : ctx.metadata,
    userAnswers: result.userAnswers
      ? { ...ctx.userAnswers, ...result.userAnswers }
      : ctx.userAnswers,
  });
}
