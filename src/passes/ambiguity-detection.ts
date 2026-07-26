/**
 * ambiguity-detection (phase 20, detection)
 *
 * Flags vague quantifiers, qualifiers, deadlines, hedges, unresolved
 * sentence-initial referents, compound requests, and implicit constraints.
 * Never mutates; diagnostics are advisory by design.
 *
 * Decisions (per the Phase 1 plan):
 * - Q2: patterns as *data* (below) so quality tuning and future locale packs
 *   replace a table, not logic. Heuristics may emit `info`/`warning` only —
 *   never `blocking` (false positives would then block users).
 * - Q8: English-only tables for M1; no locale plumbing (i18n is M2+).
 * - Regexes are literal-word bounded — linear-time, ReDoS-safe
 *   (coding-standards §7).
 *
 * Noise is accepted: a false positive costs an ignorable `info` line, a false
 * negative costs an unseen ambiguity. Per-code findings are capped at 3 to
 * keep reports readable; full counts live in metadata.
 *
 * No-op inputs: precise prompts with no pattern matches (returns no diagnostics).
 * Transforms: nothing — detection pass.
 */
import type { Diagnostic, Pass } from "../core/types.js";

interface AmbiguityPattern {
  readonly code: string;
  readonly regex: RegExp;
  readonly severity: "info" | "warning";
  readonly message: string;
  readonly suggestion: string;
}

const MAX_PER_CODE = 3;

const PATTERNS: readonly AmbiguityPattern[] = [
  {
    code: "VAGUE_QUANTIFIER",
    regex: /\b(kinda|sort of|a bit|somewhat|pretty much|fairly)\b/gi,
    severity: "warning",
    message: "vague quantifier — the amount or degree is imprecise",
    suggestion: "replace with an observable or measurable description",
  },
  {
    code: "VAGUE_QUALIFIER",
    regex:
      /\b(faster|slower|better|best|easier|simpler|cleaner|cheaper|smaller|bigger|nicer)\b/gi,
    severity: "info",
    message: "vague qualifier — the quality target is undefined",
    suggestion:
      "specify a measurable target (e.g. a number, a comparison point)",
  },
  {
    code: "VAGUE_DEADLINE",
    regex:
      /\b(asap|as soon as possible|whenever|eventually|at some point|sometime)\b/gi,
    severity: "warning",
    message:
      'vague deadline — "asap" and friends are urgencies, not time constraints',
    suggestion: "record as priority, or give a concrete date/duration",
  },
  {
    code: "HEDGE_LANGUAGE",
    regex: /\b(maybe|perhaps|probably|possibly|i think|i guess|not sure)\b/gi,
    severity: "info",
    message:
      "hedge — signals uncertainty the executor should not silently resolve",
    suggestion: "keep the uncertainty explicit, or clarify it",
  },
  {
    code: "AMBIGUOUS_REFERENT",
    regex: /(^|[.!?]\s+)(it|this|that)\b/gim,
    severity: "info",
    message: "sentence-initial referent — the antecedent may be unclear",
    suggestion: "name the thing explicitly at the start of the sentence",
  },
  {
    code: "COMPOUND_REQUEST",
    regex: /\b(also|and then|as well as|on top of that)\b/gi,
    severity: "info",
    message: "possible compound request — multiple tasks may be fused together",
    suggestion: "consider whether the tasks are separable",
  },
  {
    code: "IMPLICIT_CONSTRAINT",
    regex: /\b(make sure|ensure|don't|do not|never|always|must)\b/gi,
    severity: "info",
    message: "implicit constraint — a requirement stated in passing",
    suggestion: "candidate for an explicit constraints section",
  },
];

export const ambiguityDetection: Pass = {
  id: "ambiguity-detection",
  description:
    "Flags vague quantifiers, hedges, unresolved referents, compound requests, and implicit constraints as advisory diagnostics.",
  kind: "detection",
  phase: 20,
  requiresLLM: false,
  requiresNetwork: false,

  run(ctx) {
    const diagnostics: Diagnostic[] = [];
    const counts: Record<string, number> = {};
    const emitted: Record<string, number> = {};

    for (const pattern of PATTERNS) {
      const regex = new RegExp(pattern.regex.source, pattern.regex.flags);
      let match: RegExpExecArray | null;
      while ((match = regex.exec(ctx.current)) !== null) {
        counts[pattern.code] = (counts[pattern.code] ?? 0) + 1;
        if ((emitted[pattern.code] ?? 0) >= MAX_PER_CODE) continue;
        emitted[pattern.code] = (emitted[pattern.code] ?? 0) + 1;

        // For referents, group 2 is the flagged word; otherwise flag the whole match.
        /* v8 ignore next -- every pattern has at least one capture group */
        const flagged = match[2] ?? match[1] ?? match[0];
        const start = match.index + match[0].indexOf(flagged);
        diagnostics.push({
          pass: "ambiguity-detection",
          severity: pattern.severity,
          code: pattern.code,
          message: `${pattern.message}: "${flagged}"`,
          span: { start, end: start + flagged.length },
          suggestions: [pattern.suggestion],
        });
      }
    }

    return {
      diagnostics,
      metadata: { "ambiguity-detection:counts": counts },
    };
  },
};
