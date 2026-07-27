/**
 * constraint extraction (phase 40, transformation)
 *
 * Turns implicit constraints ("make it fast", "keep it simple") into explicit,
 * checkable statements in a `## Constraints` section. This pass is the
 * transformation counterpart to ambiguity-detection's IMPLICIT_CONSTRAINT
 * diagnostic — it takes the flagged constraints and makes them explicit.
 *
 * Mutation doctrine:
 * - Implicit constraint cues are detected and extracted into a `## Constraints`
 *   section (verbatim spans — never reworded).
 * - The constraint is reformulated as a checkable statement prefixed with
 *   "[constraint: ...]" to mark it as extracted rather than original.
 * - The original sentence remains in the body (no removal).
 *
 * No-op inputs: prompts with no implicit constraint cues.
 * Transforms: adds `## Constraints` section with explicit statements.
 */
import type { Explanation, Pass } from "../core/types.js";

/** Cues that indicate implicit constraints. */
const CONSTRAINT_CUES: readonly RegExp[] = [
  /\b(make it|keep it|make this|keep this)\s+(fast|faster|simple|simpler|easy|easier|clean|cleaner|small|smaller|lightweight|secure|safe|reliable|responsive|scalable|maintainable|readable|efficient|robust|pretty|nice|good|great)\b/gi,
  /\b(should be|must be|has to be|have to be|needs? to be)\s+(fast|simple|easy|secure|safe|reliable|efficient|scalable|maintainable|compatible|portable|accessible)\b/gi,
  /\b(don'?t|do not|shouldn'?t|should not|must not|never|cannot|can't)\s+(break|change|remove|modify|touch|affect|impact|slow|block|fail|crash)\b/gi,
  /\b(without|while maintaining|while keeping|while preserving|while ensuring)\b/gi,
];

/** Categorizes a constraint match into a labeled statement. */
function categorizeConstraint(match: string): string {
  const lower = match.toLowerCase();
  if (/\b(fast|faster|speed|quick|performance|responsive|efficient|slow)\b/.test(lower)) {
    return `Performance: ${match}`;
  }
  if (/\b(secure|safe|security|protect|private|auth)\b/.test(lower)) {
    return `Security: ${match}`;
  }
  if (/\b(simple|simpler|easy|easier|clean|cleaner|maintainable|readable)\b/.test(lower)) {
    return `Simplicity: ${match}`;
  }
  if (/\b(compatible|portable|accessible|cross-platform|browser|device)\b/.test(lower)) {
    return `Compatibility: ${match}`;
  }
  if (/\b(break|change|remove|modify|touch|affect|impact)\b/.test(lower)) {
    return `Preservation: ${match}`;
  }
  return `Constraint: ${match}`;
}

export const constraintExtraction: Pass = {
  id: "constraint-extraction",
  description:
    "Turns implicit constraints into explicit, checkable statements in a ## Constraints section.",
  kind: "transformation",
  phase: 40,
  requiresLLM: false,
  requiresNetwork: false,

  run(ctx) {
    const text = ctx.current;

    // No-op: empty prompt.
    if (text.trim().length === 0) return {};

    // No-op: already has constraints section.
    if (/\n## Constraints\n/.test(text)) return {};

    const constraints: string[] = [];
    const seen = new Set<string>();

    for (const cue of CONSTRAINT_CUES) {
      const regex = new RegExp(cue.source, "gi");
      let match: RegExpExecArray | null;
      while ((match = regex.exec(text)) !== null) {
        const constraint = match[0].trim();
        if (seen.has(constraint.toLowerCase())) continue;
        seen.add(constraint.toLowerCase());
        constraints.push(categorizeConstraint(constraint));
      }
    }

    // No-op: no constraints found.
    if (constraints.length === 0) return {};

    const explanations: Explanation[] = [
      {
        pass: "constraint-extraction",
        change: `extracted ${constraints.length} implicit constraint${constraints.length === 1 ? "" : "s"} into a \`## Constraints\` section`,
        reason:
          "implicit constraints are routinely missed by executors; making them explicit improves reliability",
        ...(constraints[0] !== undefined ? { before: constraints[0] } : {}),
        after: "## Constraints",
      },
    ];

    const constraintBlock = constraints
      .map((c) => `- ${c} [constraint: extracted]`)
      .join("\n");

    return {
      prompt: `${text.trim()}\n\n## Constraints\n\n${constraintBlock}\n`,
      explanations,
      metadata: {
        "constraint-extraction:count": constraints.length,
      },
    };
  },
};