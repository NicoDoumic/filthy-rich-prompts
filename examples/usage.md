# Example Usage

> **Status note (Phase 0):** the pipeline is implemented starting in Phase 1 ([ROADMAP.md](../ROADMAP.md)). This page is the _contract_ for how usage will work — written now so implementation has a fixed target, and marked clearly where something doesn't exist yet. The OpenCode smoke test in M1 will verify every claim here against a live install.

---

## 1. As an OpenCode Skill (primary)

**Install** _(verified on OpenCode 1.18.5 — smoke test 2026-07-26)_:

```bash
# Global (available in every project):
mkdir -p ~/.config/opencode/skills/prompt-refiner
cp SKILL.md ~/.config/opencode/skills/prompt-refiner/SKILL.md

# Or per-project (committed to the repo):
mkdir -p .opencode/skills/prompt-refiner
cp SKILL.md .opencode/skills/prompt-refiner/SKILL.md

# Verify OpenCode discovered it:
opencode debug skill
# → lists { "name": "prompt-refiner", "location": ".../skills/prompt-refiner/SKILL.md" }
```

Restart OpenCode after installing — config-time files are not hot-reloaded.

### Smoke test results (M1, OpenCode 1.18.5)

| Check                                                      | Result                                                                                                                                          |
| ---------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Discovery from `~/.config/opencode/skills/<name>/SKILL.md` | ✅ loads, via `opencode debug skill`                                                                                                            |
| Frontmatter `name` matches folder name                     | ✅ required — `prompt-refiner` in `prompt-refiner/`                                                                                             |
| Frontmatter `description` present                          | ✅ required — skills without one are filtered out and never surfaced                                                                            |
| `skill/` vs `skills/` directory name                       | both accepted (`.opencode/skill(s)/`, `~/.config/opencode/skill(s)/`)                                                                           |
| Live invocation in a chat session                          | ⬜ not verified — requires a configured model provider (no credentials in the test environment); the discovery contract above is what M1 needed |

**Invoke:** the skill activates when OpenCode detects a raw request that would benefit from refinement, or when you ask for it explicitly:

```
> refine this before running it: "make the login faster it's broken sometimes"
```

**What you get back** (the [output contract](../SKILL.md#output-contract)):

1. The refined prompt — ready to execute
2. A diff against your original
3. Per-change explanations
4. A report: detected intent, ambiguities, missing context, labeled assumptions, clarifying questions

You then approve the refined prompt (or edit your original and re-refine). **The skill never executes the refined prompt on its own** — it preprocesses; OpenCode executes.

### Modes

| Mode                   | Invocation                       | Behavior                                                       |
| ---------------------- | -------------------------------- | -------------------------------------------------------------- |
| **beginner** (default) | automatic                        | Full explanations, clarifying questions asked conversationally |
| **expert**             | `refine (expert): ...` or config | Terse; only blocking ambiguities raised                        |
| **interactive**        | `refine (interactive): ...`      | Approve/reject each pass's changes                             |
| **silent**             | `refine (silent): ...` or config | No questions; assumptions labeled in the report                |

### Configuration quickstart

Create `refine.config.json` in your project root (full schema: [configuration.md](../docs/configuration.md)):

```jsonc
{
  "mode": "expert",
  "passes": {
    "task-decomposition": true,
    "structure": { "style": "markdown" },
  },
  "output": { "diff": true, "explanations": true },
}
```

## 2. As a CLI (M3 — future)

```bash
# Refine a prompt (stdout = refined prompt only, pipe-safe)
echo "ur app crashed when i clicked export, fix asap" | frp refine

# Lint without transforming (CI-friendly, exits 1 on findings)
frp lint --file prompts/feature-request.md

# See exactly what changed and why
frp refine -f raw.txt --json | frp explain --from-json -

# Interactive TUI: approve/reject pass by pass
frp refine -f raw.txt --interactive

# Audit your setup
frp doctor
```

Full command surface: [cli-design.md](../docs/cli-design.md).

## 3. As a Library (M1+)

```ts
// DESIGN SKETCH — the programmatic API stabilizes at 1.0
import { refine } from "filthy-rich-prompts";

const result = await refine("make the login faster it's broken sometimes");

result.refined; // the refined prompt
result.diff; // original ↔ refined
result.explanations; // one rationale per change, grouped by pass
result.report; // intent, diagnostics, assumptions, questions
```

## 4. What Refinement Looks Like

Four fully worked transformations with per-change rationale:

| Request type     | Example                                                              |
| ---------------- | -------------------------------------------------------------------- |
| Coding request   | [before-after/coding-request.md](before-after/coding-request.md)     |
| Bug report       | [before-after/bug-report.md](before-after/bug-report.md)             |
| Research request | [before-after/research-request.md](before-after/research-request.md) |
| Writing request  | [before-after/writing-request.md](before-after/writing-request.md)   |

Each shows: the raw prompt, the refined prompt, **why every change was made**, what was deliberately _not_ changed, and the questions interactive mode would ask. These four documents double as the specification for the first golden-test fixtures ([testing-strategy.md §3](../docs/testing-strategy.md)) — CI will prove the real pipeline reproduces them.
