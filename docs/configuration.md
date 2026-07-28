# Configuration Format

> Status: **Partially implemented** — autoRefine-only subset is live in v0.2.0-next.0 (see `src/integrations/min-config.ts`). Full schema (4-level precedence, pass options, model config) targets M2. Schema freezes at 1.0. Until then, additive changes only.

Zero-config must be great; total configurability must be possible. This document defines the single config surface shared by the OpenCode skill, the CLI, and the TUI.

---

## 1. File Format Decision

| Option                                 | Pros                                                                             | Cons                                                                                            | Verdict                        |
| -------------------------------------- | -------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | ------------------------------ |
| `.promptrc` / `.promptrc.json`         | Familiar rc-file convention                                                      | Name mismatch with brand; dotfiles hide config from reviewers; no schema discoverability story  | ❌                             |
| `package.json` key (`"promptRefiner"`) | No new file in JS projects                                                       | Invisible in non-JS projects; nesting limits; two sources of truth                              | Later (convenience alias only) |
| `refine.config.ts` (code config)       | Full power, typed                                                                | Requires runtime config execution; a supply-chain and security surface; overkill for pass flags | Post-M5 (power users)          |
| **`refine.config.json`**               | Explicit, diffable in PRs, JSON-Schema-validatable in editors, language-agnostic | Comments need `jsonc` handling                                                                  | ✅ **recommended**             |

**Decision: `refine.config.json`** as the primary format, parsed as JSONC (comments allowed) with a published JSON Schema (`$schema` autocomplete in VS Code). A `package.json` `"promptRefiner"` key may be added later as an alias; a TS config is a post-1.0 power feature evaluated against its security implications.

## 2. Discovery & Precedence

Config resolves from these sources, **highest precedence wins**:

> **Implementation note:** The 4-level precedence merge is **not yet implemented** — currently only the plugin options level (CLI flags / skill invocation options) is wired up. The full merge engine across all four layers is planned for M2.

1. **CLI flags / skill invocation options** (e.g. `--mode expert`, `--no-pass structure`)
2. **Project config** — nearest `refine.config.json` walking up from cwd
3. **User config** — `~/.config/filthy-rich-prompts/refine.config.json` (XDG on Linux/macOS, `%APPDATA%` on Windows)
4. **Built-in defaults**

Merging is shallow per section with one rule: **more specific sources override; arrays (e.g. `plugins`) are replaced, not concatenated** — predictability beats cleverness in security-relevant lists.

## 3. Schema (proposed)

```jsonc
{
  "$schema": "https://filthy-rich-prompts.dev/schema/v1.json",

  // ── Behavior ──────────────────────────────────────────────
  "mode": "beginner", // beginner | expert | interactive | silent
  "locale": "en", // reserved; see open-questions.md (i18n)

  // ── Passes ────────────────────────────────────────────────
  "passes": {
    // per-pass: boolean (enable/disable) or an options object
    "intent-detection": true,
    "ambiguity-detection": { "severity": "warning" },
    "structure": { "style": "markdown" }, // markdown | xml | plain
    "task-decomposition": false,
  },

  // ── Plugins (M5+) ─────────────────────────────────────────
  "plugins": ["filthy-rich-prompts-pass-jira"],

  // ── Model access (LLM-powered passes; opt-in) ─────────────
  "model": {
    "provider": "none", // none | opencode | openai-compatible | local
    "maxTokensPerRun": 0, // hard budget; 0 = refuse LLM passes
    "timeoutMs": 20000,
  },

  // ── Output ────────────────────────────────────────────────
  "output": {
    "diff": true, // include original-vs-refined diff
    "explanations": true, // per-change rationale
    "report": "summary", // none | summary | full
    "assumptionsSection": true, // render labeled assumptions in refined prompt
  },

  // ── Budgets & safety ──────────────────────────────────────
  "limits": {
    "maxPromptBytes": 65536, // refuse-and-report above this
    "maxPasses": 64, // runaway-plugin guard
  },
}
```

### Defaults (the zero-config experience)

Everything omitted behaves as: `mode: beginner`, all built-in passes enabled, no plugins, `model.provider: none` (heuristic-only, offline), full diff + explanations + summary report. **A first-time user with no config gets the complete honest pipeline, offline, for free.**

## 4. Pass Options Contract

Each pass documents its own options; the engine validates them against a per-pass schema the pass _declares_:

```ts
// DESIGN SKETCH — pass declares its config shape
definePass({
  id: "structure",
  // ...
  configSchema: {
    style: {
      type: "string",
      enum: ["markdown", "xml", "plain"],
      default: "markdown",
    },
  },
  run(ctx) {
    /* reads ctx.config.passes['structure'] */
  },
});
```

Unknown pass IDs in config → `warning` diagnostic (typo protection), never a crash. Unknown options on a known pass → `warning` diagnostic naming the offending key.

## 5. Environment Variables

Only two, both overridable by config/flags:

- `FRP_CONFIG` — explicit path to a config file (skips discovery)
- `FRP_NO_LLM=1` — hard-disable all LLM-powered passes regardless of config (CI/air-gapped escape hatch)

Deliberately **no** `FRP_API_KEY`-style variables: model credentials belong to the provider integration (OpenCode's own auth), never to this tool.

## 6. Validation & `frp doctor`

- Config is validated at load against the JSON Schema; errors point to file + JSON path.
- `frp doctor` prints the _resolved_ config (post-merge), where each value came from, which passes will run (in order), which were skipped and why, and the effective privacy posture (offline / provider / network-capable plugins). This is the primary debugging tool and is required output when filing bugs (see the [bug report template](../.github/ISSUE_TEMPLATE/01-bug-report.yml)).

## 7. Anti-goals

- **No per-prompt frontmatter config** (config-in-prompt is injection-prone and confuses precedence). Prompt-level control happens via skill invocation options only.
- **No global mutable state** — a config file produces an immutable `ResolvedConfig`; re-resolution is the only way to change it.
- **No hidden network fetches of config** (remote config URLs are a supply-chain attack; rejected).