# Refactoring Opportunities — `filthy-rich-prompts`

Audit generated 2026-07-29, updated 2026-07-29. Covers `src/core/`, `src/passes/`, `src/integrations/`, `src/cli/`, `src/installer/`, `tests/`, and `SKILL.md`.

## Status Summary

| Tier | Total | Fixed | Skipped | Description |
|------|-------|-------|---------|-------------|
| **Tier 0** | 5 | 5 | 0 | SKILL.md errors (all fixed) |
| **Tier 1** | 9 | 8 | 1 | Critical — T1.9 reverted (false positive: Myers diff trace push is essential) |
| **Tier 2** | 27 | 17 | 10 | Significant — remaining are larger refactors (CLI test decoupling, cmdInstall split, property test de-coupling) |
| **Code Review** | 4 | 4 | 0 | TSDoc, cast removal, segmenter cache, interactive mode consensus |
| **Total** | **45** | **34** | **11** | **76% complete** |

### Remaining (low ROI / architectural)

| # | What | Why skipped |
|---|------|-------------|
| T2.7 | `deepFreeze` optimization | By-design per architecture — immutable snapshots are a guarantee |
| T2.10 | Property test scaffolding coupling | Requires exporting internal strings from passes |
| T2.11 | CLI tests pre-built binary | Major refactor: needs pure-function extraction from CLI |
| T2.13 | Async pass tests | Low risk — all current passes are synchronous |
| T2.14 | OpenCode plugin CWD dependency | Requires plugin factory refactor |
| T2.16 | `cmdInstall` split into helpers | 101-line function refactor — low urgency |
| T2.23 | `mode` always included in `ResolvedConfig` | Reverted — conditional omission is intentional (default = no post-processing) |
| T2.24 | `IntentModel` contradictory validation | Semantically valid: high-confidence unknown ≠ contradiction |
| T2.8 | `headings.test.ts` / `sentences.test.ts` | Low-complexity modules, covered indirectly |
| T2.20 | Remaining weak assertions in tests | `toBeDefined()` assertions in context-enrichment, CLI tests — acceptable |
| T2.21 | Additional boundary tests | ~20% coverage improvement already done |

---

## Tier 0: SKILL.md Errors (latest edit)

| # | File | Severity | Problem | Fix |
|---|------|----------|---------|-----|
| **SK0** | `SKILL.md:39` | **High** | **"interaction" kind undocumented.** The new phase 5 uses `kind: interaction`, but the paragraph below the pipeline table only explains `detection`, `transformation`, and `generation` pass kinds. "Interaction" is never defined. | Add a sentence: `"Interaction passes prompt the user and collect input; they do not mutate the context directly."` or rename the kind to `discovery`. |
| **SK1** | `SKILL.md:88` | **High** | **Silent mode contract broken.** Original: `"No questions. Apply best-judgment refinement..."`. New: `"Discovery questions are still asked (mandatory pre-refinement phase)."` — this redefines "silent" to mean "asks questions," which is contradictory. A user selecting silent mode expects zero interaction. | Either: (a) make discovery questions skippable in silent mode (restore `"No questions."` + add `"Assumptions marked explicitly."`), or (b) rename the mode to `minimal` and add a true `silent` mode. |
| **SK2** | `SKILL.md:43-46` | **Medium** | **No timeout/fallback for unanswered discovery questions.** The protocol says "ask 3-5 questions" but never specifies what happens if the user doesn't answer. The pipeline blocks indefinitely. | Add: `"If the user does not answer within a reasonable time, proceed with best-judgment assumptions marked explicitly."` |
| **SK3** | `SKILL.md:41` | **Medium** | **Discovery output not connected to pipeline.** Questions are asked, user answers — but where do answers go? Into `PassContext.metadata`? Inlined into the prompt? Not specified. | Add: `"User answers are stored in the task context and made available to all downstream passes via \`PassContext.userAnswers\`."` (then add the field to `types.ts`). |
| **SK4** | `SKILL.md:51` | **Low** | **"Otro / I'll specify" fallback assumes Spanish-speaking users.** The Discovery Protocol uses Spanish without mentioning it's locale-dependent. | Either make it locale-agnostic (`"Other / I'll specify"`) or note that the fallback text should match the conversation language. |

