---
"filthy-rich-prompts": minor
---

Pre-release: **OpenCode auto-refine hook** — with `autoRefine: true`, every outgoing OpenCode prompt passes through the refiner before reaching the model (`experimental.chat.messages.transform`, self-contained `dist/opencode-plugin.js`, core inlined, zero deps). Blocking diagnostics append an `## Open questions` section so the model asks for missing context before executing. Toggle via plugin options or minimal `refine.config.json` (`autoRefine` only — strict JSON, M2 subset); default off. Includes `refine-outgoing` (pure hook logic), `min-config` (minimal loader), 22 hook tests, standalone plugin bundle smoke test, and CI step. `structure` remains PROVISIONAL against the Tier 0 gate (see release notes).
