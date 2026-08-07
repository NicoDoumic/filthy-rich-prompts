# Module: integrations

> `src/integrations/` — the adapters between the core pipeline and host runtimes (OpenCode plugin, CLI config). Documented surface for the module. The dual-delivery wire format is specified in [../dual-delivery.md](../dual-delivery.md).

## Files

| File                | Responsibility                                                                                          |
| ------------------- | ------------------------------------------------------------------------------------------------------- |
| `opencode-plugin.ts` | The self-contained OpenCode plugin: registers `experimental.chat.messages.transform`, mutates the last user message's text. |
| `refine-outgoing.ts` | Pure decision logic for one outgoing prompt: passthrough vs. dual delivery; owns `text`/`changed`/`note`. |
| `config-loader.ts`   | 4-level config resolution (`refine.config.json`), validation, and the min-config adapter for the plugin. |

## Flow

```
user prompt
   │
   ▼
opencode-plugin.ts ── transform hook catches the LAST user message
   │                    autoRefine off? → untouched
   ▼
refine-outgoing.ts  ── refine(raw) ──► RefineResult
   │                    changed? no → passthrough
   │                    yes →
   │                      questions = buildDiscoveryQuestions(diagnostics, minQuestions)
   │                      composeDualDelivery(original, refined, questions)  [includeOriginal]
   │                      OR composeRefinedWithDiscovery(refined, questions) [includeOriginal:false]
   ▼
Outgoing message =  ## Original request (verbatim)
                    ───
                    ## Refined request (execute this)
                    ───
                    ## Open questions (answer N before executing)   ← ≥ minQuestions (default 5)
                    ───
                    bridge note (answer with user, then execute; original wins)
```

## Exports

### `config-loader.ts`
- `resolveConfig(cwd, options?, userConfigPath?)` → `ConfigResult` — merges user → project → programmatic, fail-soft on malformed JSON. New fields: `includeOriginal` (default `true`), `minQuestions` (default `5`, clamped ≥ 1).
- `toResolvedConfig(result, toolVersion)` → `ResolvedConfig` — drops `mode` when the source is `default` (so no explicit mode = no mode post-processing).
- `loadMinConfig(cwd, userConfigPath?)` → `MinConfig` — plugin-facing subset: `autoRefine`, `includeOriginal`, `minQuestions`, `source`, optional `warning`.

### `refine-outgoing.ts`
- `refineOutgoing(rawText, { autoRefine, includeOriginal?, minQuestions? }, refineFn?)` → `RefineOutgoingResult`
  - `text` — composed wire format or the untouched original (any failure / passthrough).
  - `changed` — whether `text` differs from input.
  - `original` / `refined` — structured access to both halves (only set when `changed`).
  - `note` — human label; never set on passthroughs.
  - Errors never throw outward: engine crash → `{ text: rawText, changed: false }` (architecture §8).

### `opencode-plugin.ts`
- default export plugin factory `(input, options?)` → hook table with `experimental.chat.messages.transform`.
  - `PromptRefinerPluginOptions`: `autoRefine`, `includeOriginal`, `minQuestions` — plugin options override the file config.
  - Only the **last** `role === "user"` message is transformed; `String` content or `text` parts; every other shape is a no-op. Frozen messages are left untouched (never worse than no interception).

## Edge cases & limitations

- No multi-turn state: discovery questions are delivered with the same message (single-shot) — the model relays them via OpenCode's question tool. True turn-by-turn discovery is M3/TUI.
- Handles only Boolean/number at the end of the pipe; JSONC (comments) is documented but the loader parses strict JSON.
- The mode post-processing appended by `refine()` (when a mode is configured) is stripped for the wire by `stripAppendedQuestions` so exactly one discovery block is delivered.

## Notas para v2

- `interaction` pass kind (phase 5 `discover`) is specified in [architecture.md §3](../architecture.md) but unbuilt: a real discovery pass would collect `userAnswers` into `PassContext` (types already carry `userAnswers`) and feed them into intent/constraint/output-format passes instead of the single-shot question gate.
- Consider a streaming/typed payload for the two halves of the wire so the TUI/CLI can render `original`/`refined` as separate blocks without parsing headings.
- `minQuestions` clamping and catalog coverage are heuristic; a judged track (M4 harness) should measure whether the ≥5 gate materially reduces mid-task clarification turns.
