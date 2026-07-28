/**
 * structure (phase 50, transformation)
 *
 * Reorganizes prose prompts into a canonical section layout. This is the only
 * M1 pass that mutates — which makes it the only pass that *can* break intent.
 * Its mutation doctrine (the verbatim-span constraint, Phase 1 plan D6):
 *
 *   REORGANIZE AND LABEL, NEVER REWORD.
 *
 *   - Input is segmented into sentences with Intl.Segmenter (Unicode-aware,
 *     coding-standards §6).
 *   - Every sentence in the output is a byte-for-byte span of the input.
 *   - The only new text is scaffolding: static headings and blank lines.
 *     Titles are never generated — inventing a title is inventing content.
 *   - Context-clue sentences ("using react + node btw") are relocated, not
 *     rewritten, into a `## Context` section.
 *
 * Tier 0 status: PROVISIONAL. Mechanical span preservation is a proxy for
 * semantic intent preservation, not a proof (open-questions Q1). The full
 * gate needs the phase-70 verification pass and the M4 judged track; M1's
 * substitutes are this doctrine plus property tests P1–P3.
 *
 * No-op inputs: prompts that already contain markdown headings (idempotence,
 * P2), and empty/whitespace prompts.
 * Transforms: unstructured prose → `# Task` + optional `## Context` layout.
 */
import type { Explanation, Pass } from "../core/types.js";
import { segmentSentences } from "../core/sentences.js";
import { HEADING_PRESENT } from "../core/headings.js";

const CONTEXT_CUE =
  /\b(i'?m using|we'?re using|we use|i use|using [a-z0-9]|btw|by the way|for context|stack\s*:|running on)\b/i;

export const structure: Pass = {
  id: "structure",
  description:
    "Reorganizes unstructured prose into a canonical # Task / ## Context layout using verbatim spans only.",
  kind: "transformation",
  phase: 50,
  requiresLLM: false,
  requiresNetwork: false,

  run(ctx) {
    const text = ctx.current;

    // No-op: nothing to structure (also guards engine invariant 4).
    if (text.trim().length === 0) return {};
    // No-op: already structured (idempotence — property test P2).
    if (HEADING_PRESENT.test(text)) return {};

    const sentences = segmentSentences(text);
    const contextSentences = sentences.filter((sentence) =>
      CONTEXT_CUE.test(sentence),
    );
    const bodySentences = sentences.filter(
      (sentence) => !CONTEXT_CUE.test(sentence),
    );

    const body = bodySentences.join("").trim();
    const context = contextSentences.join("").trim();

    const explanations: Explanation[] = [
      {
        pass: "structure",
        change: "added a `# Task` heading",
        reason:
          "an explicit anchor makes the request scannable for the executing model",
        before: text.trim().slice(0, 60),
        after: "# Task",
      },
    ];

    // Edge: the entire prompt was context clues — no separate section needed.
    if (body.length === 0 || context.length === 0) {
      return {
        prompt: `# Task\n\n${text.trim()}\n`,
        explanations,
      };
    }

    const firstContext = contextSentences[0]?.trim().slice(0, 60);
    explanations.push({
      pass: "structure",
      change: `relocated ${contextSentences.length} context sentence${contextSentences.length === 1 ? "" : "s"} into a \`## Context\` section`,
      reason:
        "context buried in prose is routinely missed by executors; it belongs in a canonical position",
      ...(firstContext !== undefined ? { before: firstContext } : {}),
      after: "## Context",
    });

    return {
      prompt: `# Task\n\n${body}\n\n## Context\n\n${context}\n`,
      explanations,
    };
  },
};
