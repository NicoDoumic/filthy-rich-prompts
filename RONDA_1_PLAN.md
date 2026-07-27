# Ronda 1 — Implementation Plan

> Goal: Phase 2 complete — all pipeline passes implemented, config loader, modes, auto-refine toggle.
> Strategy: Pipeline phase order, one pass at a time, with tests and golden fixtures for each.

## Implementation Order (from PLAN.md §4 / ROADMAP.md M2)

### Passes (pipeline phase order)
1. **Missing-context detection** (phase 20, detection) — flag absent information
2. **Context enrichment** (phase 30, transformation) — surface and structure existing context
3. **Constraint extraction** (phase 40, transformation) — implicit → explicit constraints
4. **Goal & role extraction** (phase 40, transformation) — objective + expert role
5. **Task decomposition** (phase 50, transformation) — split compound requests
6. **Output-format inference** (phase 50, transformation) — specify output format
7. **Final generation** (phase 60, generation) — assemble refined prompt
8. **Verification** (phase 70, generation) — intent-preservation + information-loss check

### Infrastructure
9. **Config loader** — `refine.config.json` with 4-level precedence
10. **Modes** — beginner / expert / silent behaviorally distinct
11. **Auto-refine plugin + toggle** — `/refine on|off` command file + question-tool flow

### Per-pass checklist
- [ ] Implement pass in `src/passes/<pass-id>.ts`
- [ ] Unit tests in `src/passes/<pass-id>.test.ts`
- [ ] Register in `src/index.ts` `builtinPasses`
- [ ] Golden fixture in `tests/golden/<category>-<id>/`
- [ ] Update golden expected outputs (regenerate with UPDATE_GOLDENS=1)
- [ ] Verify all tests pass