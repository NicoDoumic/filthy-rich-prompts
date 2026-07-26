# Before/After: Coding Request

Category: `coding` · Difficulty: typical · Also featured in the [README](../../README.md#a-taste)

---

## Raw prompt

> hey the app is kinda slow when I open the dashboard and sometimes it just spins forever lol. can you make it faster? also maybe fix the login bug where it logs me out. using react + node btw

## Refined prompt

```markdown
# Task: Diagnose and fix two issues (dashboard performance, login sessions)

## Context

- Stack: React frontend, Node.js backend
- These are two separate issues — keep the diagnosis and fixes separate.

## Issue 1 — Dashboard performance

- Symptom: dashboard loads slowly on open
- Intermittent behavior: sometimes the load never completes ("spins forever")
- Investigate whether the bottleneck is frontend rendering, API latency, or data volume
- Explain the root cause before proposing changes

## Issue 2 — Login session

- Symptom: user is unexpectedly logged out
- Expected behavior: session persists until explicit logout or a documented expiry
- The user's "maybe" hedging suggests the trigger is unknown — treat reproduction steps as part of the deliverable

## Deliverables

1. Root-cause hypothesis for each issue, with the evidence you'd gather to confirm
2. Proposed fix per issue — smallest viable change first
3. Measurements to verify the improvement (before/after)

## Constraints (inferred — confirm or reject)

- No wholesale rewrite of the dashboard or auth system
- Justify any new dependency
```

---

## What changed, and why

| #   | Change                                                                                                 | Pass (phase)                              | Why                                                                                                                                                                                                                                              |
| --- | ------------------------------------------------------------------------------------------------------ | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | Split one compound request into two labeled issues                                                     | task-decomposition (50)                   | Two unrelated bugs fused in one prompt produce fused, half-finished answers; separation makes each individually completable                                                                                                                      |
| 2   | "kinda slow" → "loads slowly on open"                                                                  | constraint-extraction (40)                | Vague quantifiers are un-actionable; tying the symptom to the _open_ event preserves the user's observation while making it locatable                                                                                                            |
| 3   | "sometimes it just spins forever" → "Intermittent: sometimes the load never completes"                 | ambiguity-detection (20) + structure (50) | "Sometimes" is critical diagnostic information (intermittency ≠ consistent slowness); promoting it to a labeled symptom prevents the executor from treating it as noise                                                                          |
| 4   | "make it faster" → investigation framing + "explain root cause before proposing changes"               | constraint-extraction (40)                | "Faster" without a cause invites random optimization; the user's actual need is a working dashboard, which requires diagnosis first. Recorded as an _inferred_ constraint, not user-stated                                                       |
| 5   | "maybe fix the login bug" → hedging preserved as "treat reproduction steps as part of the deliverable" | ambiguity-detection (20)                  | The "maybe" signals the user can't reproduce it reliably. Deleting it would lose information; converting it to a deliverable keeps the uncertainty _visible and actionable_                                                                      |
| 6   | "using react + node btw" → `## Context` section                                                        | context-enrichment (30)                   | Stack info buried as an afterthought ("btw") is routinely missed by executors; context belongs in a canonical position                                                                                                                           |
| 7   | "lol", "hey" removed                                                                                   | structure (50)                            | Tone markers carry no task information. (Only removal performed, and it is the _only_ kind of removal the pipeline is allowed to make silently)                                                                                                  |
| 8   | `## Deliverables` section added                                                                        | output-format-inference (50)              | **Inferred, labeled as such.** The user asked for outcomes (faster, fixed) without specifying form; numbered deliverables make "done" checkable. Marked "confirm or reject" because inventing requirements is forbidden — the user can strike it |
| 9   | `## Constraints (inferred)` section added                                                              | constraint-extraction (40)                | "Smallest viable change" and "no rewrite" are _assumptions derived from_ "fix", not user statements — hence the section is explicitly labeled inferred                                                                                           |

## What was deliberately NOT changed

- **The user's uncertainty about the login bug** — not "upgraded" to a confident bug report; false confidence would invent information
- **No numeric targets** — we did _not_ write "load in <200ms"; the user never stated a number (see `must_not_introduce` invariants in [benchmarking.md](../../docs/benchmarking.md))
- **No priority assigned** — the user listed dashboard first; order was preserved, urgency was not invented
- **"the app"** left generic — the user didn't name it; a clarification question covers it instead of guessing

## Diagnostics emitted (visible in the report)

| Code                 | Severity | Message                                                                                     |
| -------------------- | -------- | ------------------------------------------------------------------------------------------- |
| `AMBIGUOUS_REFERENT` | warning  | "it" in "it logs me out" — resolved to the app via context, confidence high                 |
| `VAGUE_QUANTIFIER`   | info     | "kinda" normalized to observable symptom                                                    |
| `MISSING_CONTEXT`    | warning  | No app name, no dashboard data volume, no auth mechanism (JWT/session cookie?), no versions |
| `COMPOUND_REQUEST`   | info     | Two tasks detected and separated                                                            |

## Questions interactive mode would ask

1. Which auth mechanism — JWT, session cookies, OAuth? _(affects Issue 2)_
2. Roughly how much data does the dashboard load? _(affects Issue 1)_
3. Is the logout random or after a consistent amount of time? _(distinguishes expiry misconfiguration from a crash)_

In **silent mode** these are not asked; they appear in the report under "Open questions" with the note _"not blocking — refined prompt is executable without them."_
