/**
 * RefinementReport assembly (architecture §5–§6).
 *
 * The report is deterministic by construction (D8): no timestamps, no
 * durations — golden fixtures compare reports byte-for-byte.
 */
import type { PassContext, PassRun, RefinementReport } from "./types.js";

/**
 * Aggregates the final context and per-pass run records into the single
 * report object consumed by renderers (CLI/TUI/OpenCode) and the golden
 * test harness.
 */
export function buildReport(
  ctx: PassContext,
  passRuns: readonly PassRun[],
): RefinementReport {
  return {
    toolVersion: ctx.config.toolVersion,
    passRuns,
    intent: ctx.intent,
    diagnostics: ctx.diagnostics,
    explanations: ctx.explanations,
    assumptions: ctx.assumptions,
  };
}
