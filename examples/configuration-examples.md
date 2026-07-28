# Configuration Examples

Worked examples of `refine.config.json` for different use cases.

> **Implementation note:** The full config schema targets M2. The autoRefine-only subset is live in v0.2.0-next.0. Pass options and the 4-level precedence merge are not yet wired up — this document shows the intended design.

---

## 1. Minimal — Just Enable Auto-Refine

The simplest possible config. Every pass enabled with defaults, beginner mode, full explanations.

```jsonc
{
  "$schema": "https://filthy-rich-prompts.dev/schema/v1.json",

  // Nothing else needed — all defaults are sensible.
  // This produces: mode=beginner, all passes on, no LLM, full output.
}
```

Or in `opencode.json` for the plugin hook:

```json
{
  "plugin": [["path/to/filthy-rich-prompts.js", { "autoRefine": true }]]
}
```

---

## 2. Expert Mode

Terse output, minimal explanations, only blocking ambiguities raised.

```jsonc
{
  "$schema": "https://filthy-rich-prompts.dev/schema/v1.json",

  "mode": "expert",

  // Expert mode:
  // - Explanations collapsed to one-liners
  // - Only blocking diagnostics interrupt
  // - Warnings and info passed through silently

  "output": {
    "diff": true,       // still useful to see what changed
    "explanations": true, // keep — one-liners are short
    "report": "summary"
  }
}
```

---

## 3. Silent Mode

No questions asked. All assumptions labeled inline and reported at the end.

```jsonc
{
  "$schema": "https://filthy-rich-prompts.dev/schema/v1.json",

  "mode": "silent",

  // Silent mode guarantees zero interaction:
  // - Never asks clarifying questions
  // - All assumptions are explicitly labeled in the report
  // - Best judgment applied for ambiguities

  // Good for CI pipelines, automated workflows, or
  // users who know exactly what they want.
}
```

---

## 4. Pass-Specific Configuration

Disable some passes, configure options on others.

```jsonc
{
  "$schema": "https://filthy-rich-prompts.dev/schema/v1.json",

  "mode": "beginner",

  "passes": {
    // Detection passes — keep everything on
    "intent-detection": true,
    "ambiguity-detection": { "severity": "warning" },

    // Transformation passes
    "context-enrichment": true,
    "constraint-extraction": true,
    "goal-role-extraction": true,
    "structure": { "style": "markdown" },
    "output-format-inference": true,

    // Disable task decomposition — we handle compound
    // requests manually in this project
    "task-decomposition": false,

    // Generation
    "final-generation": true,
    "verification": true
  }
}
```

---

## 5. CI / Lint-Only Mode

Detection passes only — no transformations, no mutations. Designed for pre-commit hooks and CI pipelines.

```jsonc
{
  "$schema": "https://filthy-rich-prompts.dev/schema/v1.json",

  // CI mode: detect problems, never change the prompt.

  "passes": {
    // Only detection passes enabled
    "intent-detection": true,
    "ambiguity-detection": true,
    "missing-context-detection": true,

    // All transformation and generation passes disabled
    "context-enrichment": false,
    "constraint-extraction": false,
    "goal-role-extraction": false,
    "structure": false,
    "output-format-inference": false,
    "task-decomposition": false,
    "final-generation": false,
    "verification": false
  },

  "output": {
    "diff": false,
    "explanations": false,
    "report": "full"  // full diagnostics for CI output
  }
}
```

When the CLI lands (M3), this mode maps to `frp lint` — it exits 1 on findings.

---

## 6. Full Config — Every Option Documented

The complete schema with all fields and comments.

```jsonc
{
  "$schema": "https://filthy-rich-prompts.dev/schema/v1.json",

  // ── Behavior ──────────────────────────────────────────────
  "mode": "beginner",   // beginner | expert | interactive | silent
  "locale": "en",       // reserved for i18n (post-1.0)

  // ── Passes ────────────────────────────────────────────────
  // Each pass: true (enable with defaults), false (disable),
  //            or an options object specific to that pass
  "passes": {
    // Detection
    "intent-detection": true,
    "ambiguity-detection": { "severity": "warning" },
    "missing-context-detection": true,

    // Transformation
    "context-enrichment": true,
    "constraint-extraction": true,
    "goal-role-extraction": true,
    "structure": { "style": "markdown" },
    "output-format-inference": true,
    "task-decomposition": true,

    // Generation
    "final-generation": true,
    "verification": true
  },

  // ── Plugins (M5+) ─────────────────────────────────────────
  "plugins": [],

  // ── Model access (LLM-powered passes; opt-in) ─────────────
  "model": {
    "provider": "none",       // none | opencode | openai-compatible | local
    "maxTokensPerRun": 0,     // 0 = refuse LLM passes
    "timeoutMs": 20000
  },

  // ── Output ────────────────────────────────────────────────
  "output": {
    "diff": true,             // include original-vs-refined diff
    "explanations": true,     // per-change rationale
    "report": "summary",      // none | summary | full
    "assumptionsSection": true // render labeled assumptions in prompt
  },

  // ── Budgets & safety ──────────────────────────────────────
  "limits": {
    "maxPromptBytes": 65536,  // refuse-and-report above this
    "maxPasses": 64           // runaway-plugin guard
  }
}
```

---

## Reference: Config Precedence

When multiple config sources exist, the following order applies (highest wins):

| Level | Source | Example |
|-------|--------|---------|
| 1 (highest) | CLI flags / skill invocation | `--mode expert`, `--no-pass structure` |
| 2 | Project config | `./refine.config.json` |
| 3 | User config | `~/.config/filthy-rich-prompts/refine.config.json` |
| 4 (lowest) | Built-in defaults | All passes enabled, `mode: beginner`, no LLM |

> **Current status:** Only level 1 (plugin options) is wired up. The full 4-level merge is planned for M2.