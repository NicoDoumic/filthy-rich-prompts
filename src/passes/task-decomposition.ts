/**
 * task decomposition (phase 50, transformation)
 *
 * Splits compound requests into ordered, separable sub-tasks. This pass
 * works in tandem with ambiguity-detection's COMPOUND_REQUEST diagnostic
 * — it takes flagged compound requests and decomposes them.
 *
 * Mutation doctrine:
 * - Detects compound request cues (also, and then, as well as, on top of that).
 * - Splits the prompt into sub-tasks, each prefixed with `### Sub-task N:`.
 * - The original text is preserved; sub-tasks are annotated.
 *
 * No-op inputs: prompts with no compound request cues.
 * Transforms: adds `## Sub-tasks` section with decomposed tasks.
 */
import type { Explanation, Pass } from "../core/types.js";
import { segmentSentences } from "../core/sentences.js";
import { HEADING_PRESENT } from "../core/headings.js";

/** Cues that indicate compound requests. */
const COMPOUND_CUES = /\b(also|and then|as well as|on top of that|additionally|furthermore|moreover|meanwhile|at the same time)\b/gi;

export const taskDecomposition: Pass = {
  id: "task-decomposition",
  description:
    "Splits compound requests into ordered, separable sub-tasks with explicit numbering.",
  kind: "transformation",
  phase: 50,
  requiresLLM: false,
  requiresNetwork: false,

  run(ctx) {
    const text = ctx.current;

    // No-op: empty prompt.
    if (text.trim().length === 0) return {};

    // No-op: already has sub-tasks section or is already structured.
    if (/\n## Sub-tasks?\n/.test(text)) return {};
    if (HEADING_PRESENT.test(text)) return {};

    // Check for compound request cues.
    const cues = text.match(COMPOUND_CUES);
    if (!cues || cues.length === 0) return {};

    // Split into sentences and identify sub-tasks.
    const sentences = segmentSentences(text);
    const subTasks: string[] = [];
    let currentTask = "";

    for (const sentence of sentences) {
      const trimmed = sentence.trim();
      if (!trimmed) continue;

      // Check if this sentence starts a new sub-task.
      const hasCue = COMPOUND_CUES.test(trimmed);
      if (hasCue && currentTask) {
        subTasks.push(currentTask.trim());
        currentTask = trimmed;
      } else {
        currentTask += " " + trimmed;
      }
    }
    if (currentTask.trim()) {
      subTasks.push(currentTask.trim());
    }

    // No-op: single task (no decomposition needed).
    if (subTasks.length <= 1) return {};

    const firstTask = subTasks[0] as string;
    const explanations: Explanation[] = [
      {
        pass: "task-decomposition",
        change: `split the request into ${subTasks.length} sub-tasks`,
        reason:
          "compound requests are routinely under-executed; separating them improves completion",
        ...(firstTask !== undefined ? { before: firstTask } : {}),
        after: `### Sub-task 1`,
      },
    ];

    const subTaskList = subTasks
      .map((task, i) => `### Sub-task ${i + 1}\n\n${task}`)
      .join("\n\n");

    const hasHeading = HEADING_PRESENT.test(text);

    return {
      prompt: hasHeading
        ? `${text.trim()}\n\n## Sub-tasks\n\n${subTaskList}\n`
        : `# Task\n\n${text.trim()}\n\n## Sub-tasks\n\n${subTaskList}\n`,
      explanations,
      metadata: {
        "task-decomposition:count": subTasks.length,
      },
    };
  },
};