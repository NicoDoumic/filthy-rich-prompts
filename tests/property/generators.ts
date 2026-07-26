/**
 * Prompt-shaped generators for property tests (docs/testing-strategy.md §4).
 *
 * Generators produce *plausible* prompts — templates with slots for verbs,
 * stacks, hedges, typos, and unicode — not random bytes. Exploring plausible
 * inputs finds bugs users hit; random ASCII soup does not.
 */
import fc from "fast-check";

const VERBS = [
  "fix",
  "add",
  "implement",
  "write",
  "update",
  "improve",
  "investigate",
  "compare",
  "draft",
  "optimize",
] as const;
const SUBJECTS = [
  "the login bug",
  "a react component",
  "the api endpoint",
  "a blog post about tabs",
  "the export crash",
  "the dashboard load time",
  "a migration plan",
  "the newsletter draft",
] as const;
const HEDGES = ["", "maybe ", "kinda ", "probably ", "i think "] as const;
const TAILS = [
  "",
  " asap",
  ", it worked yesterday",
  ". using react + node btw",
  " and also update the docs",
  " 🐛",
  ", it is kinda slow",
] as const;
const TYPOS = ["teh", "recieve", "seperate", "occured"] as const;

const sentenceArb: fc.Arbitrary<string> = fc
  .tuple(
    fc.constantFrom(...VERBS),
    fc.constantFrom(...SUBJECTS),
    fc.constantFrom(...HEDGES),
    fc.constantFrom(...TAILS),
  )
  .map(([verb, subject, hedge, tail]) => `${hedge}${verb} ${subject}${tail}`);

/** A plausible raw prompt: 1–3 sentences, occasionally with a typo or greeting. */
export const promptArb: fc.Arbitrary<string> = fc
  .tuple(
    fc.array(sentenceArb, { minLength: 1, maxLength: 3 }),
    fc.option(fc.constantFrom(...TYPOS), { nil: undefined }),
    fc.constantFrom("", "hey ", "please ", "urgent: "),
  )
  .map(([sentences, typo, prefix]) => {
    const body = sentences.join(". ");
    return `${prefix}${typo ? `${typo} ` : ""}${body}`;
  });

/** Inputs that are already structured (headings present) — for no-op checks. */
export const structuredPromptArb: fc.Arbitrary<string> = sentenceArb.map(
  (sentence) => `# Task\n\n${sentence}\n`,
);
