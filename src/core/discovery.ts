/**
 * discovery — the pre-refinement discovery question generator.
 *
 * The wire format handed to the executing model must include a guaranteed
 * minimum of clarifying questions (default 5) so ambiguity is resolved BEFORE
 * the model starts working instead of mid-task. Questions come from two
 * sources, merged with no duplicates:
 *   1. Diagnostics — each diagnostic's `suggestions` (or its `message` as a
 *      fallback) become targeted, prompt-specific questions.
 *   2. A curated fallback catalog of general discovery dimensions (goal,
 *      scope, environment, constraints, output format, audience, acceptance,
 *      edge cases, priority) — used only to fill the gap up to `min`, and
 *      skipped when a specific question already covers that dimension.
 *
 * This module also owns the section headings and the dual-delivery composer
 * used by the OpenCode auto-refine hook, so the executing model sees the
 * original request AND the refined request together (nothing is ever dropped
 * from the wire — prime directive #3).
 */
import type { Diagnostic } from "./types.js";
import { OPEN_QUESTIONS_HEADING } from "./modes.js";

/** Minimum clarifying questions appended to every refined prompt (user-facing contract). */
export const DEFAULT_MIN_QUESTIONS = 5;

/** Label for the verbatim original block — the intent anchor the model must never violate. */
export const ORIGINAL_HEADING =
  "## Original request (verbatim — ground truth for intent)";

/** Label for the refined block the model should actually execute. */
export const REFINED_HEADING = "## Refined request (execute this)";

/** The heading for the discovery block; reuses the canonical open-questions phrasing. */
export const DISCOVERY_HEADING = OPEN_QUESTIONS_HEADING;

interface CatalogQuestion {
  /** Stable id used for dedup and documentation. */
  readonly key: string;
  /** The question text presented to the user. */
  readonly text: string;
  /** Fired against the specific questions to decide whether the dimension is already covered. */
  readonly anchor: RegExp;
}

const CATALOG: readonly CatalogQuestion[] = [
  {
    key: "goal",
    text: "What is the primary outcome of this task in one sentence?",
    anchor: /\b(outcome|goal|primary objective|aim)\b/i,
  },
  {
    key: "scope",
    text: "What is in scope, and what is explicitly out of scope?",
    anchor: /\b(scope|out of scope|boundar|limits?|only|exactly)\b/i,
  },
  {
    key: "environment",
    text: "What environment does this apply to (OS, runtime, browser, device, stack, versions)?",
    anchor: /\b(environ\w*|platform|browser|runtime|device|stack|versions?|os)\b/i,
  },
  {
    key: "constraints",
    text: "Are there constraints to respect (time, budget, performance, compatibility, security, style)?",
    anchor: /\b(constraint|requirement|deadline|budget|performance|compatib|security|limit)\b/i,
  },
  {
    key: "output-format",
    text: "What output format do you want (code, list, table, prose, JSON, markdown, diagram)?",
    anchor: /\b(output|format|deliverable|as\s+a?\s*(list|table|json|markdown|code)|return\s+(type|format))\b/i,
  },
  {
    key: "audience",
    text: "Who is the audience, and what depth/tone is appropriate?",
    anchor: /\b(audience|reader|beginner|expert|manager|stakeholder|team|tone|depth)\b/i,
  },
  {
    key: "acceptance",
    text: "How will we know this is done — what are the acceptance criteria?",
    anchor: /\b(acceptance|definition of done|done when|complete when|verify)\b/i,
  },
  {
    key: "edge-cases",
    text: "Should I handle edge cases explicitly, or only the happy path?",
    anchor: /\b(edge case|happy path|boundary|error handling|invalid)\b/i,
  },
  {
    key: "priority",
    text: "What should be prioritized if scope or time runs short?",
    anchor: /\b(priorit|if scope|if time|most important)\b/i,
  },
];

