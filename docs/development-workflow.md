# Development Workflow

> Status: **Active** — applies from the first code PR (Phase 1).

Trunk-based development, small PRs, Conventional Commits, green CI or it doesn't merge. This document is the operational companion to [CONTRIBUTING.md](../CONTRIBUTING.md) (which is written for outside contributors; this one is the maintainer-grade detail).

---

## 1. Branch Model

- **`main`** — protected, always releasable. Direct pushes disabled, including for maintainers.
- **Short-lived branches** off `main`, named `<type>/<slug>`:
  - `pass/` new refinement passes · `feat/` features · `fix/` bugs · `docs/` documentation · `chore/` tooling/deps · `eval/` benchmark & dataset work
- Lifespan target: **< 3 days**. If a branch lives longer, it's too big — split it. Long-lived feature branches are how pass-interaction bugs are born.
- **Squash merge** only. `main` history is one commit per PR, titled with the Conventional Commit of the PR. Individual WIP commits belong to the branch, not to history.

## 2. Commits

[Conventional Commits](https://www.conventionalcommits.org/), enforced in CI by a PR-title check (`.github/workflows/pr-title.yml`) — we squash-merge, so the PR title _is_ the commit message on `main`, which makes the title the correct thing to lint (implemented in Phase 1; this supersedes the earlier "commitlint" wording, same contract):

```
feat(passes): add constraint-extraction pass
fix(core): preserve trailing newline in structure pass
docs(architecture): clarify phase-70 mutation rule
test(golden): add bug-report fixture 004
chore(ci): add windows to test matrix
```

- Scopes: `core`, `passes`, `cli`, `tui`, `config`, `plugins`, `eval`, `docs`, `ci`, `release`
- Breaking changes: `!` suffix + `BREAKING CHANGE:` footer — feeds the changelog and version bump automatically via changesets
- Commits are _narrative_: the message says **why**, the diff says what

## 3. Pull Requests

| Requirement | Detail                                                                                                                         |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Template    | [PULL_REQUEST_TEMPLATE.md](../.github/PULL_REQUEST_TEMPLATE.md) — the intent-preservation section is mandatory, not decorative |
| Size        | Target ≤ 300 lines changed. Larger needs an explicit "why this can't be split" note                                            |
| Reviews     | 1 maintainer approval (2 for `area: core` or `breaking` changes)                                                               |
| CI          | All jobs green (see [testing-strategy.md §6](testing-strategy.md))                                                             |
| Changeset   | Required for anything affecting the published package ([versioning.md](versioning.md))                                         |
| Docs        | Behavior/config/API change without docs update = request changes                                                               |

**Review priority order** (reviewers check in this sequence):

1. Intent preservation & information loss
2. Explanation completeness
3. Pass composability & contract conformance
4. Tests
5. Docs
6. Style (delegated to the linter; humans don't litigate formatting)

## 4. Triage Rhythm

- **Weekly:** maintainers sweep `status: needs-triage` — every issue gets a type/area/priority label and either acceptance, a question, or a respectful close.
- **Good first issues:** curated monthly; each must have a clear scope, pointers to relevant code/docs, and a named maintainer to ping. A bad "good first issue" is worse than none.
- **Stale policy:** issues auto-marked stale after 90 days inactive, closed 14 days later _unless labeled `status: accepted` or `pinned`_. We close with a comment explaining reopening is welcome — stale-bot is a janitor, not a rejection.

## 5. Decision-Making

| Decision class                     | Who decides | How                                                                                                     |
| ---------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------- |
| Pass proposals                     | maintainers | review against [pass proposal template](../.github/ISSUE_TEMPLATE/03-pass-proposal.yml) criteria        |
| Core architecture changes          | maintainers | design doc PR + comment period (7 days)                                                                 |
| Public API / config schema changes | maintainers | `breaking` label + changeset + comment period                                                           |
| New dependencies in core           | maintainers | must argue against the zero-dep rule ([coding-standards.md](coding-standards.md)); default answer is no |
| Philosophy/principle changes       | maintainers | RFC discussion; these change the project's identity, so the bar is "near-unanimous"                     |

When maintainers disagree: the principles in [design-philosophy.md](design-philosophy.md) are the tiebreaker, in order. If principles don't resolve it, the more conservative option (less change, less magic) wins by default.

## 6. Local Development (Phase 1 preview)

```bash
git clone <fork> && cd filthy-rich-prompts
corepack enable && pnpm install        # pnpm via corepack, version pinned in packageManager
# (corepack is unbundled from Node 25+; there: npx pnpm@10.13.1 install)
pnpm test                              # unit + golden + property
pnpm test:watch                        # TDD loop
pnpm lint && pnpm typecheck
pnpm coverage                          # coverage gates (95% core / 90% passes)
node scripts/update-goldens.mjs        # regenerate golden fixtures (justify changes in PR)
```

Node: active LTS (`.nvmrc` pinned). Package manager: **pnpm** (fast, strict, workspace-ready for the eventual core/cli/tui split). No global installs required beyond Node + corepack.

## 7. Release Cadence Hook

Workflow feeds releases: changesets accumulate on `main`; the release workflow ([release-strategy.md](release-strategy.md)) turns them into versioned releases without manual changelog editing. Contributors never touch version numbers; the machine does.
