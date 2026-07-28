# PLAN.md — The Path to Public Release

> **This is the single authoritative plan.** Everything required to take filthy-rich-prompts from its current state to a public, installable, used-in-the-real-world 1.0 — phases, exit criteria, and the open items that must not be lost. ROADMAP.md remains the milestone record; this file is the actionable path. When the two ever disagree, this file wins and the other is updated.

Last updated: 2026-07-28 · Current state: **v0.2.0-next.0 (Phase 1 complete)**

> **Phase 1 completion note:** All 11 core passes are implemented (the 3 M1 foundational passes plus the 8 remaining heuristic passes), tested (134 tests, 6/6 property invariants, coverage gates), and verified to load in OpenCode 1.18.5. Deliberately NOT included in this cut: CLI, TUI, full file-config precedence, plugin trust-tiers, benchmarking, i18n. The Phase-70 verify pass is heuristic-only — its semantic/judged version lands with M4's harness. `structure` remains publicly labeled PROVISIONAL against the Tier 0 gate.

---

## 1. Where We Are (verified state)

| Item                                                        | State                                                                                                                                                                                 |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Phase 0 — repository foundation                             | ✅ Complete (30/30 deliverables)                                                                                                                                                      |
| M1 — core engine + 11 core passes                           | ✅ Shipped as v0.2.0-next.0 (134 tests green on Node 22/24/26, coverage gates green, zero runtime deps)                                                                                |
| OpenCode loads `prompt-refiner` skill                       | ✅ Verified on OpenCode 1.18.5 (`opencode debug skill` — discovery + frontmatter contract)                                                                                            |
| Repository on GitHub                                        | ✅ [NicoDoumic/filthy-rich-prompts](https://github.com/NicoDoumic/filthy-rich-prompts)                                                                                                |
| npm package published                                       | ❌ Not yet — `release.yml` ready; needs `NPM_TOKEN` secret + first run                                                                                                                |
| CI green on **real GitHub runners**                         | ❓ Unknown — workflows exist and every step passes locally (Windows × Node {22,24,26}), but no GitHub Actions run has been confirmed (no `gh` CLI locally; **check the Actions tab**) |
| M1 exit criterion 4 (independent CONTRIBUTING/setup review) | ❌ Open — needs a human who didn't write the docs                                                                                                                                     |

## 2. The Goal State ("Public")

1. `npm install -g filthy-rich-prompts` works and installs v1.0.0 with provenance.
2. An OpenCode user installs the skill in one copy-paste, and — **if they enable the toggle — every prompt they send is automatically refined first** (see §3).
3. CI is green on GitHub across the full OS × Node matrix on every PR.
4. The intent-preservation gate (100% on the core benchmark set) is enforced on every release.
5. A contributor who never met us can install, use, and propose a pass using only the docs.

## 3. The Auto-Refine Toggle (mandatory feature)

**Requirement:** a user-toggleable mode where _every prompt sent to OpenCode passes through the refiner first_, the refiner asks the user for missing context when it matters, and the **refined** prompt is what reaches the model.

```
user types prompt
      │
      ▼
┌─ OpenCode plugin hook (chat.params / messages.transform) ─┐
│  autoRefine enabled? ── no ──► prompt passes through        │
│      │ yes                                                  │
│      ▼                                                      │
│  refine(prompt) ──► blocking diagnostics?                   │
│      │              ├── yes ──► ask user (question tool):   │
│      │              │         "which did you mean?"         │
│      │              │         answers → re-refine           │
│      │              └── no ──► refined prompt + brief note  │
│      ▼                                                      │
│  outgoing message = REFINED prompt                          │
└─────────────────────────────────────────────────────────────┘
      │
      ▼
   model
```

**Mechanism — options → tradeoffs → recommendation:**

| Option                   | Tradeoff                                                                                                                                                                                                             | Verdict                         |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| SKILL.md alone           | The model decides when to trigger the skill. Cannot guarantee interception of _every_ prompt — it's advisory, not a gate                                                                                             | ❌ (keep as the manual surface) |
| **OpenCode plugin hook** | OpenCode 1.18.5 plugins (`chat.params`, `chat.message`, `experimental.chat.messages.transform` hooks) intercept every outgoing message. Guaranteed interception, runs our real engine, toggleable via plugin options | ✅ **recommended**              |
| Wrapper agent config     | Requires users to change their default agent; fragile, and still not a guaranteed intercept                                                                                                                          | ❌                              |

**Design decisions (Phase 2 scope):**

- **Vehicle:** a published OpenCode plugin shipped from this repo (`.opencode/plugin/` local dev copy + npm-distributed entry for users). It imports `refine()` from the installed package — no logic duplication.
- **Toggle surface (three levels, highest precedence wins):** per-session `/refine on|off` (OpenCode command file) → project `refine.config.json` (`autoRefine: true|false`) → global default **off** in 0.x. Rationale for opt-in default: an interception layer that surprises users is an adoption killer; 1.0 revisits the default with benchmark evidence.
- **Clarification UX:** `blocking` diagnostics (e.g., missing context the task depends on) trigger OpenCode's native `question` tool before send; `warning`/`info` diagnostics are attached as a short annotation instead of interrupting. In `silent` mode, nothing is ever asked — assumptions are labeled inline.
- **Failure doctrine (architecture §8 applied):** if refinement itself errors, the original prompt goes through unmodified + a one-line note. Interception must never be worse than no interception.

## 4. Phases to Publish

### Phase 2 — Integration, Config & Auto-Refine ⬜ (next)

**Scope:** make the skill real inside OpenCode, with file-based config and the §3 toggle.

1. **Config loader** ✅ — implemented `min-config.ts` for autoRefine-only subset in the pre-release. Full `refine.config.json` with 4-level precedence from [docs/configuration.md](docs/configuration.md) still pending (invocation flags > project config > user config > defaults).
2. **Remaining core passes** ✅ — all 11 passes implemented (intent-detection, ambiguity-detection, missing-context, context-enrichment, constraint-extraction, goal-role-extraction, structure, output-format-inference, task-decomposition, final-generation, verification). Heuristic baselines per [docs/open-questions.md Q2](docs/open-questions.md).
3. **Phase-70 verify pass** ✅ — implemented as minimal heuristic verification: (a) information-loss check; (b) secret-shaped-string diagnostic; (c) emits `blocking` diagnostics on violation. Deliberately minimal; the semantic/judged version lands with M4's harness.
4. **Auto-refine plugin + toggle** ✅ — pre-released as v0.2.0-next.0, including the `/refine on|off` command file and the question-tool clarification flow.
5. **Modes** ⬜ — beginner / expert / silent need behavioral implementation (currently documented as design; the engine exports `Mode` type but mode-specific branching is not wired).
6. **Integration re-verification** ⬜ — Q6 stays unresolved: full end-to-end verified in a live OpenCode session with a configured provider.

**Exit criteria:** every pass in the SKILL.md table marked ✅ (done); the four `examples/before-after/` transformations reproduce through the real pipeline end-to-end (pending); auto-refine toggle demonstrated on/off in a live OpenCode session (pending); `refine.config.json` precedence proven by tests (pending).

### Phase 3 — CLI & TUI ⬜

`frp` binary per [docs/cli-design.md](docs/cli-design.md) (`refine`, `lint`, `diff`, `explain`, `init`, `doctor`; `score`/`plan` deferred to M4); interactive TUI per [docs/tui-design.md](docs/tui-design.md) with per-pass approve/reject; interactive mode end-to-end. **Hooks Phase 2 creates for this phase (noted, not built):** the resolved-config object and the question/approval flow — CLI/TUI consume the same surfaces, no new design needed.
**Exit:** `echo "messy" | frp refine` on macOS/Linux/Windows; TUI accept-all ≡ non-interactive output byte-identical.

### Phase 4 — Proof (Benchmarks & Metrics) ⬜

Dataset (200+ fixtures incl. adversarial), invariant gate at 100% intent preservation, judged track (nightly), public benchmark report per [docs/benchmarking.md](docs/benchmarking.md) and [docs/evaluation-metrics.md](docs/evaluation-metrics.md).
**Exit:** regressions block merges; the v1.0 release notes cite reproducible evidence that refined ≥ raw on every Tier-1 metric.

### Phase 5 — Plugin API & Public Launch ⬜ → **1.0.0**

Stable plugin API per [docs/plugin-api.md](docs/plugin-api.md), 3 reference plugins, docs sweep, launch materials. **1.0.0 published to npm with provenance** via `release.yml`.
**Exit:** a community member ships a third-party pass without touching this repo; install + first refinement completed by an external user following only the docs.

## 5. Dependency Decisions Still Open for Phase 2 Planning

Named now so they're decided consciously, not drifted into:

- **Config schema validation:** hand-rolled (recommended) vs `zod`. Recommendation: hand-rolled — the config schema is ~15 fields, and the zero-dep core rule holds; if it ever grows past ~40 fields, re-open. Location if it changes: an adapter package, never core (architecture.md carve-out).
- **OpenCode plugin packaging:** the plugin is a thin adapter importing `refine()` — it lives in this repo now, becomes its own workspace package at the M3 monorepo split (per `src/README.md`).
- **Model-agnostic output (Q3):** unchanged — canonical markdown structure only; `structure.style` option stays the single concession. Still provisional, by design.
- **Latency/cost budget:** unchanged from architecture §10 — heuristic-only stays the default; Phase 2 adds zero LLM-powered passes.

## 6. Carried-Over Open Items (must not be lost)

| #   | Item                                                                                                                                                                                | Owner          | Close by                      |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- | ----------------------------- |
| 1   | **CI green on real GitHub runners** (full OS × Node matrix) — no run confirmed yet; check the Actions tab after this push; fix whatever real runners surface that local runs didn't | maintainer     | Phase 2 start                 |
| 2   | **M1 exit criterion 4** — independent human runs setup from CONTRIBUTING.md cold and files the gaps                                                                                 | external human | Phase 5 (1.0) at the latest   |
| 3   | **git identity** — repo-local placeholder `dev@localhost`; set real `user.name`/`user.email` before further commits                                                                 | maintainer     | ✅ resolved (already set)     |
| 4   | **npm publish** — `NPM_TOKEN` repo secret + first `release.yml` run (provenance)                                                                                                    | maintainer     | Phase 5 (can dry-run earlier) |
| 5   | **Node ≥25 corepack removal** — workaround documented in [docs/development-workflow.md](docs/development-workflow.md) §6 (`npx pnpm@10.13.1`)                                       | done (docs)    | ✅                            |

## 7. Definition of Done for "Public"

- [ ] Phases 2–5 exit criteria all met
- [ ] `npm i -g filthy-rich-prompts` → `frp refine` works on all three OSes
- [ ] Auto-refine toggle demonstrated: prompt → clarification question (when needed) → refined prompt reaches the model
- [ ] CI green on GitHub runners across the full matrix on the release commit
- [ ] Benchmark report published showing Tier-0 at 100% and Tier-1 gains
- [ ] Open items §6 #1–#4 closed
- [ ] 1.0.0 on npm with provenance attestation