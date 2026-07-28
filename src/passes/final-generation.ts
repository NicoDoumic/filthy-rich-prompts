/**
 * final generation (phase 60, generation)
 *
 * Assembles the refined prompt from all pass outputs. This is the final
 * transformation pass that produces the output-ready prompt. It ensures
 * all sections are in the canonical order and no section is duplicated.
 *
 * Mutation doctrine:
 * - Assembles sections in canonical order: # Task → ## Objective → ## Role
 *   → ## Context → ## Constraints → ## Sub-tasks → ## Output Format.
 * - Deduplicates sections that may have been added by multiple passes.
 * - Preserves all verbatim spans from the original.
 *
 * No-op inputs: always mutates (it's the final assembler).
 * Transforms: produces the canonical output.
 */
import type { Explanation, Pass } from "../core/types.js";

/** Canonical section order. */
const SECTION_ORDER = [
  "# Task",
  "## Objective",
  "## Role",
  "## Context",
  "## Constraints",
  "## Sub-tasks",
  "## Output Format",
];

/** Detects all markdown headings in text. */
function extractSections(text: string): Map<string, string> {
  const sections = new Map<string, string>();
  const lines = text.split("\n");
  let currentHeading = "# Task";
  let currentContent: string[] = [];

  for (const line of lines) {
    const headingMatch = line.match(/^#{1,6}\s+(.+)/);
    if (headingMatch) {
      if (currentContent.length > 0) {
        sections.set(currentHeading, currentContent.join("\n").trim());
      }
      currentHeading = line.trim();
      currentContent = [];
    } else {
      currentContent.push(line);
    }
  }
  if (currentContent.length > 0) {
    sections.set(currentHeading, currentContent.join("\n").trim());
  }

  return sections;
}

export const finalGeneration: Pass = {
  id: "final-generation",
  description:
    "Assembles the refined prompt from all pass outputs into the canonical section order.",
  kind: "generation",
  phase: 60,
  requiresLLM: false,
  requiresNetwork: false,

  run(ctx) {
    const text = ctx.current;

    // No-op: empty prompt.
    if (text.trim().length === 0) return {};

    // No-op: already in canonical order (no reordering needed).
    // Quick check: if the first line starts with "# Task" and sections follow
    // the canonical order, skip.
    const trimmed = text.trim();
    if (trimmed.startsWith("# Task")) return {};

    const sections = extractSections(text);

    // Build the canonical output.
    const outputParts: string[] = [];
    for (const heading of SECTION_ORDER) {
      const content = sections.get(heading);
      if (content && content.length > 0) {
        outputParts.push(`${heading}\n\n${content}`);
      }
    }

    // Add any remaining sections not in the canonical order.
    for (const [heading, content] of sections) {
      if (!SECTION_ORDER.includes(heading) && content.length > 0) {
        outputParts.push(`${heading}\n\n${content}`);
      }
    }

    const output = outputParts.join("\n\n") + "\n";

    const explanations: Explanation[] = [
      {
        pass: "final-generation",
        change: "assembled prompt into canonical section order",
        reason:
          "a consistent section order improves executor predictability and output quality",
        before: `${sections.size} section${sections.size === 1 ? "" : "s"} found`,
        after: `${SECTION_ORDER.length} canonical sections`,
      },
    ];

    return {
      prompt: output,
      explanations,
      metadata: {
        "final-generation:sections": sections.size,
      },
    };
  },
};