---

## Tier 1: Critical (data loss, broken contracts, dead code)

### 1.1 `ResolvedConfig.mode` is `string` instead of `Mode` union

- **Files:** `src/core/types.ts:87`, `src/core/modes.ts:13`, `src/index.ts:91`
- **Severity:** High
- **Problem:** `types.ts` declares `mode?: string`, while `modes.ts` defines `type Mode = "beginner" | "expert" | "silent"`. The `as _Mode` cast in `index.ts:91` is needed because of this type gap. Any string could leak into the pipeline unchecked.
- **Fix:** Define `Mode` type in `types.ts` (or export `VALID_MODES` const array from `modes.ts` and derive the type from it). Import the canonical type everywhere.

### 1.2 Magic number `70` duplicated — `VERIFY_PHASE` not exported

- **Files:** `src/core/registry.ts:15`, `src/core/pipeline.ts:42`
- **Severity:** High
- **Problem:** `registry.ts` defines `const VERIFY_PHASE = 70;` (not exported). `pipeline.ts:42` hardcodes `if (pass.phase === 70 && ...)`. If the verification phase number changes in one place, the other silently drifts.
- **Fix:** Export `VERIFY_PHASE` from `registry.ts`. Import and use it in `pipeline.ts`.

### 1.3 `formatExplanations` — dead code, wrong signature

- **Files:** `src/core/modes.ts:36-51`, `src/index.ts`
- **Severity:** High
- **Problem:** Exported but never imported anywhere. Takes `readonly string[]` but the pipeline produces `Explanation[]` objects with `{ change, reason, before, after }` fields. Unusable without pre-mapping. Never re-exported from `index.ts`.
- **Fix:** Either remove entirely, or fix the signature to accept `readonly Explanation[]` and wire it into the mode post-processing in `index.ts`.

### 1.4 Pipeline crash handler discards `error.stack`

- **File:** `src/core/pipeline.ts:90`
- **Severity:** High
- **Problem:** `error.message` is captured, but `error.stack` is discarded. Debugging a pass failure in production requires the call chain, which is only in the stack trace.
- **Fix:** `const message = error instanceof Error ? (error.stack ?? error.message) : String(error);`

### 1.5 CLI `--no-color` and `-f` flags documented but never implemented

- **File:** `src/cli/index.ts:28,31,80,112`
- **Severity:** High
- **Problem:** USAGE string advertises `--no-color` and `-f` short flag, but neither is handled in argument parsing. Users get silent no-ops.
- **Fix:** Either implement them or remove from the USAGE string.

### 1.6 CLI `readPrompt` has no file-not-found error handling

- **File:** `src/cli/index.ts:54-56`
- **Severity:** High
- **Problem:** `readFileSync(resolve(filePath), "utf-8")` throws uncaught `ENOENT` if the file doesn't exist. Raw Node.js error reaches the user.
- **Fix:** Wrap in try/catch with a user-friendly error message and `process.exit(2)`.

### 1.7 `cmdUninstall` ignores `--project` flag

- **File:** `src/installer/index.ts:388,446-453`
- **Severity:** High
- **Problem:** `cmdInstall`, `cmdUpdate`, `cmdDoctor` all accept `project: boolean`. `cmdUninstall` does not and hardcodes global uninstall. Running `npx filthy-rich-prompts uninstall --project` silently uninstalls the global installation, leaving the project one intact.
- **Fix:** Add `project` parameter to `cmdUninstall` and pass through from `main()`.

### 1.8 Config-loader duplicates valid mode list

