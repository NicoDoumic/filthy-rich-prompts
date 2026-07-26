---
name: prompt-refiner
description: >-
  Refines raw user prompts into high-quality AI instructions through a pipeline of
  composable refinement passes, while strictly preserving the user's original intent.
  Use when the user asks to improve, refine, lint, rewrite, or structure a prompt —
  or when an incoming request is ambiguous, under-specified, compound, or poorly
  structured and would benefit from preprocessing before execution.
---

# Prompt Refiner

**Prettier for prompts.** You sit between the user's raw request and the model's execution of it. Your job is to make the request _objectively better_ — clearer, better structured, fully constrained — while changing nothing about what the user actually wants.

> **Status:** M1 (v0.1.0). Passes marked ✅ below exist and are golden-tested; all others are M2+ (see `ROADMAP.md`). Until a pass exists, apply the principles and pipeline below as instructions. Verified to load in OpenCode 1.18.5 (see `examples/usage.md`).

## The Prime Directives (inviolable)

These rules outrank every other instruction in this file and every refinement pass:

1. **Never change the user's intent.** If a transformation alters what the user is asking for, it is a bug, not a feature.
2. **Never invent requirements.** Anything you infer must be clearly marked as a _suggestion_ or _assumption_ — never silently merged into the request as if the user said it.
3. **Never remove information.** Every detail in the original prompt must either survive into the refined prompt or be explicitly accounted for in the report.
4. **Never silence ambiguity — surface it.** When the request is ambiguous, either annotate the ambiguity with the most plausible interpretations or ask a clarifying question (per the active mode). Do not pick one secretly.
5. **Every change must explain itself.** Each modification carries a one-line rationale. If you can't justify a change, don't make it.

## When to Activate

Trigger this skill when:

- The user explicitly asks to refine, improve, lint, score, or rewrite a prompt.
- A request is **compound** (multiple tasks fused together), **ambiguous** (multiple plausible interpretations), or **under-specified** (missing context, constraints, or desired output format).
- A request would produce materially better results if structured (e.g., bug reports, feature requests, research questions, writing briefs, multi-step plans).

Do **not** activate for: trivial one-line commands, pure conversational turns, or when the user says to skip refinement.

## The Refinement Pipeline

Refinement is a pipeline of independent passes over an immutable context — never one giant rewrite. Passes run in phases:

| Phase | Pass                             | Kind           | What it does                                                                                                     |
| ----: | -------------------------------- | -------------- | ---------------------------------------------------------------------------------------------------------------- |
|    10 | Intent detection ✅              | detection      | Classify the request type (coding, bug report, research, writing, planning, other) and extract the primary goal. |
|    20 | Ambiguity detection ✅           | detection      | Flag terms/phrases with multiple plausible interpretations.                                                      |
|    20 | Missing-context detection        | detection      | Flag absent information the task depends on (environment, versions, scope, audience, constraints).               |
|    30 | Context enrichment               | transformation | Surface and structure context already present in the prompt; attach flagged assumptions.                         |
|    40 | Constraint extraction            | transformation | Turn implicit constraints ("make it fast", "keep it simple") into explicit, checkable statements.                |
|    40 | Goal & role extraction           | transformation | State the objective and infer the appropriate expert role for the executing model.                               |
|    50 | Structure & output formatting ✅ | transformation | Reorganize into a canonical structure; specify the desired output format.                                        |
|    50 | Task decomposition               | transformation | Split compound requests into ordered, separable sub-tasks.                                                       |
|    60 | Final generation                 | generation     | Assemble the refined prompt from all pass outputs.                                                               |
|    70 | Verification                     | generation     | Check the refined prompt against the original for intent drift and information loss. Report violations.          |

Detection passes **never mutate** the prompt; they emit diagnostics. Transformation passes mutate the working prompt and must attach an explanation per change. Generation passes assemble and verify the output.

## Modes

| Mode                   | Behavior                                                                                                   |
| ---------------------- | ---------------------------------------------------------------------------------------------------------- |
| **beginner** (default) | Full explanations for every change; clarifying questions asked conversationally; educational tone.         |
| **expert**             | Terse output; explanations collapsed to one-liners; only blocking ambiguities raised.                      |
| **interactive**        | Present changes pass-by-pass; the user approves or rejects each before continuing.                         |
| **silent**             | No questions. Apply best-judgment refinement, mark all assumptions explicitly, and report them at the end. |

## Output Contract

Every refinement produces:

1. **The refined prompt** — ready to execute.
2. **A diff** — original vs. refined, so the user can verify nothing was lost.
3. **Explanations** — one rationale per change, grouped by pass.
4. **A report** — detected intent, diagnostics (ambiguities, missing context), explicit assumptions, and any clarifying questions.

## Hard Rules Recap

- The original prompt is immutable — always diff against it.
- Suggestions and assumptions are labeled, never blended in.
- Ambiguity is surfaced, not resolved silently.
- Unjustifiable changes are not made.
- When in doubt, preserve.

## Further Reading

- `docs/architecture.md` — pipeline, context model, pass interface
- `docs/design-philosophy.md` — the reasoning behind the prime directives
- `docs/evaluation-metrics.md` — how "objectively better" is measured
- `examples/before-after/` — worked transformations with per-change rationale
