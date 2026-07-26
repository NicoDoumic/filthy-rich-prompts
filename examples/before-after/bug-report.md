# Before/After: Bug Report

Category: `bug-report` · Difficulty: typical

---

## Raw prompt

> ur app crashed when i clicked export, fix asap, it worked yesterday

## Refined prompt

```markdown
# Bug Report: Crash on export

## Summary

The application crashes when the export action is triggered.

## Expected behavior

The export completes successfully (as it did previously).

## Actual behavior

The application crashes upon clicking export.

## Regression window

- Last known good: yesterday
- First known bad: today
- This worked before → treat as a likely regression; recent changes are prime suspects

## Priority

- User-indicated urgency: high ("asap") — user-stated, not inferred

## Missing information (blocking a complete diagnosis — please provide)

1. Application version / build
2. Platform and OS (desktop? web? which browser?)
3. What was being exported, and roughly what size
4. Crash evidence: error message, stack trace, or logs if available
5. Does it crash on _every_ export or only this one?

## Suggested first diagnostic steps (inferred — confirm)

- Check whether anything deployed/changed in the regression window
- Attempt to reproduce with the same export input
```

---

## What changed, and why

| #   | Change                                                                   | Pass (phase)                   | Why                                                                                                                                                                   |
| --- | ------------------------------------------------------------------------ | ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | "ur app crashed when i clicked export" → Summary + Expected/Actual split | structure (50)                 | The classic bug-report skeleton (expected vs. actual) forces the one comparison every fix needs; the raw sentence contained both halves implicitly                    |
| 2   | "it worked yesterday" → `## Regression window` section                   | context-enrichment (30)        | This is the highest-value clue in the report — a one-day regression window — and it was hiding as a throwaway clause. Promoted, not rewritten                         |
| 3   | "likely regression; recent changes are prime suspects"                   | context-enrichment (30)        | **Labeled inference.** Logical consequence of the user's own facts, stated as guidance ("treat as") rather than fact                                                  |
| 4   | "fix asap" → `Priority: user-indicated urgency: high`                    | constraint-extraction (40)     | "asap" is real priority signal but no deadline; recorded as _user-stated_ urgency with the original words quoted, and NOT converted into a fake SLA                   |
| 5   | `## Missing information` section added                                   | missing-context-detection (20) | A crash report without version/platform/repro is unfixable; listing gaps _inside the artifact_ turns the refined prompt into a working document instead of a dead end |
| 6   | `## Suggested first diagnostic steps`                                    | context-enrichment (30)        | **Explicitly labeled inferred.** Follows from the regression window; user can strike it                                                                               |
| 7   | "ur" → "the", "i" → "I"                                                  | structure (50)                 | Register normalization only; zero information content changed                                                                                                         |

## What was deliberately NOT changed

- **No invented repro steps.** We know one step: "click export." Steps 2+ would be fabrication — instead, missing-info item 5 asks whether that's sufficient
- **No severity downgrade.** A "crash + asap" report was not softened to "minor inconvenience"; user urgency survived intact
- **No root-cause guess presented as fact** ("probably a memory issue") — the executor's job is diagnosis; ours is a complete report
- **"the export" left generic** — what export (CSV? PDF? report?) is missing-info item 3, not something to guess

## Diagnostics emitted

| Code               | Severity | Message                                                                                              |
| ------------------ | -------- | ---------------------------------------------------------------------------------------------------- |
| `MISSING_CONTEXT`  | blocking | No version, platform, or crash evidence — report is actionable but not diagnosable without items 1–4 |
| `VAGUE_DEADLINE`   | info     | "asap" recorded as urgency, not a time constraint                                                    |
| `REGRESSION_CLAIM` | info     | "worked yesterday" — regression window of ~1 day inferred                                            |

## Questions interactive mode would ask

1. What version are you on, and did it update between yesterday and today?
2. What were you exporting, and does it crash with other exports too?
3. Is there an error message or log you can paste?

Note the blocking diagnostic: unlike most refinements, this one _recommends answering before executing_ — a crash report without version/evidence will bounce back anyway.
