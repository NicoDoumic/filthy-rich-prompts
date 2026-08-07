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

> **Status:** v0.3.0-next.0. All passes marked ✅ below exist and are golden-tested. Verified to load in OpenCode 1.18.5 (see `examples/usage.md`).

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

## Pre-Refinement Discovery

**Before any refinement pass runs**, you SHOULD ask the user targeted clarifying questions (except in `silent` mode, which skips this phase). The raw prompt is always a first draft — never assume it contains everything needed. Use the discovery phase to surface gaps, resolve ambiguities, and align on scope _before_ spending cycles on refinement.

### Discovery Protocol

1. **Read the prompt once** and identify the top unknowns that would materially change the refined output.
2. **Ask at least 5 targeted questions.** Ambiguity costs the executing model a full wasted turn if it guesses wrong — never skimp. More than 5 is fine when the prompt genuinely needs it; 5 is the floor, not the ceiling.
3. **Prefer concise, multiple-choice questions** with sensible defaults. Do not re-ask what is already explicit.
4. **Tailor the questions to the prompt type** (coding task, bug report, writing brief, research question, etc.).
5. **If the user does not answer** within a reasonable back-and-forth, proceed with best-judgment assumptions and mark them explicitly in the report.
6. **The enterprise must see both.** The executing model receives the verbatim original request AND the refined request together (dual delivery) — never the refined alone. The original anchors intent; the refined is the working spec.
7. **Silent mode skips discovery entirely.** Mark all assumptions explicitly in the final report instead.

### Discovery Question Categories

| Category            | Example Questions                                                                                     |
| ------------------- | ----------------------------------------------------------------------------------------------------- |
| Goal & scope        | "Is this a quick script or production code?" / "Should this cover only the happy path or edge cases?" |
| Tech constraints    | "What language/framework?" / "Any version requirements?" / "Should this work on Windows, macOS, too?" |
| Output shape        | "Code only, or code + tests?" / "Prose output: email, report, documentation?"                         |
| Style & tone        | "Terse or verbose?" / "Formal, casual, or neutral?" / "Comments in code: yes/no?"                     |
| Non-functional      | "Any performance targets?" / "Accessibility level?" / "Security constraints?"                         |
| Assumption check    | "Is it safe to assume X?" — validate a key inference before baking it in.                             |

## The Refinement Pipeline

Refinement is a pipeline of independent passes over an immutable context — never one giant rewrite. Passes run in phases:

| Phase | Pass                             | Kind           | What it does                                                                                                     |
| ----: | -------------------------------- | -------------- | ---------------------------------------------------------------------------------------------------------------- |
|     5 | Discovery questions              | interaction    | Ask targeted clarifying questions before refinement; must complete before phase 10.                              |
|    10 | Intent detection ✅              | detection      | Classify the request type (coding, bug report, research, writing, planning, other) and extract the primary goal. |
|    20 | Ambiguity detection ✅           | detection      | Flag terms/phrases with multiple plausible interpretations.                                                      |
|    20 | Missing-context detection ✅     | detection      | Flag absent information the task depends on (environment, versions, scope, audience, constraints).               |
|    30 | Context enrichment ✅            | transformation | Surface and structure context already present in the prompt; attach flagged assumptions.                         |
|    40 | Constraint extraction ✅         | transformation | Turn implicit constraints ("make it fast", "keep it simple") into explicit, checkable statements.                |
|    40 | Goal & role extraction ✅        | transformation | State the objective and infer the appropriate expert role for the executing model.                               |
|    50 | Structure ✅                     | transformation | Reorganize into a canonical structure with sections and headings.                                                |
|    50 | Output format inference ✅       | transformation | Detect and specify the desired output format (list, table, code, prose, etc.).                                   |
|    50 | Task decomposition ✅            | transformation | Split compound requests into ordered, separable sub-tasks.                                                       |
|    60 | Final generation ✅              | generation     | Assemble the refined prompt from all pass outputs into canonical section order.                                  |
|    70 | Verification ✅                  | detection      | Check the refined prompt against the original for intent drift and information loss. Report violations.          |

**Pass kinds:**
- **Interaction** passes prompt the user for input and collect responses; they do not mutate the working prompt directly.
- **Detection** passes **never mutate** the prompt; they emit diagnostics.
- **Transformation** passes mutate the working prompt and must attach an explanation per change.
- **Generation** passes assemble and verify the output.

## Modes

| Mode                   | Behavior                                                                                                   |
| ---------------------- | ---------------------------------------------------------------------------------------------------------- |
| **beginner** (default) | Discovery questions asked with context and rationale; full explanations for every change; educational tone. |
| **expert**             | Discovery questions are terse and targeted; only blocking ambiguities raised; explanations collapsed to one-liners. |
| **interactive**        | Discovery questions first; then present changes pass-by-pass; the user approves or rejects each before continuing. |
| **silent**             | No discovery questions. Apply best-judgment refinement, mark all assumptions explicitly, and report them at the end. |

## Output Contract

Every refinement produces:

1. **The verbatim original** — always delivered alongside the refined prompt so the executing model can cross-check intent (nothing is dropped from the wire).
2. **Discovery questions** (upfront, before refinement) — **at least 5** targeted questions to fill gaps in the raw prompt and remove ambiguity.
3. **The refined prompt** — ready to execute.
4. **A diff** — original vs. refined, so the user can verify nothing was lost.
5. **Explanations** — one rationale per change, grouped by pass.
6. **A report** — detected intent, diagnostics (ambiguities, missing context), explicit assumptions, and the discovery questions asked.

## Hard Rules Recap

- The original prompt is immutable — always diff against it.
- Suggestions and assumptions are labeled, never blended in.
- Ambiguity is surfaced, not resolved silently.
- Unjustifiable changes are not made.
- When in doubt, preserve.

## Further Reading

- `docs/architecture.md` — pipeline, context model, pass interface
- `docs/design-philosophy.md` — the reasoning behind the prime directives
- `docs/dual-delivery.md` — how the original + refined + discovery questions reach the model, and how the question section affects its reasoning
- `docs/evaluation-metrics.md` — how "objectively better" is measured
- `examples/before-after/` — worked transformations with per-change rationale
- `docs/troubleshooting.md` — common installation and configuration issues