# Interactive TUI Design (Future)

> Status: **Proposed design** — implemented in M3 alongside the CLI. Screen layouts below are direction, not pixel-perfect spec.

The TUI is where **interactive mode** lives: watch the pipeline run pass-by-pass, approve or reject each change, and learn prompt engineering by seeing the _why_ next to the _what_.

Launch: `frp refine --interactive`, `frp tui`, or from OpenCode when the skill enters interactive mode.

---

## 1. Design Goals

1. **Trust through visibility.** The user sees every change and its reason _before_ accepting it.
2. **Teach, don't just transform.** Beginners should finish a session knowing more about prompting than when they started.
3. **Keyboard-first, fast.** A full review of a typical refinement should take under 30 seconds.
4. **Deterministic equivalence.** Approving everything in the TUI produces _byte-identical_ output to non-interactive `frp refine`. The TUI is a view and a gate — never a second engine.

## 2. Main Screen Layout

```
┌─ filthy-rich-prompts ───────────────── refine · interactive · pass 4/7 ─┐
│                                                                         │
│ ┌── ORIGINAL (immutable) ──────┐  ┌── REFINED (working) ──────────────┐ │
│ │ make the login faster it's   │  │ # Task: Fix login performance     │ │
│ │ broken sometimes             │  │                                   │ │
│ │                              │  │ ## Issue                          │ │
│ │                              │  │ - Symptom: login is slow          │ │
│ │                              │  │ - Frequency: intermittent         │ │
│ │                              │  │                                   │ │
│ │                              │  │ ## Deliverable                    │ │
│ │                              │  │ 1. Root-cause analysis ...        │ │
│ └──────────────────────────────┘  └───────────────────────────────────┘ │
│                                                                         │
│ ┌── CURRENT PASS: structure (transformation · phase 50) ──────────────┐ │
│ │ Change: reorganized prose into Task/Issue/Deliverable sections      │ │
│ │ Why:    compound statements were fused; sections make each           │ │
│ │         requirement individually addressable                         │ │
│ │ Before: "make the login faster it's broken sometimes"               │ │
│ │ After:  "## Issue — Symptom: slow · Frequency: intermittent"        │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│  [enter] accept   [r] reject pass   [s] skip to end   [d] diff view     │
│  [e] explanations [?] diagnostics   [q] abort (keep original)           │
└─────────────────────────────────────────────────────────────────────────┘
```

Three regions:

- **Original** — always the immutable raw prompt; scrolling synced with the refined pane.
- **Refined (working)** — live view of `ctx.current`; changes from the _current pass_ highlighted.
- **Pass rail** — the current pass, its explanation(s), and the decision controls.

## 3. Interaction Model

The pipeline pauses at pass boundaries (enabled by immutable snapshots — [architecture.md §5](architecture.md)):

| Key           | Action                                                                                                                          |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `enter` / `a` | Accept this pass's changes; advance                                                                                             |
| `r`           | Reject this pass's changes (snapshot rolls back one step); advance                                                              |
| `s`           | Accept-all remaining (equivalent to `silent` for the rest of the run)                                                           |
| `d`           | Toggle full-screen diff (original ↔ working)                                                                                    |
| `e`           | Explanations browser — all changes so far, grouped by pass                                                                      |
| `?`           | Diagnostics panel — ambiguities & missing context, with suggestion lists                                                        |
| `c`           | Answer a clarifying question inline (beginner/interactive) — the answer is appended to context as user-provided, never invented |
| `u`           | Undo one pass (walk back through snapshot history)                                                                              |
| `q`           | Abort; emit the original prompt unchanged with a report of what was seen                                                        |

**Reject semantics matter:** rejecting a pass never blocks later passes — the pipeline continues from the rolled-back snapshot. This is only possible because passes are pure and context is immutable; it is the strongest argument for that architecture.

## 4. Modes Inside the TUI

- **Beginner (default):** pauses on _every_ pass; full explanations; clarifying questions asked conversationally in the `c` flow.
- **Expert:** pauses only on passes that introduced `warning`+ diagnostics or large diffs; explanations collapsed to one line; `e` for depth.
- **Silent:** TUI not entered (no interaction by definition).
- **Interactive:** the mode the TUI _is_; per-pass approval as above.

## 5. Score & Report Screen (end of run, M4+)

```
┌─ refinement complete ───────────────────────────────────────────────┐
│ Intent preservation .......... ✅ 100% (verified)                    │
│ Clarity ...................... 62 → 91  (+29)                        │
│ Specificity .................. 40 → 78  (+38)                        │
│ Structure .................... 25 → 95  (+70)                        │
│ Token overhead ............... +41% (212 → 298 tokens)               │
│                                                                      │
│ Assumptions made (2) — review before accepting:  [a] view            │
│ Open questions   (1) — answer now?               [c] answer          │
│                                                                      │
│ [enter] use refined prompt   [o] use original   [w] write to file    │
└──────────────────────────────────────────────────────────────────────┘
```

Metrics are computed by the eval harness, never guessed; definitions in [evaluation-metrics.md](evaluation-metrics.md).

## 6. Technical Direction

| Decision         | Options                                                                                                                            | Recommendation                                                                                                   |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Framework        | Ink (React-for-CLI) · blessed · raw ANSI                                                                                           | **Ink** — TS-native, component model matches our pane layout, huge community, testable via `ink-testing-library` |
| Location in repo | `src/tui/` — a _separate package_ in the eventual monorepo                                                                         | Keeps the zero-dep core clean; TUI depends on core, never the reverse                                            |
| Diff rendering   | reuse the CLI's `frp diff` engine                                                                                                  | One diff implementation, two renderers (text + TUI)                                                              |
| Accessibility    | full keyboard map, no color-only signals, `--no-color` respected, screen-reader-friendly plain output via non-interactive fallback | Required, not nice-to-have                                                                                       |
| Fallback         | any TTY absence or `FRP_NO_TUI` → degrade to non-interactive CLI flow                                                              | The TUI must never be a single point of failure                                                                  |

## 7. Non-goals

- **No mouse-driven UI** in v1 (keyboard-only keeps scope sane; revisit post-1.0)
- **No editing of the refined prompt inside the TUI** (v1 is accept/reject, not a text editor — manual edits break the diff/explanation chain; tracked in [open-questions.md](open-questions.md))
- **No real-time-as-you-type refinement** (pipeline is per-run; a watch mode is a post-M5 idea)