- **File:** `src/integrations/config-loader.ts:80`
- **Severity:** High
- **Problem:** `const valid = ["beginner", "expert", "silent"];` is a hardcoded duplicate of the `Mode` union in `modes.ts`. Adding a new mode to `modes.ts` without updating this array causes silent rejection at runtime.
- **Fix:** Export `VALID_MODES` const array from `modes.ts`: `export const VALID_MODES = ["beginner", "expert", "silent"] as const; export type Mode = (typeof VALID_MODES)[number];`. Import in config-loader.

### 1.9 ~~Myers diff: dead code path with silent failure risk~~ — FALSE POSITIVE (reverted)

- **File:** `src/core/diff.ts:55`
- **Severity:** ~~High~~ — **NOT A BUG.** The `trace.push(new Map(v))` on the `distance === -1` path is *essential* for the backtracking phase. Removing it or replacing it with a throw breaks the diff algorithm (confirmed by 3 test failures). The analysis was wrong: the code is reachable and correct.
- **Status:** Reverted. No fix needed.

---

## Tier 2: Significant (runtime bugs, test gaps, duplication)

### 2.1 Shared modal heading duplicated between `modes.ts` and `refine-outgoing.ts`

- **Files:** `src/core/modes.ts:82`, `src/integrations/refine-outgoing.ts:35-36`
- **Severity:** Medium
- **Problem:** `"## Open questions (answer before proceeding)"` is hardcoded in both files. Changing one without the other produces inconsistent output between OpenCode plugin and CLI/TUI.
- **Fix:** Export from `modes.ts`: `export const OPEN_QUESTIONS_HEADING = "...";`. Import in `refine-outgoing.ts`.

### 2.2 Repeated `switch(mode)` in all 4 mode functions

- **File:** `src/core/modes.ts:22-95`
- **Severity:** Medium
- **Problem:** `shouldAppendQuestions`, `formatExplanations`, `modeTagline`, `clarifyingQuestions` each contain `switch (mode) { case "beginner": ... case "expert": ... case "silent": ... }`. Adding a 4th mode requires touching all 4 functions.
- **Fix:** Refactor to a strategy pattern with a `ModeStrategy` interface or a lookup table `Record<Mode, ModeBehavior>`.

### 2.3 `shouldAppendQuestions` exported but only used internally

- **File:** `src/core/modes.ts:22-25`
- **Severity:** Medium
- **Problem:** Exported function never imported outside its own module. Not re-exported from `index.ts`.
- **Fix:** Un-export it (`function shouldAppendQuestions` — remove `export`) or re-export from `index.ts`.

### 2.4 Silent error swallowing in `refine-outgoing.ts` and `opencode-plugin.ts`

- **Files:** `src/integrations/refine-outgoing.ts:72-75`, `src/integrations/opencode-plugin.ts:98-99`
- **Severity:** Medium
- **Problem:** Catch blocks silently discard all errors. If the refinement engine starts failing systematically, no one knows — it silently degrades to passthrough.
- **Fix:** Add `console.warn("[frp] refinement failed, passing through original:", err)` in non-production.

### 2.5 O(n) array copy to find last user message

- **File:** `src/integrations/opencode-plugin.ts:92-94`
- **Severity:** Medium
- **Problem:** `[...messages].reverse().find(...)` creates a full shallow copy of the messages array. For 1,000+ message conversations this is wasteful.
- **Fix:** Iterate backward: `for (let i = messages.length - 1; i >= 0; i--) { if (messages[i]?.role === "user") return messages[i]; }`

### 2.6 Nested ternary in `transformMessage` is unreadable

- **File:** `src/integrations/opencode-plugin.ts:55-59`
- **Severity:** Medium
- **Problem:** Deeply nested ternary with mixed indentation makes the branching logic hard to scan.
- **Fix:** Refactor to a simple if/else chain.

### 2.7 `deepFreeze` cost on growing accumulator arrays

- **File:** `src/core/pipeline.ts:84`
- **Severity:** Medium
- **Problem:** `deepFreeze(ctx)` recurses through all accumulated diagnostics, explanations, and assumptions on every pass iteration. By the 11th pass, it's freezing hundreds of entries.
- **Fix:** Freeze only the top-level context (pass code should not mutate arrays per the immutable contract), or freeze incrementally.

