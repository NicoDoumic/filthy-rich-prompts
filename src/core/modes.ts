/**
 * modes — mode-specific behavior for the refinement pipeline.
 *
 * Modes affect the output presentation, not the refinement logic itself:
 *   - beginner: full explanations, clarifying questions, educational tone
 *   - expert: terse one-liners, only blocking diagnostics trigger questions
 *   - interactive: per-pass approval, discovery questions, step-by-step
 *   - silent: no questions, assumptions inline, report-only
 *
 * Violation of any of these rules means the mode contract is broken.
 */
import type { Diagnostic, Mode } from "./types.js";

/** All valid refinement modes. Used by config validation and runtime checks. */
export const VALID_MODES: readonly Mode[] = ["beginner", "expert", "interactive", "silent"];

/** Fallback mode when no explicit mode is configured. */
export const DEFAULT_MODE: Mode = "beginner";

/** Canonical heading for the Open Questions section appended after refinement. */
export const OPEN_QUESTIONS_HEADING = "## Open questions (answer before proceeding)";

interface ModeStrategy {
  /** Whether this mode should append questions given diagnostics. */
  shouldAppendQuestions(diagnostics: readonly Diagnostic[]): boolean;
  /** The tagline appended below the refined prompt, or undefined for none. */
  tagline(): string | undefined;
  /** Formats clarifying questions for this mode. */
  clarifyingQuestions(suggestions: readonly string[]): string[];
}

const beginnerStrategy: ModeStrategy = {
  shouldAppendQuestions: (d) => d.length > 0,
  tagline: () => "\n---\n*Refined with detailed explanations. Review changes before executing.*",
  clarifyingQuestions: (suggestions) => [
    OPEN_QUESTIONS_HEADING,
    "",
    ...suggestions.map((s, i) => `${i + 1}. ${s}`),
  ],
};

const expertStrategy: ModeStrategy = {
  shouldAppendQuestions: (d) => d.some((d) => d.severity === "blocking"),
  tagline: () => undefined,
  clarifyingQuestions: (suggestions) => [
    "## Blocking concerns",
    "",
    ...suggestions.map((s) => `- ${s}`),
  ],
};

const interactiveStrategy: ModeStrategy = {
  shouldAppendQuestions: beginnerStrategy.shouldAppendQuestions,
  tagline: () =>
    "\n---\n*Refined interactively — each pass was reviewed before applying.*",
  clarifyingQuestions: beginnerStrategy.clarifyingQuestions,
};

const silentStrategy: ModeStrategy = {
  shouldAppendQuestions: () => false,
  tagline: () => "\n---\n*Refined in silent mode. Assumptions are labeled inline.*",
  clarifyingQuestions: () => [],
};

const MODE_STRATEGIES: Record<Mode, ModeStrategy> = {
  beginner: beginnerStrategy,
  expert: expertStrategy,
  interactive: interactiveStrategy,
  silent: silentStrategy,
};

/**
 * Returns whether the mode should append open questions to the refined
 * prompt. Beginner/interactive always ask; expert only for blocking
 * diagnostics; silent never asks.
 */
function shouldAppendQuestions(
  mode: Mode,
  diagnostics: readonly Diagnostic[],
): boolean {
  return MODE_STRATEGIES[mode].shouldAppendQuestions(diagnostics);
}

/**
 * Returns the mode-specific tagline appended below the refined prompt.
 */
export function modeTagline(mode: Mode): string | undefined {
  return MODE_STRATEGIES[mode].tagline();
}

/**
 * Returns clarifying questions for a mode, given diagnostics.
 */
export function clarifyingQuestions(
  mode: Mode,
  diagnostics: readonly Diagnostic[],
): string[] {
  if (!shouldAppendQuestions(mode, diagnostics)) return [];

  const suggestions = diagnostics.flatMap((d) => d.suggestions ?? []);
  if (suggestions.length === 0) return [];

  return MODE_STRATEGIES[mode].clarifyingQuestions(suggestions);
}
