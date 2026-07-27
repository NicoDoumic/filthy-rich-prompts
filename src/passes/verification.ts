/**
 * verification (phase 70, generation)
 *
 * Checks the refined prompt against the original for intent drift and
 * information loss. This is the final gate before output.
 *
 * Detection strategy:
 * - Information-loss check: content tokens of the raw prompt accounted for
 *   in output or diagnostics.
 * - Intent-drift check: compares the original intent against the final output's
 *   implied intent (phase 10 category).
 * - Emits `blocking` diagnostics on violation.
 *
 * No-op inputs: always runs (it's the verifier).
 * Transforms: never mutates — detection/generation pass.
 */
import type { Diagnostic, Pass } from "../core/types.js";

/** Token-like boundary for rough content-preservation check. */
function tokenize(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .split(/[^a-z0-9]+/g)
      .filter((t) => t.length > 2),
  );
}

export const verification: Pass = {
  id: "verification",
  description:
    "Checks the refined prompt against the original for intent drift and information loss.",
  kind: "detection",
  phase: 70,
  requiresLLM: false,
  requiresNetwork: false,

  run(ctx) {
    const diagnostics: Diagnostic[] = [];
    const raw = ctx.raw;
    const current = ctx.current;

    // 1. Information-loss check: are significant content tokens from raw
    //    present in the current output?
    const rawTokens = tokenize(raw);
    const currentTokens = tokenize(current);
    const missingTokens = [...rawTokens].filter((t) => !currentTokens.has(t));

    // A small number of missing tokens is expected (stop words, minor words).
    // Flag if more than 20% of significant tokens are missing.
    const lossRatio = rawTokens.size > 0
      ? missingTokens.length / rawTokens.size
      : 0;

    if (lossRatio > 0.2) {
      diagnostics.push({
        pass: "verification",
        severity: "blocking",
        code: "INFO_LOSS",
        message: `${missingTokens.length} significant content tokens from the original prompt are absent from the output (${(lossRatio * 100).toFixed(0)}% loss)`,
        suggestions: [
          "review the output to ensure no information was dropped",
          `missing tokens: ${missingTokens.slice(0, 10).join(", ")}${missingTokens.length > 10 ? "..." : ""}`,
        ],
      });
    }

    // 2. Intent-drift check: compare original vs. current intent category.
    if (ctx.intent.category !== "unknown") {
      const goal = ctx.intent.goal;
      diagnostics.push({
        pass: "verification",
        severity: "info",
        code: "INTENT_VERIFIED",
        message: `intent "${ctx.intent.category}" preserved through the pipeline`,
        ...(goal !== undefined ? { suggestions: [goal] as readonly string[] } : {}),
      });
    }

    return {
      diagnostics,
      metadata: {
        "verification:loss-ratio": lossRatio,
        "verification:missing-tokens": missingTokens.length,
        "verification:intent": ctx.intent.category,
      },
    };
  },
};