# src/ — Module Map

> **Phase 0 status: skeleton only.** No code lives here yet — this directory pre-allocates the layout so Phase 1 has an obvious home for everything and contributors never wonder "where does this file go?". The authoritative spec for what gets built is [../docs/architecture.md](../docs/architecture.md); the build order is [../ROADMAP.md](../ROADMAP.md) (M1 = Phase 1).

## Layout & Dependency Rules

```
src/
├── core/            # The engine. ZERO runtime dependencies. Depends on nothing in src/.
│   │                #   types.ts      — Pass, PassContext, PassResult, Diagnostic, Explanation,
│   │                #                   Assumption, IntentModel, RefinementReport (§4.2–4.3)   [M1 ✅]
│   │                #   context.ts    — initialContext(), applyResult(), deepFreeze()          [M1 ✅]
│   │                #   registry.ts   — createRegistry(), validatePass()                       [M1 ✅]
│   │                #   pipeline.ts   — runPipeline: phase ordering, snapshots, validation     [M1 ✅]
│   │                #   diff.ts       — hand-rolled Myers line diff (D2, split from report.ts) [M1 ✅]
│   │                #   report.ts     — buildReport: RefinementReport assembly (D8: no timing) [M1 ✅]
│   │                #   version.ts    — TOOL_VERSION injected from package.json (Q11)          [M1 ✅]
│
├── passes/          # Built-in passes. Depend ONLY on core types. One pass = one file.
│   │                #   Never imported by core; registered via core/registry.
│   │                # Phase 1: intent-detection.ts · ambiguity-detection.ts · structure.ts
│   │                # Phase 2: missing-context.ts · constraint-extraction.ts ·
│   │                #          goal-extraction.ts · output-format.ts · task-decomposition.ts ·
│   │                #          generate.ts (60) · verify.ts (70)
│
├── plugins/         # Plugin loader + capability enforcement (M5). Depends on core.
│   │                #   Discovers packages listed in config `plugins:`, validates peer ranges,
│   │                #   enforces requiresLLM/requiresNetwork declarations (docs/plugin-api.md)
│
├── reporting/       # Renderers: text/markdown/JSON output of RefinementReport, diff views.
│                    #   Depends on core. Shared by CLI and TUI — one renderer, two shells.
│
└── cli/             # The `frp` binary (M3). Depends on core + reporting. May use external
                     #   deps (separate package boundary) — core stays zero-dep regardless.
```

## The Rules (enforced by lint boundaries from Phase 1)

1. **`core` imports nothing from `src/`** — it is the bottom of the dependency graph.
2. **`passes` import only from `core`** — never from each other, never from plugins/cli/reporting.
3. **Nothing imports from `cli` or `reporting` except the binary entry point.**
4. **`core` and `passes` have zero runtime dependencies** — the rule from [../docs/coding-standards.md](../docs/coding-standards.md) §2. CI checks the dependency graph.
5. Tests live next to sources (`*.test.ts`) except golden fixtures, which live in [`../tests/golden/`](../tests/) per [../docs/testing-strategy.md](../docs/testing-strategy.md).

## Future packages (post-M3, monorepo split)

When the CLI and TUI land, this layout becomes a pnpm workspace: `@filthy-rich-prompts/core` stays here; CLI/TUI become sibling packages that depend on core. The directory rules above are designed so that split is a rename, not a refactor.
