/**
 * missing-context detection (phase 20, detection)
 *
 * Flags absent information the task depends on: environment, versions, scope,
 * audience, constraints, reproduction steps, and expected output format.
 * Never mutates. Diagnostics are advisory by design — false positives cost
 * an ignorable `info` line, false negatives cost an unseen gap.
 *
 * Detection strategy: cue-phrase patterns that suggest context is present
 * are checked; if absent, a diagnostic is emitted. This is the inverse of
 * ambiguity-detection (which flags what IS there but is vague) — this pass
 * flags what IS NOT there but should be.
 *
 * Decisions (per the Phase 1 plan):
 * - Q2: heuristic baseline. Patterns as data (below) so quality tuning and
 *   future locale packs replace a table, not logic.
 * - Q8: English-only patterns for M1; no locale plumbing (i18n is M2+).
 * - Severity: `info` for nice-to-have context, `warning` for blocking gaps.
 *
 * No-op inputs: prompts that already contain all expected context categories.
 * Transforms: nothing — detection pass.
 */
import type { Diagnostic, Pass } from "../core/types.js";

interface ContextCategory {
  readonly code: string;
  readonly name: string;
  readonly severity: "info" | "warning";
  readonly message: string;
  readonly suggestion: string;
  /** Cue patterns that, if present, suggest this context is covered. */
  readonly presentCues: readonly RegExp[];
}

const CATEGORIES: readonly ContextCategory[] = [
  {
    code: "MISSING_ENVIRONMENT",
    name: "environment",
    severity: "warning",
    message: "no environment or platform information detected",
    suggestion:
      "specify the environment (OS, browser, runtime, device) the task applies to",
    presentCues: [
      /\b(windows|macos|linux|ubuntu|debian|centos|ios|android|chrome|firefox|safari|edge|node|python|react|angular|vue|docker|kubernetes|aws|gcp|azure)\b/i,
      /\b(environment|platform|os|browser|runtime|device|stack|version)\b/i,
      /\b(i'?m using|we'?re using|we use|i use|using)\b/i,
    ],
  },
  {
    code: "MISSING_VERSION",
    name: "version",
    severity: "info",
    message: "no version numbers detected — behavior may vary across versions",
    suggestion:
      "include relevant version numbers (language, framework, library, OS)",
    presentCues: [
      /\b(v?\d+\.\d+(\.\d+)?)\b/,
      /\b(version|v\d+|latest|stable|LTS)\b/i,
    ],
  },
  {
    code: "MISSING_SCOPE",
    name: "scope",
    severity: "warning",
    message:
      "no scope or boundaries defined — the task may expand beyond what you intended",
    suggestion:
      "define what is in scope and (optionally) what is explicitly out of scope",
    presentCues: [
      /\b(scope|boundar|limit|only|just|specifically|exactly)\b/i,
      /\b(not |don'?t |do not |shouldn'?t |must not)\b/i,
    ],
  },
  {
    code: "MISSING_AUDIENCE",
    name: "audience",
    severity: "info",
    message:
      "no target audience specified — tone and depth default to general",
    suggestion:
      "specify who this is for (beginners, experts, executives, technical team)",
    presentCues: [
      /\b(audience|reader|beginner|expert|developer|manager|stakeholder|user|customer|team)\b/i,
      /\b(for |aimed at |targeted at |written for)\b/i,
    ],
  },
  {
    code: "MISSING_CONSTRAINTS",
    name: "constraints",
    severity: "info",
    message:
      "no explicit constraints or requirements detected",
    suggestion:
      "list any constraints (time, budget, performance, compatibility, security)",
    presentCues: [
      /\b(constraint|requirement|must|must not|should|should not|need|needs to|has to|have to)\b/i,
      /\b(under |within |budget|deadline|limit|max|min|performance|secure|compatible)\b/i,
    ],
  },
  {
    code: "MISSING_REPRODUCTION",
    name: "reproduction",
    severity: "warning",
    message:
      "no reproduction steps — the executor cannot verify the issue",
    suggestion:
      "provide step-by-step reproduction instructions for any bug or unexpected behavior",
    presentCues: [
      /\b(steps? to reproduce|reproduce|reproduction|repro|steps?:|how to|to see it)\b/i,
      /\b(when i |when you |if i |if you |after i |after you )\b/i,
    ],
  },
  {
    code: "MISSING_OUTPUT_FORMAT",
    name: "output format",
    severity: "info",
    message:
      "no desired output format specified — the response structure is left to the model",
    suggestion:
      "specify the desired output format (list, table, code, prose, JSON, markdown)",
    presentCues: [
      /\b(output|format|return|result|response|answer|deliverable|artifact)\b/i,
      /\b(as |in |as a |as an |formatted as|structured as)\b/i,
    ],
  },
];

export const missingContextDetection: Pass = {
  id: "missing-context-detection",
  description:
    "Flags absent information the task depends on: environment, versions, scope, audience, constraints, reproduction steps, and output format.",
  kind: "detection",
  phase: 20,
  requiresLLM: false,
  requiresNetwork: false,

  run(ctx) {
    const diagnostics: Diagnostic[] = [];
    const findings: Record<string, boolean> = {};

    for (const category of CATEGORIES) {
      const isPresent = category.presentCues.some((cue) =>
        cue.test(ctx.current),
      );
      findings[category.code] = isPresent;
      if (isPresent) continue;

      diagnostics.push({
        pass: "missing-context-detection",
        severity: category.severity,
        code: category.code,
        message: category.message,
        suggestions: [category.suggestion],
      });
    }

    return {
      diagnostics,
      metadata: {
        "missing-context-detection:findings": findings,
      },
    };
  },
};