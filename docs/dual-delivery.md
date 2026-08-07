# Dual Delivery & Discovery Questions

> Status: **Implemented** (v0.3.0-next.0+) — the OpenCode auto-refine hook now sends every prompt to the model as **original + refined + guaranteed discovery questions** in one wire message.

This document answers a question that comes up constantly: *"before using prompt-refiner, how does this actually work — and what does the discovery-questions section do to the model's reasoning?"*

---

## 1. The Problem

The auto-refine hook sits between the user and the model. What the model ends up with is entirely determined by what the hook writes into the outgoing message. Three possible outcomes:

| Flow                              | The model receives                                                                                                                          | Risk                                                                                    |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| **No refiner (baseline)**         | Only the raw prompt.                                                                                                                         | Model guesses through ambiguities, wastes the first turn re-asking, or drifts off intent. There is no intent anchor and no contract. |
| **Refiner, single delivery (old)** | Only the **refined** prompt. The original was computed and then **discarded** from the wire.                                                  | The executing model cannot cross-check against what the user literally said. Unverifiable provenance in-session; violates the spirit of "never remove information". |
| **Refiner, dual delivery (new)**   | The verbatim **original** + the **refined** prompt + **≥5 discovery questions** to resolve before executing, all in one message.             | Residual: token cost roughly doubles (mitigations in §5). No information is ever lost.   |

## 2. Baseline — how it works WITHOUT the refiner

User types → OpenCode sends the raw message → the model starts *immediately*.

There is nothing stopping the model from asking clarifying questions itself, but:

- It asks **mid-task**, after it has already spent tokens forming a plan on a wrong assumption.
- Its questions are **unstructured and arbitrary** — there is no guarantee it covers scope, environment, output format, acceptance criteria, or edge cases.
- There is **no refinement step at all**: even a well-answered clarification round never produces a clean, structured spec to work from.

Net effect: ambiguity is resolved reactively and cheaply per-question, never proactively and comprehensively.

## 3. How the discovery-questions section affects the model's reasoning

The outgoing wire has an intentional ordering, and each block has a job:

```
1. ## Original request (verbatim)          ← intent anchor / "gateway" prompt
2. ## Refined request (execute this)       ← the working contract
3. ## Open questions (answer N before executing)   ← the closure protocol
4. bridge note: answer the questions with the user, then execute; original wins on conflict
```

| Block            | Effect on the model's reasoning                                                                                                              |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| **Original first**  | Anchors intent. The model now has the literal source of truth in context. Because the refined spec must never contradict it, any later drift is detectable: the two blocks are provably aligned or visibly not. This is the "first prompt original" the hook hands over — it is what prevents the refined prompt from being trusted blindly. |
| **Refined second**  | Gives the model a deterministic, structured, diffable contract instead of parsed prose. It encodes pass outputs (intent label, assumptions labeled, constraints made checkable, canonical section order) so the model does not have to rediscover context while working. |
| **Questions last**  | Forces a **closure gate before execution**: the model is told to answer the N questions with the user (via the question tool) before starting. This converts "I think you mean X" into "you confirmed X". The guarantee (≥5, mix of prompt-specific and general dimensions) means the closure is broad — scope, environment, constraints, output format, audience, acceptance, edge cases, priority — not just the first ambiguity that surfaced. |
| **Original-wins bridge** | Creates a precedence rule for the whole turn: if any answer or the model's plan conflicts with the literal original, the original is authoritative. This is the same precedence as the engine's verification pass (phase 70), applied at the model layer too. |

The practical consequence: **the model's first substantive action is answering/collecting the N questions, not guessing.** That single change removes the most expensive failure mode of prompt-based work — building a plan on an unstated assumption — for the cost of one blocking interaction that OpenCode's question tool makes native.

## 4. Guarantees

- **At least 5 questions** per refined prompt (configurable via `minQuestions`; floor for every prompt unless `silent` mode semantics apply). Questions are built by `src/core/discovery.ts`:
  1. Prompt-specific items first — each diagnostic's `suggestions` (or its `message`) becomes a question, deduplicated.
  2. A curated general catalog (goal, scope, environment, constraints, output format, audience, acceptance, edge cases, priority) fills the remaining slots, skipping any dimension already covered by a specific question.
- **Original is never lost**: `includeOriginal` defaults to `true`. When `false`, the refined-only path still keeps the discovery block.
- **Failure doctrine unchanged** (architecture §8): if anything throws, the original goes through untouched.

## 5. Efficiency & cost

Dual delivery roughly doubles the text of the outgoing message. That is intentional and bounded:

- It is a **send-time transform, not an extra model call** — no second LLM round-trip is added.
- The discovery gate **replaces** the (typically several) corrective back-and-forth turns the model would otherwise spend mid-task asking questions one at a time. One structured gate costs less than three ad-hoc clarifications.
- `includeOriginal: false` exists for token-constrained setups; `minQuestions` lets teams tune the gate (e.g., to 3 for low-ambiguity domains).

## 6. Configuration

```jsonc
// refine.config.json
{
  "autoRefine": true,
  "includeOriginal": true,   // default true — send the verbatim original too
  "minQuestions": 5          // default 5 — minimum discovery questions
}
```

Plugin options override the file: `["./..../opencode-plugin.js", { "autoRefine": true, "includeOriginal": false }]`.

## 7. Reference

- Wire composition & question builder: `src/core/discovery.ts`
- Outgoing decision logic: `src/integrations/refine-outgoing.ts`
- OpenCode hook glue: `src/integrations/opencode-plugin.ts`
- Config schema: `src/integrations/config-loader.ts` · [configuration.md](configuration.md)
- Architecture & pass phases: [architecture.md](architecture.md) (§3 phase 5 `discover`)
