/**
 * context enrichment (phase 30, transformation)
 *
 * Surfaces and structures context already present in the prompt. Unlike
 * missing-context detection (which flags what's ABSENT), this pass finds
 * context clues that ARE present but buried in prose, and reshapes them
 * into a structured `## Context` section.
 *
 * This pass works in tandem with the `structure` pass (phase 50): structure
 * provides the canonical layout, while context enrichment provides the
 * content for the context section. Detection-only runs get the diagnostics;
 * transformation runs get the enriched prompt.
 *
 * Mutation doctrine:
 * - Context sentences are extracted from the body and relocated into a
 *   `## Context` section (verbatim spans — never reworded).
 * - Assumptions about implicit context are attached as inline annotations
 *   (marked with "[assumption: ...]"), never silently merged.
 * - The `# Task` heading is preserved/added by the structure pass; this
 *   pass only enriches the context section.
 *
 * No-op inputs: prompts with no context clues to extract.
 * Transforms: adds/updates `## Context` section with structured context.
 */
import type { Explanation, Pass } from "../core/types.js";

/** Cues that identify context-bearing sentences. */
const CONTEXT_CUE =
  /\b(i'?m using|we'?re using|we use|i use|using [a-z0-9]|btw|by the way|for context|stack\s*:|running on|environment|platform|version|audience|scope|constraint|target|for |aimed at|written for)\b/i;

/** Cues for assumptions about implicit context. */
interface AssumptionRule {
  readonly cue: RegExp;
  readonly label: string;
  readonly template: string;
}

const ASSUMPTION_RULES: readonly AssumptionRule[] = [
  {
    cue: /\b(react|angular|vue|svelte)\b/i,
    label: "frontend framework",
    template: "Frontend framework: [assumption: {match}]",
  },
  {
    cue: /\b(node|python|ruby|go|rust|java|php)\b/i,
    label: "runtime",
    template: "Runtime: [assumption: {match}]",
  },
  {
    cue: /\b(postgres(?:ql)?|mysql|sqlite|mongo|redis|elastic)\b/i,
    label: "database",
    template: "Database: [assumption: {match}]",
  },
  {
    cue: /\b(docker|kubernetes|k8s|aws|gcp|azure|cloud)\b/i,
    label: "infrastructure",
    template: "Infrastructure: [assumption: {match}]",
  },
  {
    cue: /\b(windows|macos|linux|ios|android)\b/i,
    label: "platform",
    template: "Platform: [assumption: {match}]",
  },
];

/** Splits text into sentence spans. */
function segmentSentences(text: string): string[] {
  const segmenter = new Intl.Segmenter("en", { granularity: "sentence" });
  return [...segmenter.segment(text)].map((part) => part.segment);
}

/** Detects context cues in a sentence. */
function hasContextCue(sentence: string): boolean {
  return CONTEXT_CUE.test(sentence);
}

/** Detects headings in text. */
const HEADING_PRESENT = /^\s{0,3}#{1,6}\s/m;

export const contextEnrichment: Pass = {
  id: "context-enrichment",
  description:
    "Surfaces and structures context already present in the prompt, extracting it into a structured ## Context section with labeled assumptions.",
  kind: "transformation",
  phase: 30,
  requiresLLM: false,
  requiresNetwork: false,

  run(ctx) {
    const text = ctx.current;

    // No-op: empty prompt.
    if (text.trim().length === 0) return {};

    // No-op: already has context section or is already structured.
    if (/\n## Context\n/.test(text)) return {};
    if (HEADING_PRESENT.test(text)) return {};

    const sentences = segmentSentences(text);
    const contextSentences = sentences.filter(hasContextCue);
    const bodySentences = sentences.filter((s) => !hasContextCue(s));

    // No-op: no context to extract.
    if (contextSentences.length === 0) return {};

    const explanations: Explanation[] = [];
    const assumptions: string[] = [];

    // Check for assumptions based on keywords in the full text.
    for (const rule of ASSUMPTION_RULES) {
      const match = rule.cue.exec(text);
      if (match) {
        assumptions.push(
          rule.template.replace("{match}", match[0].toLowerCase()),
        );
      }
    }

    // Build the context block.
    const contextBlock = contextSentences.join("").trim();
    const body = bodySentences.join("").trim();

    // Check if we're already in a structured layout.
    const hasHeading = HEADING_PRESENT.test(text);

    // Build the enriched prompt.
    let enriched: string;
    const firstContext = contextSentences[0]?.trim().slice(0, 60);

    if (hasHeading) {
      // Text already has headings — insert/update ## Context section.
      // We append the context block after the existing content.
      enriched = `${text.trim()}\n\n## Context\n\n${contextBlock}`;
      if (assumptions.length > 0) {
        enriched += `\n\n${assumptions.join("\n")}`;
      }
      enriched += "\n";
    } else {
      // No headings — build from scratch.
      enriched = `# Task\n\n${body}\n\n## Context\n\n${contextBlock}`;
      if (assumptions.length > 0) {
        enriched += `\n\n${assumptions.join("\n")}`;
      }
      enriched += "\n";
    }

    const baseExplanation: Explanation = {
      pass: "context-enrichment",
      change: `extracted ${contextSentences.length} context sentence${contextSentences.length === 1 ? "" : "s"} into a \`## Context\` section`,
      reason:
        "context buried in prose is routinely missed by executors; extracting it improves reliability",
      after: "## Context",
    };
    explanations.push(
      firstContext !== undefined
        ? { ...baseExplanation, before: firstContext }
        : baseExplanation,
    );

    if (assumptions.length > 0) {
      const firstAssumption = assumptions[0] as string;
      explanations.push({
        pass: "context-enrichment",
        change: `added ${assumptions.length} labeled assumption${assumptions.length === 1 ? "" : "s"} about inferred context`,
        reason:
          "assumptions are marked so the user can verify them — never silently merged",
        ...(firstAssumption !== undefined ? { before: firstAssumption } : {}),
        after: "[assumption: ...]",
      });
    }

    return {
      prompt: enriched,
      explanations,
      metadata: {
        "context-enrichment:context-sentences": contextSentences.length,
        "context-enrichment:assumptions": assumptions.length,
      },
    };
  },
};