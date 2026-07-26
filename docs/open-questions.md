# Open Questions

Honest design debt. These are the problems we have **not** solved, stated plainly so contributors know where the hard parts are — and so nobody mistakes Phase 0 confidence for completeness. Each entry: the question, why it's hard, current leaning, and when it must be answered by.

---

## Q1. Can intent preservation ever be _provable_?

**Why it's hard.** "Same intent" is a semantic judgment. Our machinery is layered proxies: invariants (human-authored, incomplete), information-loss heuristics (mechanical, shallow), judge models (fallible), human raters (expensive, slow). None is a proof. A sufficiently subtle drift — one that changes execution while passing all checks — is possible by construction.

**Current leaning.** Treat preservation like security: defense in depth + adversarial fixtures + assume breach (every real-world drift report becomes a fixture within one release). The verification pass (phase 70) is where new defenses accumulate.

**Decide by:** M4 (eval harness must encode the chosen doctrine).

## Q2. Heuristic vs. LLM-powered passes: where's the line?

**Why it's hard.** Heuristics are deterministic, free, offline, and dumb. LLM passes are smart, stochastic, costly, and unverifiable in CI. Some passes (structure) are obviously heuristic; some (nuanced semantic ambiguity) are obviously LLM; the middle (constraint extraction quality, role inference) is genuinely contested. Every heuristic pass that underperforms erodes trust; every LLM pass erodes the zero-config promise.

**Current leaning.** Heuristic-first for every pass; LLM variants shipped as _optional upgrades_ of the same pass ID (config selects the implementation), never as mandatory behavior. Quality gaps documented per pass in M2.

**Decide by:** M2, per pass, with benchmark evidence.

## Q3. Model-agnostic output vs. model-tuned output?

**Why it's hard.** Different executor models respond to different structures (XML vs. markdown, role-preamble styles, few-shot patterns). Tuning output per model improves execution but ties the tool to a model matrix, explodes the test surface, and tempts benchmark overfitting. Staying agnostic leaves performance on the table.

**Current leaning.** Model-agnostic canonical structure for 1.0; a documented `structure.style` config option (markdown/xml/plain) as the only concession. A `targetModel` profile system is a post-1.0 exploration requiring an execution-evaluation track first.

**Decide by:** post-1.0.

## Q4. Downstream execution evaluation — the real north star?

**Why it's hard.** "Did the refined prompt make the executor _do_ better?" is the metric that actually matters, but it's confounded by executor model, temperature, task variance, and cost. Measuring prompt quality without it risks optimizing for rater aesthetics instead of outcomes.

**Current leaning.** Tiers 0–3 ([evaluation-metrics.md](evaluation-metrics.md)) for 1.0; an execution-evaluation track (pinned executors, task-completion scoring) as the flagship post-M5 research effort.

**Decide by:** M5 planning.

## Q5. Privacy: prompts contain secrets — what is our responsibility?

**Why it's hard.** Users paste API keys, connection strings, customer data. Refinement _relocates and reformats_ text — a pass could move a secret into a more dangerous position (e.g., into a section that gets logged), or an LLM-powered pass could ship secrets to a provider. A `secret-redaction` detection pass helps, but redaction itself modifies the prompt, colliding with "never remove information." The trust boundary with OpenCode (which sees the raw prompt anyway) is also unclear.

**Current leaning.** Phase 70 verification flags _secret-shaped strings_ as diagnostics (never modifies them); LLM passes are opt-in with capability declarations; docs teach users the boundary. A redaction _transformation_ — opt-in only — is designed but not scheduled.

**Decide by:** M2 (diagnostics) / M5 (redaction pass).

## Q6. How exactly does OpenCode load skills?

**Why it's hard.** Our SKILL.md follows the Agent Skills convention (YAML frontmatter + markdown body), but OpenCode's exact discovery paths, frontmatter field support, invocation semantics, and version compatibility are integration details we must verify against a live OpenCode install — assumptions here invalidate the skill contract itself.

**Current leaning.** First task of Phase 1 M1: a manual smoke test matrix (install paths, field support, invocation), documented in `examples/usage.md`, with SKILL.md adjusted to reality. Until then SKILL.md is a _proposed_ contract.

**Decide by:** M1 exit (it's an exit criterion).

## Q7. Interactive clarification: where do answers live?

**Why it's hard.** When the pipeline asks "which did you mean?", the answer becomes _user-provided information_ — but it wasn't in the original prompt. Diffing "raw vs. refined" now spans two sources. Treating answers as prompt edits breaks the immutable-original model; treating them as a separate artifact complicates the final prompt assembly.

**Current leaning.** Answers are a first-class `clarifications` collection on context (like `assumptions` but user-authored); final generation weaves them in with explicit "User clarified:" attribution, preserving the raw prompt untouched.

**Decide by:** M3 (interactive mode implementation).

## Q8. i18n and non-English prompts?

**Why it's hard.** Heuristic passes (cue-phrase detection, hedges, ambiguity patterns) are English-tuned by construction. Translating refined output changes voice; not translating produces mixed-language prompts. Diagnostics and explanations also need localization to serve non-English users.

**Current leaning.** English-only for 1.0, stated plainly. `locale` is reserved in config now so the schema doesn't box us in; heuristic packs per language are a natural _plugin_ ecosystem fit post-M5.

**Decide by:** post-1.0, community demand driven.

## Q9. Manual editing in the TUI?

**Why it's hard.** Users will want to hand-edit the refined prompt. Any manual edit breaks the diff/explanation chain (a change with no pass, no explanation) and invalidates verification — the verified artifact is no longer the emitted artifact.

**Current leaning.** v1: accept/reject only, no editing (stated in [tui-design.md](tui-design.md)). If demand is strong: edits are modeled as a synthetic `user-edit` pass with auto-generated explanations, re-running verification afterward. That preserves the invariant chain at the cost of implementation complexity.

**Decide by:** M3 user feedback.

## Q10. Streaming vs. batch?

**Why it's hard.** Pass boundaries make the pipeline naturally batch; but interactive UX wants progressive output, and LLM-powered passes want token streaming for latency. Streaming partially-mutated prompts breaks snapshot semantics mid-pass.

**Current leaning.** Batch internally (pass = atomic snapshot); _report_ streaming is fine (pass completions stream to the TUI as they finish). Token-level streaming of LLM passes, if ever needed, buffers to a complete `PassResult` before the engine sees it.

**Decide by:** M3/M4 performance data.

## Q11. Pass behavior versioning & reproducibility?

**Why it's hard.** A refined prompt generated with v0.3 may differ under v0.4. Users sharing refined prompts, or bisecting a regression, need to know which pass versions produced an output. Full determinism forever would freeze all improvement.

**Current leaning.** The `RefinementReport` records tool version + pass IDs (+ config hash from M2). Reproducibility guarantee: same version + same config + same input = same output (deterministic track only). Across versions: no guarantee, documented.

**Decide by:** already decided (this document); revisit if users demand cross-version stability.

## Q12. Telemetry?

**Why it's hard.** Usage data would genuinely improve pass quality (which passes get rejected in interactive mode?), but any phone-home contradicts local-first principle #8, and opt-in telemetry is a trust tax on a tool whose entire product is trust.

**Current leaning.** None before 1.0, full stop. Post-1.0, _if_ proposed: strictly opt-in, aggregated, documented schema, no prompt content ever — and it would still need to survive a community RFC. This is the debate we are deliberately not having yet.

**Decide by:** post-1.0 RFC, if ever.