### 2.8 `modes.ts` has zero dedicated tests

- **File:** `src/core/modes.ts` (95 lines, no test file)
- **Severity:** High
- **Problem:** `shouldAppendQuestions` (3 branches), `formatExplanations` (unused but exported), `modeTagline`, and `clarifyingQuestions` have no direct test coverage. Covered only incidentally through CLI tests.
- **Fix:** Create `src/core/modes.test.ts`.

### 2.9 `output-format.test.ts` severely under-tested

- **File:** `src/passes/output-format.test.ts` (28 lines, 4 tests vs. 96 lines source, 7 format categories)
- **Severity:** High
- **Problem:** Only 4 tests for a module that detects 7 format categories with multiple regex cues each. Missing: table, json, markdown, prose, diagram detection, multi-format detection, and EXPLICIT_FORMAT no-op paths.
- **Fix:** Expand to parameterized tests covering all 7 categories.

### 2.10 Property tests tightly coupled to scaffolding strings

- **File:** `tests/property/invariants.test.ts:34-51`
- **Severity:** High
- **Problem:** `SCAFFOLDING` set hardcodes 21 internal strings from the structure pass. Any change to role templates or assumption labels breaks the test silently — confusing "invented line" failures instead of "what changed."
- **Fix:** Export scaffolding strings from source passes and import into the property test. Or derive from pass configuration.

### 2.11 CLI tests require pre-built binary

- **File:** `src/cli/cli.test.ts:7`
- **Severity:** High
- **Problem:** Tests spawn `dist/cli.js` via `execFileSync`. Requires `pnpm build` before `pnpm test`. Order-dependent. Slow (process spawn per test).
- **Fix:** Export `cmdRefine`, `cmdLint`, `cmdDoctor` as pure functions operating on streams. Test them directly. Keep 1-2 E2E smoke tests as a separate suite.

### 2.12 Dead code path in `task-decomposition.ts`

- **File:** `src/passes/task-decomposition.ts:87-92`
- **Severity:** Medium
- **Problem:** `hasHeading` at line 87 checks `HEADING_PRESENT`, but this check already happened at line 40 (early return `{}`). The `hasHeading ? ...` branch at lines 90-91 is always `false`, so it's unreachable dead code.
- **Fix:** Remove the dead branch or reconsider the early return at line 40.

### 2.13 No async pass tests in pipeline

- **File:** `src/core/pipeline.test.ts` (all passes synchronous)
- **Severity:** Medium
- **Problem:** Pipeline uses `await pass.run(frozen)` but no test validates async pass sequencing, mixed sync/async passes, or async error handling.
- **Fix:** Add tests with `run: async () => ({ ... })` passes.

### 2.14 OpenCode plugin test depends on CWD filesystem state

- **File:** `src/integrations/opencode-plugin.test.ts:89-96`
- **Severity:** Medium
- **Problem:** Test assumes no `refine.config.json` in CWD. If run from a directory with one, tests pass for the wrong reason.
- **Fix:** Refactor `promptRefinerPlugin` to accept a config path or pre-resolved config as a parameter.

### 2.15 Installer plugin detection uses loose substring match

- **File:** `src/installer/index.ts:167,424`
- **Severity:** Medium
- **Problem:** `p[0].includes("filthy-rich-prompts")` matches any path containing that substring (e.g., `some-filthy-rich-prompts-fork.js`).
- **Fix:** `p[0].endsWith("filthy-rich-prompts.js")`.

### 2.16 `cmdInstall` is 101 lines — too many responsibilities

- **File:** `src/installer/index.ts:187-288`
- **Severity:** Medium
- **Problem:** OS detection, OpenCode detection, skill installation, plugin installation, config update, verification, and summary all in one function.
- **Fix:** Extract into `installSkill()`, `installPlugin()`, `updateOpenCodeConfig()`, `printSummary()` helpers.

