/**
 * intent-detection (phase 10, detection)
 *
 * Heuristic cue-phrase classifier: coding / bug-report / research / writing /
 * planning. Never mutates. Forces no decision downstream in M1: no pass
 * branches on the category, so a misclassification is cosmetically wrong in
 * the report, never behaviorally wrong in the output.
 *
 * Open question Q2 (heuristic vs LLM): this is the heuristic baseline.
 * Known limits: keyword overlap ("fix" appears in coding and bug-report
 * requests) is resolved by score margin, and ties collapse to `unknown`
 * rather than a guess. Quality is provisional until M2 fixtures / M4 judged
 * track; documented here per the pass documentation rule (coding-standards §5).
 *
 * No-op inputs: any input (it always emits at least an observation diagnostic).
 * Transforms: nothing — detection pass.
 */
import type {
  Diagnostic,
  IntentCategory,
  IntentModel,
  Pass,
} from "../core/types.js";

type ClassifiableCategory = Exclude<IntentCategory, "other" | "unknown">;

/** Cue phrases as data. Strong cues are multi-word or unambiguous (2 pts); weak are single/common words (1 pt). */
const CUES: Readonly<
  Record<
    ClassifiableCategory,
    { strong: readonly string[]; weak: readonly string[] }
  >
> = {
  coding: {
    strong: [
      "implement",
      "refactor",
      "add a feature",
      "make it faster",
      "typescript",
      "javascript",
      "python",
      "react",
      "node.js",
      "sql",
      "endpoint",
      "component",
    ],
    weak: [
      "code",
      "api",
      "function",
      "app",
      "dashboard",
      "deploy",
      "optimize",
      "slow",
      "stack",
    ],
  },
  "bug-report": {
    strong: [
      "crash",
      "crashed",
      "crashes",
      "stack trace",
      "expected behavior",
      "does not work",
      "doesn't work",
      "not working",
      "worked yesterday",
      "regression",
      "logs me out",
    ],
    weak: ["error", "broken", "bug", "fails", "failing", "fix", "asap"],
  },
  research: {
    strong: [
      "should we",
      "pros and cons",
      "look into",
      "trade-offs",
      "tradeoffs",
    ],
    weak: [
      "evaluate",
      "compare",
      "comparison",
      "versus",
      "whether",
      "research",
      "alternatives",
      "vs",
    ],
  },
  writing: {
    strong: ["blog post", "write a", "write an", "article about", "essay"],
    weak: ["draft", "write", "story", "newsletter", "post"],
  },
  planning: {
    strong: ["step by step", "break down", "multi-step", "plan out"],
    weak: ["plan", "steps", "phases", "milestone", "roadmap", "outline"],
  },
};

/** Words that signal an imperative sentence (candidate goal statements). */
const IMPERATIVE_STARTERS: readonly string[] = [
  "fix",
  "add",
  "implement",
  "write",
  "create",
  "make",
  "build",
  "update",
  "refactor",
  "compare",
  "evaluate",
  "plan",
  "look",
  "investigate",
  "diagnose",
  "improve",
  "optimize",
  "research",
  "draft",
  "break",
];

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function countCue(text: string, cue: string): number {
  const match = new RegExp(`\\b${escapeRegExp(cue)}\\b`, "i").exec(text);
  return match === null ? 0 : 1;
}

function scoreCategories(text: string): Record<ClassifiableCategory, number> {
  const scores = {} as Record<ClassifiableCategory, number>;
  for (const [category, cues] of Object.entries(CUES) as [
    ClassifiableCategory,
    (typeof CUES)[ClassifiableCategory],
  ][]) {
    let score = 0;
    for (const cue of cues.strong) score += 2 * countCue(text, cue);
    for (const cue of cues.weak) score += 1 * countCue(text, cue);
    scores[category] = score;
  }
  return scores;
}

/** Extracts the first imperative sentence, verbatim (no paraphrase — extraction, not summarization). */
function extractGoal(text: string): string | undefined {
  const segmenter = new Intl.Segmenter("en", { granularity: "sentence" });
  const sentences = [...segmenter.segment(text)].map((s) => s.segment);
  for (const sentence of sentences) {
    const firstWord =
      sentence
        .trim()
        .toLowerCase()
        .replace(/^["'(\[]/, "")
        .split(/\s/, 1)[0] ?? "";
    if (IMPERATIVE_STARTERS.includes(firstWord)) {
      return sentence.trim();
    }
  }
  return sentences[0]?.trim();
}

export const intentDetection: Pass = {
  id: "intent-detection",
  description:
    "Classifies the request type (coding, bug-report, research, writing, planning) and extracts the primary goal, verbatim.",
  kind: "detection",
  phase: 10,
  requiresLLM: false,
  requiresNetwork: false,

  run(ctx) {
    const scores = scoreCategories(ctx.current);
    const ranked = (
      Object.entries(scores) as [ClassifiableCategory, number][]
    ).sort((a, b) => b[1] - a[1]);
    /* v8 ignore next 2 -- ranked always has 5 entries; TS noUncheckedIndexedAccess guards */
    const [topCategory, topScore] = ranked[0] ?? ["other", 0];
    const [, secondScore] = ranked[1] ?? ["other", 0];

    const diagnostics: Diagnostic[] = [];
    let intent: IntentModel;

    if (topScore === 0) {
      intent = { category: "unknown", confidence: 0 };
      diagnostics.push({
        pass: "intent-detection",
        severity: "info",
        code: "INTENT_UNKNOWN",
        message:
          "no category cues detected — treating the request as uncategorized",
      });
    } else if (topScore === secondScore) {
      const tied = ranked
        .filter(([, score]) => score === topScore)
        .map(([category]) => category);
      intent = { category: "unknown", confidence: 0.5 };
      diagnostics.push({
        pass: "intent-detection",
        severity: "info",
        code: "AMBIGUOUS_INTENT",
        message: `category tie between ${tied.join(" and ")} — refusing to guess`,
        suggestions: tied,
      });
    } else {
      const confidence = Math.min(
        0.95,
        topScore / (topScore + secondScore + 1),
      );
      const goal = extractGoal(ctx.current);
      intent = {
        category: topCategory,
        confidence,
        ...(goal !== undefined ? { goal } : {}),
      };
      diagnostics.push({
        pass: "intent-detection",
        severity: "info",
        code: "INTENT_DETECTED",
        message: `request classified as "${topCategory}" (confidence ${confidence.toFixed(2)})`,
      });
    }

    return {
      intent,
      diagnostics,
      metadata: { "intent-detection:scores": scores },
    };
  },
};
