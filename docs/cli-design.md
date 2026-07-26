# CLI Design (Future)

> Status: **Proposed design** — implemented in M3. Command names and flags may change until the first M3 prerelease; the _principles_ (§1) will not.

The CLI makes refinement usable everywhere: shells, editors, CI, git hooks, other agents. The OpenCode skill is the primary surface; the CLI is the universal one.

---

## 1. Principles

1. **Unix-native.** stdin in, stdout out, composable, scriptable. Interactive features are opt-in, never required.
2. **Same engine, same config, same results.** The CLI is a thin shell over the core pipeline — no CLI-only logic.
3. **Exit codes are an API.** Scripts depend on them; they are documented and tested.
4. **Fast cold start** (<150 ms heuristic-only) — constrains us to the zero-dependency core plus a minimal arg parser.

**Binary name: `frp`** (filthy-rich-prompts). Alternatives considered: `prompt-refiner` (accurate, 14 chars of typing), `refine` (certain to collide), `frp` (short, memorable, available at design time). If `frp` collides on npm at publish time, fallback: `frprompts`. Package name remains `filthy-rich-prompts` regardless.

## 2. Commands

### `frp refine` — the main event

```bash
frp refine "make the login faster it's broken sometimes"
cat prompt.txt | frp refine
frp refine --file prompt.txt --out refined.md
```

| Flag                             | Default     | Meaning                                                                              |
| -------------------------------- | ----------- | ------------------------------------------------------------------------------------ |
| `--file, -f <path>`              | stdin       | Read raw prompt from file                                                            |
| `--out, -o <path>`               | stdout      | Write refined prompt to file                                                         |
| `--mode <mode>`                  | config      | `beginner` · `expert` · `interactive` · `silent`                                     |
| `--pass <id>` / `--no-pass <id>` | all enabled | Enable only / disable specific passes (repeatable)                                   |
| `--format <fmt>`                 | `markdown`  | Output: `markdown` · `json` · `plain`                                                |
| `--diff` / `--no-diff`           | config      | Include original-vs-refined diff                                                     |
| `--explain` / `--no-explain`     | config      | Include per-change rationale                                                         |
| `--report <level>`               | config      | `none` · `summary` · `full`                                                          |
| `--json`                         | off         | Shorthand for `--format json` (refined + diff + explanations + report as one object) |

With no `--out`, stdout gets **only the refined prompt** (pipe-safe); diff/explanations/report go to stderr unless `--json`. This is the single most important CLI UX decision: `frp refine < a.txt | pbcopy` must never copy report noise.

### `frp lint` — diagnostics without transformation

```bash
frp lint "fix the thing asap"
# ⚠ AMBIGUOUS_REFERENT — "the thing" has no antecedent
# ⚠ VAGUE_DEADLINE — "asap" is not a time constraint
# ℹ MISSING_CONTEXT — no environment/version info
# exit code 1
```

Runs **detection passes only**; prints diagnostics; never mutates. Designed for CI ("prompt linting") and pre-commit hooks. `--max-warnings <n>` for gating, `--format json` for tooling.

### `frp diff` — inspect a refinement

```bash
frp refine -f raw.txt -o /tmp/r.md && frp diff raw.txt /tmp/r.md
frp refine -f raw.txt --json | frp diff --from-json -    # (design TBD in M3)
```

Renders line-wise diff (unified or side-by-side with `--side-by-side`). Also accepts any two files — it is honestly just a good diff viewer, reused by the TUI.

### `frp explain` — the why

```bash
frp refine -f raw.txt --json | frp explain --from-json -
frp explain --last        # re-render explanations from the last run's cache
```

Renders explanations grouped by pass with before/after excerpts. In beginner mode this is shown by default; `explain` exists for "show me again later" and for expert-mode users who want depth on demand.

### `frp score` — quality metrics (M4+)

```bash
frp score -f raw.txt -f refined.txt     # compare any two prompts
frp refine -f raw.txt --score           # score as part of refinement
```

Emits the metric suite from [evaluation-metrics.md](evaluation-metrics.md): intent preservation, clarity, specificity, structure, token efficiency. `--format json` for dashboards.

### `frp plan` — task decomposition preview (M3+)

Runs detection + task-decomposition passes and prints the sub-task breakdown **without** producing a refined prompt — for users who want the plan, not the rewrite.

### `frp passes list` — introspection

```bash
frp passes list            # id, phase, kind, LLM?, description — in execution order
frp passes list --json
```

### `frp init` — config wizard

Interactive scaffolder for `refine.config.json`: mode, pass toggles, model provider, output prefs. `--yes` accepts defaults non-interactively. Writes JSONC with comments explaining every field.

### `frp doctor` — environment & config audit

Prints resolved config with source attribution, pass execution plan, plugin trust status, privacy posture, and version info. **Required attachment for bug reports.**

## 3. Exit Codes (contract)

| Code | Meaning                                                                                            |
| ---: | -------------------------------------------------------------------------------------------------- |
|  `0` | success; refinement applied / no lint findings                                                     |
|  `1` | lint findings at or above threshold (`frp lint` only)                                              |
|  `2` | usage error (bad flags, unreadable file)                                                           |
|  `3` | config error (invalid `refine.config.json`)                                                        |
|  `4` | internal error — a pass crashed _and_ fallback failed (should be unreachable; see architecture §8) |

Refinement itself **never** fails non-zero when a refined prompt was produced — diagnostics are data, not errors.

## 4. Global Flags

`--config <path>` · `--no-config` · `--verbose` · `--quiet` · `--no-color` (also honors `NO_COLOR`) · `--version` · `--help`

## 5. Example Session

```bash
$ echo "ur app crashed when i clicked export, fix asap, it worked yesterday" | frp refine
# Bug Report: crash on export

## Summary
Application crashes when the export action is triggered.

## Regression window
- Last known good: yesterday
...
$ echo $?
0
```

## 6. Distribution

- npm: `npm i -g filthy-rich-prompts` → exposes `frp`
- Post-1.0 candidates: Homebrew, Scoop, standalone binaries via `pkg`/`bun build --compile` (evaluated against the zero-dep advantage)
- No telemetry. Ever. (See [design-philosophy.md](design-philosophy.md) §8 — and [open-questions.md](open-questions.md) for the opt-in debate we are _not_ having before 1.0.)

## 7. Non-goals for the CLI

- **No daemon/server mode** (state is per-run; a language-server-style mode is a separate future project)
- **No interactive chat** (that's the TUI's job, and OpenCode's)
- **No model credentials management** (providers own auth; see [configuration.md](configuration.md) §5)