### 2.17 No `NO_COLOR` support in installer

- **File:** `src/installer/index.ts:95-115`
- **Severity:** Medium
- **Problem:** `useColors()` only checks `process.stdout.isTTY`. Does not respect `NO_COLOR` env var (https://no-color.org/).
- **Fix:** Add `if (process.env.NO_COLOR !== undefined) return noColors;` to `useColors()`.

### 2.18 Config-loader permission error silently swallowed

- **File:** `src/integrations/config-loader.ts:56-62`
- **Severity:** Medium
- **Problem:** `readConfigFile` catches all errors and returns `{ warning: "" }`. A permission-denied error on an existing config file is silently discarded — user never knows their config was rejected.
- **Fix:** Check `(err as NodeJS.ErrnoException).code === "ENOENT"` for "not found". Report other errors as real warnings.

### 2.19 Hardcoded `autoRefine: true` in installer

- **File:** `src/installer/index.ts:249`
- **Severity:** Medium
- **Problem:** User is never asked for preference. Unwanted auto-refinement could surprise users.
- **Fix:** Default to `false` (opt-in) or add `--no-auto-refine` flag.

### 2.20 Weak assertions in pass tests (7 files)

- **Files:** `task-decomposition.test.ts:14`, `goal-role-extraction.test.ts:13-14`, `verification.test.ts:62`, `context-enrichment.test.ts:60-63`, `cli.test.ts:97-98`
- **Severity:** Medium
- **Problem:** `expect(result.explanations).toBeDefined()`, `expect(result).toBeDefined()`, `expect(result.exitCode).toBeGreaterThanOrEqual(0)` — these never catch content regressions.
- **Fix:** Replace with specific assertions on explanation content, role text, exit codes, etc.

### 2.21 Missing boundary tests in `verification.ts`

- **File:** `src/passes/verification.test.ts` (no boundary-condition tests)
- **Severity:** Medium
- **Problem:** 20% token-loss threshold untested at exactly 20%, exactly 21%, and NaN (empty prompt).
- **Fix:** Add parameterized boundary tests.

### 2.22 `pipeline.test.ts` validateResult tests too shallow

- **File:** `src/core/pipeline.test.ts:213-216`
- **Severity:** Medium
- **Problem:** `validateResult` has 4 validation branches. Only one is tested directly. The other 3 are tested only indirectly through contract-invariant tests.
- **Fix:** Add direct unit tests for all 4 branches with exact violation message assertions.

### 2.23 Config-loader conditionally omits `mode` from `ResolvedConfig`

- **File:** `src/integrations/config-loader.ts:198-199`
- **Severity:** Medium
- **Problem:** `mode` is omitted when `source === "default"`, making `ResolvedConfig.mode` optional. Downstream consumers can't rely on it being present.
- **Fix:** Always include `mode` (it always has a default value).

### 2.24 `PassResult.intent` typed as `Partial<IntentModel>` — no validation

- **File:** `src/core/types.ts:143`
- **Severity:** Medium
- **Problem:** A pass could return `{ category: "unknown", confidence: 0.9 }` — high-confidence "unknown" is contradictory. No runtime validation.
- **Fix:** Add validation in `validateResult` or narrow the type.

### 2.25 Hardcoded locale `"en"` in sentence segmentation

- **File:** `src/core/sentences.ts:1`
- **Severity:** Medium
- **Problem:** `new Intl.Segmenter("en", ...)` — non-English prompts are mis-segmented.
- **Fix:** Accept a locale parameter with `"en"` as default.

### 2.26 `diffLines` has no input size cap

- **File:** `src/core/diff.ts:27`
- **Severity:** Medium
- **Problem:** `max = n + m` — for a 10MB file this could be millions of iterations. No guard rail.
- **Fix:** Add `if (max > 100_000) throw new Error("diffLines: input exceeds maximum supported size");`.

### 2.27 `detectPackageRoot` has fragile magic number loop

- **File:** `src/installer/index.ts:74`
- **Severity:** Medium
- **Problem:** `for (let i = 0; i < 5; i++)` — assumes package root at most 5 directories up. Fails for deeply nested installations.
- **Fix:** Loop until reaching filesystem root with a reasonable cap.

---

## Tier 3: Minor (code quality, style, documentation)

### 3.1 `deepFreeze` uses `Object.keys` (includes inherited enumerable properties)

- **File:** `src/core/context.ts:28`
- **Severity:** Low
- **Problem:** If called on a class instance with enumerable prototype methods, those would be frozen too.
- **Fix:** Use `Object.getOwnPropertyNames` or document the limitation.

### 3.2 `applyResult` creates new arrays on every call (11x for 11 passes)

- **File:** `src/core/context.ts:56-74`
- **Severity:** Low
- **Problem:** Intentional immutable design, but adds GC pressure. Document the allocation characteristics.
- **Fix:** Add JSDoc noting the allocation pattern for consumers.

### 3.3 `UNKNOWN_INTENT` confidence semantics are confusing

- **File:** `src/core/context.ts:13`
- **Severity:** Low
- **Problem:** `confidence: 0` could mean "unconfident the intent is unknown" or "no detection run yet."
- **Fix:** Add JSDoc clarifying the semantics.

### 3.4 Single-export utility files could be consolidated

- **Files:** `src/core/headings.ts` (1 line), `src/core/sentences.ts` (5 lines), `src/core/version.ts` (8 lines)
- **Severity:** Low
- **Problem:** 3 files with marginal benefit as separate modules. Each imported by 3-4 other files.
- **Fix:** Consolidate into `src/core/constants.ts` or `src/core/utils.ts` if file-count reduction is desired.

### 3.5 `HEADING_PRESENT` regex missing JSDoc

- **File:** `src/core/headings.ts:1`
- **Severity:** Low
- **Problem:** Non-trivial regex imported by 4 pass files with no documentation of what it matches or its edge cases.
- **Fix:** Add JSDoc explaining the regex pattern, multiline flag, and examples.

### 3.6 `TOOL_VERSION` global ambient declaration

- **File:** `src/core/version.ts:10`
- **Severity:** Low
- **Problem:** `declare const __FRP_VERSION__: string;` pollutes global scope. Any accidental redeclaration causes conflicts.
- **Fix:** Use `(globalThis as Record<string, string>).__FRP_VERSION__` or scope inside a module.

### 3.7 `splitLines` style inconsistency with `diffLines`/`applyDiff`

- **File:** `src/core/diff.ts:11-12`
- **Severity:** Low
- **Problem:** `splitLines` is a `const` arrow function; `diffLines` and `applyDiff` use `export function`. Inconsistent style in same file.
- **Fix:** Use consistent style.

### 3.8 Redundant `?? ""` fallbacks in Myers diff backtrack

- **File:** `src/core/diff.ts:65,70-71,74-75,80-81,84-85,90-91`
- **Severity:** Low
- **Problem:** 5 `?? ""` fallbacks with 5 `/* v8 ignore next */` comments. Mathematically unreachable but would silently produce wrong output if an invariant broke.
- **Fix:** Replace with non-null assertions (`!`) for clarity, or wrap backtrack in a try/catch.

### 3.9 Redundant `?? []` in `index.ts:93`

- **File:** `src/index.ts:93`
- **Severity:** Low
- **Problem:** `const diagnostics = result.report.diagnostics ?? [];` — `diagnostics` is `readonly Diagnostic[]` (never null/undefined). Misleads readers.
- **Fix:** Remove `?? []`.

### 3.10 Redundant `finalCtx` binding in `runPipeline`

- **File:** `src/core/pipeline.ts:113`
- **Severity:** Low
- **Problem:** `const finalCtx: PassContext = ctx;` — `ctx` is already `PassContext`. Extra binding adds a line without value.
- **Fix:** Use `ctx` directly in the return object.

### 3.11 `Diagnostic.pass: "engine"` could collide with pass-originated diagnostics

- **File:** `src/core/pipeline.ts:26`, `src/core/types.ts:40-42`
- **Severity:** Low
- **Problem:** A pass could emit a diagnostic with `pass: "engine"`, causing confusion with engine diagnostics.
- **Fix:** Use a reserved prefix convention (`"$engine"` or `"__engine__"`) or a separate field.

### 3.12 Missing JSDoc on internal types in `opencode-plugin.ts`

- **File:** `src/integrations/opencode-plugin.ts:28-71`
- **Severity:** Low
- **Problem:** `MessagePart`, `ChatMessage`, `TransformOutput`, `isRecord`, `transformMessage` have no JSDoc.
- **Fix:** Add brief documentation of expected runtime shapes and why types are loose.

### 3.13 Magic string `"text"` for part type

- **File:** `src/integrations/opencode-plugin.ts:64`
- **Severity:** Low
- **Problem:** `part.type === "text"` bare string. If OpenCode adds new part types, this is scattered.
- **Fix:** Extract to `const TEXT_PART_TYPE = "text";`.

### 3.14 Duplicated `makePass()` helper across test files

- **Files:** `src/core/pipeline.test.ts:8`, `src/core/registry.test.ts:5`
- **Severity:** Low
- **Problem:** Identical factory function in two files. Adding a required field to `Pass` requires updating both.
- **Fix:** Extract to `tests/helpers/makePass.ts`.

### 3.15 Duplicated `codesFor()` helper across pass tests

- **Files:** `src/passes/ambiguity-detection.test.ts:5`, `src/passes/missing-context.test.ts:11`
- **Severity:** Low
- **Problem:** Identical function copied verbatim.
- **Fix:** Extract to `tests/helpers/codesFor.ts`.

### 3.16 Duplicated `ResolvedConfig` test literal in 5 files

- **Files:** `pipeline.test.ts:6`, `context.test.ts:10`, `ctxOf.ts:4`, `report.test.ts:6`, `invariants.test.ts:29`
- **Severity:** Low
- **Problem:** `{ passes: {}, toolVersion: "0.0.0-test" }` appears in 5 locations.
- **Fix:** Use `EMPTY_CONFIG` from `tests/helpers/ctxOf.ts` everywhere.

### 3.17 Golden test harness uses magic number for fixture count

- **File:** `tests/golden/harness.test.ts:17`
- **Severity:** Low
- **Problem:** `expect(fixtures.length).toBeGreaterThanOrEqual(8)` — silently passes if a fixture is accidentally deleted.
- **Fix:** Use a named set of expected fixture directories.

### 3.18 CLI test hardcodes `"Pipeline: 11 passes"` string

- **File:** `src/cli/cli.test.ts:128`
- **Severity:** Low
- **Problem:** Adding a 12th pass breaks the test even though the doctor command works correctly.
- **Fix:** Derive from `builtinPasses.length` or test for `"Pipeline:"` and `"passes"` separately.

### 3.19 Missing `it.each()` parameterization in 4 test files

- **Files:** `intent-detection.test.ts`, `missing-context.test.ts`, `ambiguity-detection.test.ts`, `diff.test.ts`
- **Severity:** Low
- **Problem:** Each variant/category gets a separate `it()` block with near-identical body.
- **Fix:** Use `it.each()` for ~15 test blocks.

### 3.20 `vitest.config.ts` missing `src/cli/**` from coverage include

- **File:** `vitest.config.ts:16-20`
- **Severity:** Low
- **Problem:** CLI module (184 lines) is tested but coverage not tracked.
- **Fix:** Add `"src/cli/**/*.ts"` to coverage `include`.

### 3.21 No explicit test timeout or pool configuration

- **File:** `vitest.config.ts`
- **Severity:** Low
- **Problem:** Property-based tests may exceed default 5000ms timeout. No explicit pool configuration for parallelism.
- **Fix:** Add `testTimeout: 30_000` and `pool: "forks"`.

### 3.22 Hardcoded boolean flags in CLI `cmdRefine` output options

- **File:** `src/cli/index.ts:95,99-108`
- **Severity:** Low
- **Problem:** `if (json) options.output = { diff: true, explanations: true };` — couples JSON format with what data is computed.
- **Fix:** Decouple `--json` from output flags. JSON controls format, not data.

### 3.23 Help text in installer uses raw ANSI codes

- **File:** `src/installer/index.ts:468-491`
- **Severity:** Low
- **Problem:** Bypasses the `colors` object that checks TTY. Emits ANSI codes even when piped or `NO_COLOR` is set.
- **Fix:** Use the `c` color helper consistently.

### 3.24 `banner` has dead fallback `"0.0.0"`

- **File:** `src/installer/index.ts:121`
- **Severity:** Low
- **Problem:** `(version || "0.0.0")` — `getVersion()` always returns a non-empty string, so `|| "0.0.0"` is dead code.
- **Fix:** Simplify to just `version`.

### 3.25 `cmdRefine` uses `as Parameters<typeof refine>[1]` cast

- **File:** `src/cli/index.ts:93-97`
- **Severity:** Low
- **Problem:** Bypasses type checking on CLI options. A typo like `mod` instead of `mode` would not be caught.
- **Fix:** Use properly typed `RefineOptions` object without the cast.

### 3.26 Integration tests invoke real engine when they should stub

- **Files:** `src/integrations/opencode-plugin.test.ts`, `src/integrations/refine-outgoing.test.ts`
- **Severity:** Low
- **Problem:** Most tests call the real `refine()` pipeline instead of a stub `RefineFn`. Makes tests slow and brittle.
- **Fix:** Use stubs in all but one smoke test per file.

### 3.27 `structure.ts` idempotency check should narrow heading detection

- **File:** `src/passes/structure.ts`
- **Severity:** Low
- **Problem:** `HEADING_PRESENT` regex gates the entire no-op path. If a prompt starts with `# Task` but has no structure otherwise, the pass skips it even though restructuring would improve it.
- **Fix:** Consider a more nuanced check (e.g., require at least 2 recognized sections before skipping).

### 3.28 Unnecessary `await` for synchronous passes

- **File:** `src/core/pipeline.ts:87`
- **Severity:** Low
- **Problem:** `await pass.run(frozen)` unconditionally awaits even for sync passes. 11 unnecessary microtask boundaries.
- **Fix:** `const raw = pass.run(frozen); const result = raw instanceof Promise ? await raw : raw;`.

---

## Summary

| Tier | Count | Theme |
|------|-------|-------|
| Tier 0 (SKILL.md errors) | 5 | Undocumented "interaction" kind, silent mode contract broken, missing fallback, output not connected to pipeline, locale assumption |
| Tier 1 (Critical) | 9 | Dead code, type mismatches, magic numbers, lost error context, unimplemented flags, missing error handling, broken CLI flags |
| Tier 2 (Significant) | 27 | Duplicated strings/logic, test gaps, missing coverage, dead code paths, installer bugs, performance concerns, weak assertions |
| Tier 3 (Minor) | 28 | Style inconsistencies, missing JSDoc, redundant code, test duplication, Vite config gaps |
| **Total** | **69** | |

### Quick Wins (highest impact, lowest effort)

1. Export `VERIFY_PHASE` from `registry.ts` and use in `pipeline.ts` (T1.2)
2. Remove or fix `formatExplanations` (T1.3)
3. Capture `error.stack` in pipeline crash handler (T1.4)
4. Export `VALID_MODES` from `modes.ts`, import in `config-loader.ts` (T1.8)
5. Fix `cmdUninstall` missing `--project` (T1.7)
6. Create `modes.test.ts` (T2.8)
7. Export `OPEN_QUESTIONS_HEADING` from `modes.ts` (T2.1)
8. Expand `output-format.test.ts` (T2.9)
9. Add file-not-found handling to `readPrompt` (T1.6)
10. Fix Myers diff dead code path (T1.9)
