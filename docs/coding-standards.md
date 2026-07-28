# Coding Standards

> Status: **Active** — enforced by tooling from Phase 1. Where this document and the linter disagree, the linter wins (and we fix the document).

These standards exist so that 50 contributors writing 50 passes produce one coherent codebase. Taste is delegated to tools; this document covers what tools can't enforce.

---

## 1. Language & Runtime

- **TypeScript, strict mode.** `strict: true` with `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes`. No `any` (escape hatch: `unknown` + narrowing, justified in a comment). `@ts-ignore`/`@ts-expect-error` require a linked issue.
- **ESM only.** No CommonJS, no `require`, no dual-package hazard. Node's native ESM semantics; `.js` extensions in relative imports (NodeNext resolution).
- **Runtime target:** active Node LTS at time of release. No transpiling down to EOL versions.
- **Browser/edge compatibility is not a goal** for core (OpenCode runs on Node); if it happens for free, fine — never pay complexity for it.

## 2. The Zero-Dependency Core Rule

`src/core/` and `src/passes/` have **zero runtime dependencies**. Full stop.

- Dev-dependencies (vitest, fast-check, typescript) are unrestricted.
- CLI/TUI packages (M3+) may depend on libraries (Ink etc.) — they're separate packages that depend on core, never the reverse.
- A proposed runtime dependency in core requires a PR arguing why re-implementation is worse, maintainer approval ×2, and a comment period. The default answer is no; the burden of proof is on the dependency. (Rationale: [design-philosophy.md §9](design-philosophy.md).)

## 3. Code Style

- **Functional passes.** Passes are pure functions over immutable context. No classes for passes; no module-level mutable state anywhere in `src/`; `const` by default; `readonly` on all public data structures.
- **Immutability without ceremony.** Prefer constructing new objects (`{...ctx, current: next}`) over mutation helpers. `Object.freeze` in dev/test to catch violations early ([architecture.md §4.3](architecture.md)).
- **Errors are values.** Expected failures return diagnostics/results; `throw` is reserved for _programmer errors_ (contract violations, impossible states). The engine boundary catches everything ([architecture.md §8](architecture.md)).
- **No cleverness.** If a one-liner needs a comment to be understood, write the three-line version instead. Boring code is a feature in a project whose value is trustworthiness.
- **Formatting:** Prettier, zero-config defaults (2-space, LF, trailing newline — matches `.editorconfig`). **Linting:** ESLint flat config, `typescript-eslint` recommended + `eslint-plugin-unicorn` (curated). Formatting disputes are banned from PR review — that's what the tools are for.

## 4. Naming & Structure

| Thing            | Convention                              | Example                  |
| ---------------- | --------------------------------------- | ------------------------ |
| Files            | kebab-case                              | `ambiguity-detection.ts` |
| Pass IDs         | kebab-case, globally unique             | `constraint-extraction`  |
| Types/interfaces | PascalCase, no `I` prefix               | `PassContext`            |
| Functions        | camelCase, verb-first                   | `extractConstraints`     |
| Constants        | SCREAMING_SNAKE only for true constants | `DEFAULT_PHASE`          |
| Test files       | `<name>.test.ts` adjacent to source     | `structure.test.ts`      |
| Diagnostic codes | SCREAMING_SNAKE, namespaced by pass     | `AMBIGUOUS_QUANTIFIER`   |

**File layout rule:** one pass = one file (`src/passes/<pass-id>.ts`) + one test file + docs entry. A pass that outgrows one file becomes a directory `src/passes/<pass-id>/` with `index.ts` as the only public surface — internal helpers stay private.

## 5. Documentation Requirements

- **TSDoc on every exported symbol** — what it is, invariants it maintains, one `@example` for non-trivial functions. Generated API docs must build warning-free.
- **Every pass must document:** what it improves, its kind/phase, an input it no-ops on, and an input it transforms (with the expected explanation).
- Comments explain **why**, never what. If the _what_ needs a comment, rename things until it doesn't.

## 6. Security & Data Handling

- Prompt content is **sensitive user data**: never logged verbatim at default log levels, never sent anywhere without a declared capability ([plugin-api.md](plugin-api.md)), never persisted to disk caches without an explicit user opt-in.
- No `eval`, no `Function()` constructor, no dynamic `import()` of non-config paths.
- All text processing must be Unicode-aware (prompts contain emoji, CJK, RTL text). No `str.length` arithmetic where grapheme semantics matter without a comment justifying it.

## 7. Performance Rules

- Passes must be **O(n) in prompt size** unless the PR argues otherwise (a regex with catastrophic backtracking is a failing review, not a style nit).
- No synchronous filesystem or network I/O in pass code — passes receive everything through context.
- Regexes over user input: bounded quantifiers only; ReDoS-prone patterns are rejected in review. When in doubt, linear-time string scanning beats a clever pattern.

## 8. Tooling Summary (Phase 1 setup)

| Concern         | Tool                                                                      |
| --------------- | ------------------------------------------------------------------------- |
| Language        | TypeScript (strict, NodeNext, ESM)                                        |
| Runtime/build   | Node LTS · `tsup` for builds                                              |
| Tests           | vitest (+ fast-check for property tests)                                  |
| Lint/format     | ESLint flat config + Prettier                                             |
| Commits         | PR-title check (Conventional Commits)                                     |
| Versioning      | changesets                                                                |
| Package manager | pnpm (pinned via `packageManager` field + corepack)                       |
| CI              | GitHub Actions (matrix per [testing-strategy.md §6](testing-strategy.md)) |
