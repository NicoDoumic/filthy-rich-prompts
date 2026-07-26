# Contributing to filthy-rich-prompts

First: thank you. This project exists to become a community standard, and that only happens with contributors like you.

This document tells you how to contribute effectively — and just as importantly, what this project _believes_, so your contribution fits the design.

---

## The One Rule Above All Others

> **Every contribution must preserve user intent.**

Whether you're writing a pass, fixing docs, or reviewing a PR: if a change could alter what a user asked for, invent requirements, or silently drop information — it will be rejected, no matter how clever it is. Everything else is negotiable. This is not.

Before contributing, read:

1. [docs/design-philosophy.md](docs/design-philosophy.md) — the ten principles
2. [docs/architecture.md](docs/architecture.md) — how the pipeline works
3. [docs/coding-standards.md](docs/coding-standards.md) — how we write code

## Ways to Contribute

| Contribution                               | Where to start                                                                                               |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------ |
| 🧩 **New refinement pass** (highest value) | Open a [pass proposal](.github/ISSUE_TEMPLATE/03-pass-proposal.yml) **before** writing code                  |
| 🐛 Bug reports                             | [Bug report form](.github/ISSUE_TEMPLATE/01-bug-report.yml) — include your raw prompt and the refined output |
| 💡 Feature requests                        | [Feature request form](.github/ISSUE_TEMPLATE/02-feature-request.yml)                                        |
| 📝 Documentation                           | Typos, clarity, examples — small PRs welcome anytime                                                         |
| 🧪 Benchmark prompts                       | See [docs/benchmarking.md](docs/benchmarking.md) for dataset format                                          |
| 👀 Reviews                                 | Thoughtful PR review is a contribution; see review checklist below                                           |

## Proposing a New Refinement Pass

Passes are the heart of this project. The bar for adding one is deliberately high, because every pass must compose safely with all existing passes.

Your proposal must answer:

1. **What does it improve?** (structure / clarity / constraints / objectives / context / terminology / ambiguity / formatting)
2. **What kind is it?** detection (non-mutating), transformation (mutating + explained), or generation.
3. **Why can't it change intent?** Argue it. Show a tricky input and prove the pass preserves meaning.
4. **What phase does it run in, and why?** (See [docs/architecture.md](docs/architecture.md#pass-phases))
5. **Before/after example** with per-change rationale — model it on [examples/before-after/](examples/before-after/).

A maintainer will respond within a few days. Approved proposals get the `status: accepted` label and become implementation issues marked `good first issue` where appropriate.

## Development Workflow

We use **trunk-based development** with short-lived branches. Full details in [docs/development-workflow.md](docs/development-workflow.md); the short version:

1. Fork, then branch from `main`: `git checkout -b pass/ambiguity-detector` (prefixes: `pass/`, `fix/`, `feat/`, `docs/`, `chore/`)
2. Make your change. Follow [docs/coding-standards.md](docs/coding-standards.md).
3. Use [Conventional Commits](https://www.conventionalcommits.org/): `feat(passes): add ambiguity detection pass`
4. Open a PR against `main`. Fill in the template — especially the **intent-preservation checklist**.
5. One maintainer approval + green CI = merge. We squash-merge to keep history readable.

## Labels

Labels are synced from [.github/labels.yml](.github/labels.yml). The taxonomy:

- **`type: *`** — what kind of work it is (`bug`, `feature`, `pass-proposal`, `docs`, `chore`, `benchmark`)
- **`status: *`** — where it stands (`needs-triage`, `accepted`, `in-progress`, `blocked`, `wontfix`)
- **`priority: *`** — `critical`, `high`, `normal`, `low`
- **`area: *`** — `core`, `passes`, `cli`, `tui`, `docs`, `config`, `plugins`, `eval`
- **`good first issue`** / **`help wanted`** — curated entry points for new contributors
- **`breaking`** — anything that changes the pass API, config schema, or CLI contract

Maintainers triage `status: needs-triage` weekly. If your issue sits untouched for more than a week, ping it — that's on us, not you.

## Pull Request Expectations

Every PR must:

- [ ] Preserve intent (the template asks you to argue this explicitly)
- [ ] Include explanations for any user-visible behavior change
- [ ] Add or update tests per [docs/testing-strategy.md](docs/testing-strategy.md)
- [ ] Update docs if behavior, config, or APIs changed
- [ ] Add a changeset if it affects the published package (see [docs/versioning.md](docs/versioning.md))

**Small PRs win.** A 50-line PR gets reviewed in a day; a 2,000-line PR gets reviewed eventually. Split early, split often.

## Reviewing

When reviewing, ask in order:

1. Can this ever change intent, invent requirements, or drop information? → request changes
2. Is every transformation explained? → request changes
3. Does it compose safely with other passes? → discuss
4. Is it well-tested and documented? → suggest
5. Style nits → trust the linter; don't gate on taste

## Reporting Security Issues

If a refinement pass could leak or expose sensitive content from a user's prompt (see the privacy discussion in [docs/open-questions.md](docs/open-questions.md)), **do not open a public issue**. Email the maintainers or use GitHub's private vulnerability reporting. (A `SECURITY.md` will ship with Phase 1.)

## Code of Conduct

This project follows the [Contributor Covenant](CODE_OF_CONDUCT.md). Be kind. Be specific. Assume good intent — in prompts and in people.

## License

By contributing, you agree your contributions are licensed under the project's [MIT License](LICENSE) (inbound = outbound).