/** Normalizes a candidate question so near-identical wording does not duplicate. */
function canonical(text: string): string {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

/**
 * Builds the clarifying questions for a set of diagnostics, guaranteeing at
 * least `min` of them (default {@link DEFAULT_MIN_QUESTIONS}). Specific
 * diagnostic suggestions are kept verbatim and first; generic catalog
 * questions fill the remainder only when their dimension is not already
 * covered by a specific question.
 */
export function buildDiscoveryQuestions(
  diagnostics: readonly Diagnostic[],
  min = DEFAULT_MIN_QUESTIONS,
): string[] {
  const safeMin = Number.isFinite(min) && min > 0 ? Math.floor(min) : 1;

  const specific: string[] = [];
  for (const d of diagnostics) {
    const pool =
      d.suggestions && d.suggestions.length > 0 ? d.suggestions : [d.message];
    for (const raw of pool) {
      const text = raw.trim();
      if (text.length === 0) continue;
      if (!specific.some((s) => canonical(s) === canonical(text))) {
        specific.push(text);
      }
    }
  }

  const questions = [...specific];
  const seen = new Set(questions.map(canonical));
  for (const q of CATALOG) {
    if (questions.length >= safeMin) break;
    if (seen.has(canonical(q.text))) continue;
    if (specific.some((s) => q.anchor.test(s))) continue;
    questions.push(q.text);
    seen.add(canonical(q.text));
  }

  return questions;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Removes a previously appended mode-level questions block (beginner/expert
 * post-processing) from a refined prompt so the outgoing wire carries exactly
 * one discovery block. Matches trailing sections headed by the canonical
 * open-questions or blocking-concerns headings, including a trailing tagline.
 */
export function stripAppendedQuestions(text: string): string {
  const marker = new RegExp(
    `\n\n(?:${escapeRegExp(OPEN_QUESTIONS_HEADING)}|## Blocking concerns)[\\s\\S]*$`,
  );
  let stripped = text.replace(marker, "");
  if (stripped.startsWith(OPEN_QUESTIONS_HEADING + "\n")) stripped = "";
  return stripped;
}

/**
 * Renders the discovery section: canonical heading plus a numbered list.
 */
export function renderDiscoveryBlock(questions: readonly string[]): string {
  if (questions.length === 0) return "";
  const lines = questions.map((q, i) => `${i + 1}. ${q}`);
  return [DISCOVERY_HEADING, "", ...lines].join("\n");
}

/**
 * Renders the bridge note instructing the executing model to close the open
 * questions with the user before executing and to treat the original as the
 * binding intent on any conflict. Empty when there is nothing to ask.
 */
export function discoveryBridge(questions: readonly string[]): string {
  if (questions.length === 0) return "";
  return (
    `\n\n---\n\n*Before executing, ask the user to answer the ${questions.length} questions above (use the question tool). ` +
    `The refined request above is the working spec; it restructures the original without changing its intent. ` +
    `If any answer conflicts with the original request, the original wins.*\n`
  );
}

/**
 * Composes the single outgoing message for the executing model: the verbatim
 * original (anchor), the refined request (spec), the discovery block, and the
 * bridge note (see {@link discoveryBridge}).
 */
export function composeDualDelivery(
  raw: string,
  refined: string,
  questions: readonly string[],
): string {
  const cleanRefined = stripAppendedQuestions(refined.trimEnd());
  const parts: string[] = [
    `${ORIGINAL_HEADING}\n\n`,
    raw.trimEnd(),
    `\n\n---\n\n${REFINED_HEADING}\n\n`,
    cleanRefined,
  ];

  if (questions.length > 0) {
    parts.push(`\n\n${renderDiscoveryBlock(questions)}`);
  }
  parts.push(discoveryBridge(questions));

  return parts.join("");
}

/**
 * Composes the refined-only outgoing message (no original block) when
 * `includeOriginal` is disabled: refined prompt plus the discovery block and
 * bridge, so the minimum-question guarantee still holds on that path.
 */
export function composeRefinedWithDiscovery(
  refined: string,
  questions: readonly string[],
): string {
  const cleanRefined = stripAppendedQuestions(refined.trimEnd());
  const parts: string[] = [cleanRefined];
  if (questions.length > 0) {
    parts.push(`\n\n${renderDiscoveryBlock(questions)}`);
  }
  parts.push(discoveryBridge(questions));
  return parts.join("");
}
