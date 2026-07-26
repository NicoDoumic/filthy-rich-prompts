# Plugin API Design (Future)

> Status: **Proposed design** — stabilized at M5, frozen at 1.0. Until then it may change in `0.x` releases. The `Pass` contract itself is specified in [architecture.md §4.3](architecture.md); this document covers everything _around_ it: authoring, registering, distributing, and trusting third-party passes.

The plugin API is the project's most important long-term surface. Prettier has no plugins (by design); ESLint's plugins made it an ecosystem. We explicitly choose the **ESLint/PostCSS path**: a small stable core, an ecosystem of passes.

---

## 1. Design Goals

1. **A plugin is just a pass (or a pack of passes).** One mental model, one contract.
2. **Zero core changes to add a plugin.** Core never imports plugins; the registry discovers them.
3. **Capabilities are declared, not discovered.** Users can see _before installing_ whether a pass needs an LLM or the network.
4. **Breaking the ecosystem is expensive (for us), not for users.** The API is semver-guaranteed from 1.0; deprecations span a full major cycle.

## 2. Authoring: `definePass()`

Plugins are authored against a factory that provides type inference and validation at authoring time:

```ts
// DESIGN SKETCH — final types ship in Phase 1; definePass() ships in M5
import { definePass } from "filthy-rich-prompts";

export default definePass({
  id: "ticket-reference-extraction",
  description:
    "Detects issue/ticket references (e.g. JIRA-123) and surfaces them as a References section.",
  kind: "transformation",
  phase: 45, // after constraint extraction, before structure
  requiresLLM: false,
  requiresNetwork: false,

  run(ctx) {
    const tickets = findTicketRefs(ctx.current);
    if (tickets.length === 0) return {}; // no-op: returning nothing is always valid
    return {
      prompt: addReferencesSection(ctx.current, tickets),
      explanations: [
        {
          pass: "ticket-reference-extraction",
          change: `Added References section listing ${tickets.join(", ")}`,
          reason:
            "Ticket IDs were embedded in prose where the executing model could miss them.",
        },
      ],
    };
  },
});
```

**Rules every plugin must follow** (enforced by the engine, reviewed in the registry):

- **Pure `run()`** — no module-level mutable state, no side-channel I/O. All model access through `ctx.config.modelProvider`; all network access forbidden unless `requiresNetwork: true`.
- **No-op must be free** — if the pass doesn't apply, return `{}`; never force a change to justify existing.
- **Never read other passes** — communicate only via `ctx.metadata` (namespaced: `metadata['my-plugin:key']`).
- **Explanations are mandatory** for mutations (engine-enforced invariant, not convention).
- **IDs are kebab-case and globally unique** across the public registry.

## 3. Pass Packs

A plugin may export multiple passes (a _pack_). Convention: one default export per package, or a named `passes` array:

```ts
// DESIGN SKETCH
export const passes = [passA, passB, passC];
```

Packs are encouraged for related passes (e.g., `filthy-rich-prompts-pass-jira` might ship detection + transformation together).

## 4. Registration & Discovery

Options considered:

| Mechanism                                               | Tradeoff                                                                    | Verdict             |
| ------------------------------------------------------- | --------------------------------------------------------------------------- | ------------------- |
| Explicit import in a JS/TS config                       | Maximum flexibility; but requires a code config and breaks zero-config      | Later (power users) |
| Auto-discovery from `node_modules` by naming convention | Zero-config magic; but slow, surprising, and a supply-chain footgun         | ❌                  |
| **Declared in `refine.config.json`**                    | Explicit, auditable, diffable in code review; works with zero build tooling | ✅ **recommended**  |

```jsonc
// refine.config.json
{
  "passes": {
    "ticket-reference-extraction": true,
  },
  "plugins": ["filthy-rich-prompts-pass-jira"],
}
```

Resolution order: `plugins` packages are loaded, their passes registered, then per-pass config applies. Local development override: `"plugins": ["./local/my-pass.ts"]` (relative paths load from disk; package names load from `node_modules`).

**Naming convention** (public registry): `filthy-rich-prompts-pass-<name>` for single passes, `filthy-rich-prompts-pack-<name>` for packs. Scoped (`@you/filthy-rich-prompts-pass-x`) is fine for private distribution.

## 5. Lifecycle Hooks (post-M5 candidates)

Passes are deliberately hook-_light_ — the pipeline itself is the lifecycle. Proposed optional hooks for advanced plugins:

| Hook                    | When            | Use case                                   |
| ----------------------- | --------------- | ------------------------------------------ |
| `onPipelineStart(ctx)`  | before phase 10 | precompute shared analysis into `metadata` |
| `onPipelineEnd(report)` | after phase 70  | telemetry, report augmentation             |

Rejected: `onPassStart`/`onPassEnd` per-pass hooks for other passes' executions (breaks the "passes can't see each other" guarantee — a plugin observing the whole pipeline is a trust problem).

## 6. Capability & Trust Model

Third-party code runs with the user's OpenCode privileges, and prompts contain secrets. So:

1. **Declared capabilities** (`requiresLLM`, `requiresNetwork`) are shown at install time and enforced at runtime: a `requiresNetwork: false` pass gets no network access the engine can mediate, and `frp doctor` audits the dependency tree for what the engine _can't_ mediate.
2. **Registry tiers:**
   - ✅ **Verified** — reviewed by maintainers, passes the intent-preservation harness, listed on the docs site
   - 🧪 **Community** — self-published via registry CI (runs golden + adversarial fixtures automatically)
   - ⚠️ **Local/unvetted** — loaded from disk or unlisted packages; CLI warns once per config change
3. **Adversarial fixture suite** (part of M4 eval harness): prompts designed to trick passes into intent drift, instruction injection ("ignore previous rules and..."), and secret exfiltration patterns. Registry CI runs it on every published version.

## 7. Versioning & Compatibility

- Plugins declare a `peerDependency` range on the core, e.g. `"filthy-rich-prompts": "^1.0.0"`.
- The `Pass` contract follows SemVer from 1.0. Additions (new optional fields) are minor; any change to `PassContext`, `PassResult`, or invariant semantics is major.
- **Deprecation policy:** an API marked deprecated keeps working for the entire current major version and is removed no earlier than the next major + 3 months.
- The engine validates plugins at load: incompatible peer range → plugin skipped with a `blocking` diagnostic, never a crash.

## 8. Reference Plugins (to be built by maintainers in M5)

1. `filthy-rich-prompts-pass-jira` — ticket reference extraction (the example above)
2. `filthy-rich-prompts-pass-acceptance-criteria` — suggests (never imposes) testable acceptance criteria for feature requests
3. `filthy-rich-prompts-pack-research` — research-question scoping: hypothesis framing, source-quality requirements, recency constraints

These three exist to (a) prove the API is sufficient for real passes and (b) serve as copy-paste starting points for contributors.

## 9. Open Design Tensions

Tracked in [open-questions.md](open-questions.md): sandboxing strength vs. Node's practical limits; whether local-path plugins should survive in production configs; discovery UX vs. supply-chain minimalism.
