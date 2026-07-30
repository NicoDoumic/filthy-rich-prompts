/**
 * refine-outgoing — the pure logic behind the OpenCode auto-refine hook.
 *
 * Decides what happens to one outgoing user prompt when auto-refine is on.
 * Deliberately free of OpenCode types: it is fully unit-testable without an
 * OpenCode runtime, and the plugin glue (opencode-plugin.ts) stays thin.
 *
 * Doctrine:
 * - autoRefine off, empty input, or a no-op refinement → byte-identical passthrough.
 * - `blocking` diagnostics append an Open questions section, so the *model*
 *   asks the user for the missing context (pre-release D5: plugins cannot
 *   invoke OpenCode's question tool; interactive per-pass approval is M3/TUI).
 * - Any engine failure → original text, unchanged (architecture §8:
 *   interception must never be worse than no interception).
 */
import { refine } from "../index.js";
import type { RefineResult } from "../core/types.js";
import { OPEN_QUESTIONS_HEADING } from "../core/modes.js";
export { OPEN_QUESTIONS_HEADING };

export interface RefineOutgoingOptions {
  readonly autoRefine: boolean;
}

export interface RefineOutgoingResult {
  /** The text to send — refined when enabled and applicable, otherwise the original. */
  readonly text: string;
  /** Whether the text differs from the input. */
  readonly changed: boolean;
  /** Human-readable note about what happened (for logs/annotations). Never for passthroughs. */
  readonly note?: string;
}

/** The injected engine signature (defaults to the real refine; tests stub it). */
export type RefineFn = (raw: string) => Promise<RefineResult>;

/**
 * Refines one outgoing prompt if auto-refine is enabled.
 */
export async function refineOutgoing(
  rawText: string,
  options: RefineOutgoingOptions,
  refineFn: RefineFn = refine,
): Promise<RefineOutgoingResult> {
  if (!options.autoRefine) return { text: rawText, changed: false };
  if (rawText.trim().length === 0) return { text: rawText, changed: false };

  try {
    const result = await refineFn(rawText);
    if (result.refined === rawText) return { text: rawText, changed: false };

    let text = result.refined;
    const blocking = result.report.diagnostics.filter(
      (d) => d.severity === "blocking",
    );
    if (blocking.length > 0) {
      text =
        text.trimEnd() +
        `\n\n${OPEN_QUESTIONS_HEADING}\n\n` +
        blocking.map((d) => `- ${d.message}`).join("\n") +
        "\n";
    }

    const changes = result.explanations.length;
    const findings = result.report.diagnostics.length;
    return {
      text,
      changed: true,
      note: `refined by prompt-refiner (${changes} explanation${changes === 1 ? "" : "s"}, ${findings} diagnostic${findings === 1 ? "" : "s"})`,
    };
  } catch (err) {
    // Failure doctrine: the original prompt always goes through.
    if (process.env.NODE_ENV !== "production") {
      console.warn("[frp refine-outgoing] refinement failed, passing through original:", err);
    }
    return { text: rawText, changed: false };
  }
}
