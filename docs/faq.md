# Frequently Asked Questions

---

## 1. What's the difference between "filthy-rich-prompts" and "prompt-refiner"?

Two names, one project.

- **`filthy-rich-prompts`** is the brand — the GitHub repository, npm package, and CLI binary (`frp`).
- **`prompt-refiner`** is the technical skill name — what OpenCode displays in its skill list, what you type to invoke it, and what appears in config keys.

This is explained in [README.md#the-name](../README.md#the-name).

---

## 2. Does this send my prompts to an external API?

**Not by default.** The core pipeline (all 11 built-in passes) is heuristic-only — pure TypeScript, zero network requests, runs entirely offline.

LLM-powered passes are opt-in: they require explicit configuration (`model.provider` in `refine.config.json`) and the pass must declare `requiresLLM: true`. Without that config, nothing leaves your machine.

See [design-philosophy.md §8](design-philosophy.md#8-local-first-model-agnostic) and [configuration.md §5](configuration.md#5-environment-variables).

---

## 3. Can I use this without OpenCode?

**Currently, no.** The primary integration surface is OpenCode, either as a manually-invoked skill (SKILL.md) or as an auto-refine plugin.

The CLI (`frp`) and standalone library API are planned for a future release (see [ROADMAP.md](../ROADMAP.md)). Until then, the `refine()` function is exported from the package and usable programmatically if you build your own integration.

---

## 4. Will this work with any LLM?

**Yes.** The refinement pipeline is model-agnostic by design. It outputs canonical markdown instructions that any capable LLM can execute. There is no model-specific tuning in the default passes.

A future `structure.style` option will support alternative output formats (XML, plain). See [open-questions.md Q3](open-questions.md#q3-model-agnostic-output-vs-model-tuned-output).

---

## 5. How is this different from other prompt improvers?

Most "prompt improvers" are single LLM calls that rewrite your prompt from scratch — changing intent, inventing requirements, and dropping information without explanation.

filthy-rich-prompts is different in every dimension:

| Other tools | filthy-rich-prompts |
|-------------|---------------------|
| One big rewrite | Pipeline of small, composable passes |
| Black box — no explanation | Every change carries a one-line reason |
| Can silently change intent | Intent preservation is the #1 invariant |
| Requires an LLM | Heuristic-only mode works fully offline |
| No plugin model | Extensible via community passes (M5) |

See [README.md#what-it-is--what-it-is-not](../README.md#what-it-is--what-it-is-not) and [design-philosophy.md](design-philosophy.md).

---

## 6. What happens if a pass crashes?

**Nothing bad.** The engine catches all exceptions from individual passes, records a `blocking` diagnostic, and continues the pipeline with the last good prompt. One bad pass never loses your prompt.

If every pass fails, the output is the original raw prompt plus a report of what failed. Refinement is never worse than doing nothing.

See [architecture.md §8](architecture.md#8-error-handling-philosophy).

---

## 7. Can I write my own passes?

**Yes — and that's the whole point.** The project is designed for community contributions. The most valuable contribution you can make is a new refinement pass.

Start with:
1. [CONTRIBUTING.md](../CONTRIBUTING.md) — how to propose and implement a pass
2. [docs/architecture.md §4.3](../docs/architecture.md#43-the-pass-contract) — the Pass contract
3. [docs/plugin-api.md](../docs/plugin-api.md) — the plugin API (stabilizes at M5)

The plugin API for third-party distribution ships at M5/1.0, but passes can be contributed to the built-in set at any time.

---

## 8. How do I disable auto-refine temporarily?

**Per-session:** OpenCode's `/refine off` command (available in v0.2.0-next.0).

**Config toggle:** Set `"autoRefine": false` in `opencode.json` and restart OpenCode:

```json
{
  "plugin": [["path/to/plugin.js", { "autoRefine": false }]]
}
```

**Hard disable:** Remove the plugin entry from `opencode.json` entirely.

The skill itself (manual invocation via `prompt-refiner`) remains available regardless of the auto-refine setting.

---

## 9. Is there a CLI yet?

**Not yet.** The `frp` binary (`frp refine`, `frp lint`, `frp doctor`) is planned for M3. See [docs/cli-design.md](../docs/cli-design.md) for the full command surface.

Until then, the primary interface is the OpenCode skill and the programmatic `refine()` API.

---

## 10. When is 1.0 coming?

**When the following are complete:**

- [ ] CLI + TUI (M3)
- [ ] Evaluation harness with benchmark dataset (M4)
- [ ] Plugin API with 3 reference plugins (M5)
- [ ] CI green on GitHub runners across the full OS × Node matrix
- [ ] Independent verification that a new contributor can install and use the tool from docs alone

No dates. We optimize for correctness over speed. See [PLAN.md](../PLAN.md) for the detailed path.