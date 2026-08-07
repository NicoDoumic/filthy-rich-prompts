/**
 * refine-outgoing — the pure logic behind the OpenCode auto-refine hook.
 *
 * Decides what happens to one outgoing user prompt when auto-refine is on.
 * Deliberately free of OpenCode types: it is fully unit-testable without an
 * OpenCode runtime, and the plugin glue (opencode-plugin.ts) stays thin.
 *
 * Doctrine:
 * - autoRefine off, empty input, or a no-op refinement → byte-identical passthrough.
 * - Dual delivery: when enabled (default), the executing model receives BOTH
 *   the verbatim original (intent anchor — nothing is ever dropped from the
 *   wire) AND the refined request, plus a guaranteed minimum of discovery
 *   questions (default 5) that the model must resolve with the user before
 *   executing. Ordering matters: original first anchors intent; refined next
 *   is the working spec; questions last are the closure protocol.
 * - Any engine failure → original text, unchanged (architecture §8:
 *   interception must never be worse than no interception).
 */
import { refine } from "../index.js";
import type { RefineResult } from "../core/types.js";
import {
  buildDiscoveryQuestions,
  composeDualDelivery,
  composeRefinedWithDiscovery,
  DEFAULT_MIN_QUESTIONS,
} from "../core/discovery.js";
export { OPEN_QUESTIONS_HEADING } from "../core/modes.js";

export interface RefineOutgoingOptions {
  readonly autoRefine: boolean;
  /** Include the verbatim original above the refined request (default true). */
  readonly includeOriginal?: boolean;
  /** Guaranteed minimum discovery questions (default {@link DEFAULT_MIN_QUESTIONS}). */
  readonly minQuestions?: number;
}

export interface RefineOutgoingResult {
  /** The text to send — the composed wire format when applicable, otherwise the original. */
  readonly text: string;
  /** Whether the text differs from the input. */
  readonly changed: boolean;
  /** The verbatim original, when the wire includes it. */
  readonly original?: string;
  /** The refined request (may embed a mode-level questions block). */
  readonly refined?: string;
  /** Human-readable note about what happened (for logs/annotations). Never for passthroughs. */
  readonly note?: string;
}

/** The injected engine signature (defaults to the real refine; tests stub it). */
export type RefineFn = (raw: string) => Promise<RefineResult>;

/**
 * Refines one outgoing prompt if auto-refine is enabled, composing the dual
 * (original + refined + discovery questions) wire format.
 */
export async function refineOutgoing(
  rawText: string,
  options: RefineOutgoingOptions,
  refineFn: RefineFn = refine,
): Promise<RefineOutgoingResult> {
  if (!options.autoRefine) return { text: rawText, changed: false };
  if (rawText.trim().length === 0) return { text: rawText, changed: false };

  const includeOriginal = options.includeOriginal ?? true;
  const minQuestions = options.minQuestions ?? DEFAULT_MIN_QUESTIONS;

  try {
    const result = await refineFn(rawText);
    if (result.refined === rawText) return { text: rawText, changed: false };

    const questions = buildDiscoveryQuestions(
      result.report.diagnostics,
      minQuestions,
    );

    const text = includeOriginal
      ? composeDualDelivery(rawText, result.refined, questions)
      : composeRefinedWithDiscovery(result.refined, questions);

    const changes = result.explanations.length;
    const findings = result.report.diagnostics.length;
    return {
      text,
      changed: true,
      original: rawText,
      refined: result.refined,
      note: `refined by prompt-refiner (${changes} explanation${changes === 1 ? "" : "s"}, ${findings} diagnostic${findings === 1 ? "" : "s"}, ${questions.length} discovery question${questions.length === 1 ? "" : "s"})`,
    };
  } catch (err) {
    // Failure doctrine: the original prompt always goes through.
    if (process.env.NODE_ENV !== "production") {
      console.warn("[frp refine-outgoing] refinement failed, passing through original:", err);
    }
    return { text: rawText, changed: false };
  }
}
