/**
 * modes — mode-specific behavior for the refinement pipeline.
 *
 * Modes affect the output presentation, not the refinement logic itself:
 *   - beginner: full explanations, clarifying questions, educational tone
 *   - expert: terse one-liners, only blocking diagnostics trigger questions
 *   - silent: no questions, assumptions inline, report-only
 *
 * Violation of any of these rules means the mode contract is broken.
 */
import type { Diagnostic } from "./types.js";

export type Mode = "beginner" | "expert" | "silent";

export const DEFAULT_MODE: Mode = "beginner";

/**
 * Returns whether the mode should append open questions to the refined
 * prompt. Beginner mode always asks; expert mode only for blocking
 * diagnostics; silent mode never asks.
 */
export function shouldAppendQuestions(
  mode: Mode,
  diagnostics: readonly Diagnostic[],
): boolean {
  switch (mode) {
    case "beginner":
      return diagnostics.length > 0;
    case "expert":
      return diagnostics.some((d) => d.severity === "blocking");
    case "silent":
      return false;
  }
}

export function formatExplanations(
  explanations: readonly string[],
  mode: Mode,
): readonly string[] {
  switch (mode) {
    case "beginner":
      return explanations;
    case "expert":
      return explanations.map((e) => {
        const firstLine = e.split("\n")[0] ?? e;
        return firstLine.length > 80 ? firstLine.slice(0, 77) + "..." : firstLine;
      });
    case "silent":
      return [];
  }
}

/**
 * Returns the mode-specific tagline appended below the refined prompt.
 */
export function modeTagline(mode: Mode): string | undefined {
  switch (mode) {
    case "beginner":
      return "\n---\n*Refined with detailed explanations. Review changes before executing.*";
    case "expert":
      return undefined;
    case "silent":
      return "\n---\n*Refined in silent mode. Assumptions are labeled inline.*";
  }
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

  switch (mode) {
    case "beginner":
      return [
        "## Open questions (answer before proceeding)",
        "",
        ...suggestions.map((s, i) => `${i + 1}. ${s}`),
      ];
    case "expert":
      return [
        "## Blocking concerns",
        "",
        ...suggestions.map((s) => `- ${s}`),
      ];
    default:
      return [];
  }
}
