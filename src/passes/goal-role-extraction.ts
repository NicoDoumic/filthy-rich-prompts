/**
 * goal & role extraction (phase 40, transformation)
 *
 * States the objective explicitly and infers the appropriate expert role
 * for the executing model. This pass builds on intent-detection's output
 * (phase 10) and adds explicit role assignment.
 *
 * Mutation doctrine:
 * - Adds a `## Objective` section with the extracted goal.
 * - Adds a `## Role` section with an inferred expert role.
 * - The original text is preserved and annotated.
 *
 * No-op inputs: prompts where the goal is already explicit.
 * Transforms: adds structured sections.
 */
import type { Explanation, Pass } from "../core/types.js";

/** Maps detected intent categories to expert roles. */
const CATEGORY_ROLES: Record<string, string> = {
  "coding": "Expert software engineer",
  "bug-report": "Expert software engineer — debugging and root-cause analysis",
  "research": "Research analyst — evidence-based analysis",
  "writing": "Expert writer and editor",
  "planning": "Strategic planner — structured execution plan",
};

/** Cues that suggest the goal is already explicit. */
const EXPLICIT_GOAL = /^(# Task|## Objective|## Goal|# |## )/m;

export const goalRoleExtraction: Pass = {
  id: "goal-role-extraction",
  description:
    "States the objective explicitly and infers the appropriate expert role for the executing model.",
  kind: "transformation",
  phase: 40,
  requiresLLM: false,
  requiresNetwork: false,

  run(ctx) {
    const text = ctx.current;

    // No-op: empty prompt.
    if (text.trim().length === 0) return {};

    // No-op: already has objective or role sections. The Role-only check is
    // deliberately absent: EXPLICIT_GOAL matches any line starting with "# "
    // (including "## Role"), so a Role check below would be unreachable.
    if (EXPLICIT_GOAL.test(text)) return {};

    const category = ctx.intent.category;
    const role = CATEGORY_ROLES[category] ?? "Knowledgeable assistant";

    // Extract the goal from intent detection, or use the first sentence.
    const goal = ctx.intent.goal ?? text.trim().split(/[.!?]/, 1)[0]?.trim() ?? "complete the requested task";

    const explanations: Explanation[] = [
      {
        pass: "goal-role-extraction",
        change: `added \`## Objective\` section with detected goal`,
        reason:
          "an explicit objective anchors the executor's understanding of what success looks like",
        before: goal,
        after: "## Objective",
      },
      {
        pass: "goal-role-extraction",
        change: `inferred expert role: "${role}"`,
        reason:
          "assigning a role frames the executor's perspective and improves output quality",
        before: `intent: ${category}`,
        after: role,
      },
    ];

    return {
      prompt: `${text.trim()}\n\n## Objective\n\n${goal}\n\n## Role\n\n${role}\n`,
      explanations,
      metadata: {
        "goal-role-extraction:category": category,
        "goal-role-extraction:role": role,
      },
    };
  },
};