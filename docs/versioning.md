# Versioning Strategy

> Status: **Active** — applies from the first published release (`v0.1.0`, end of Phase 1).

---

## 1. Scheme

**Semantic Versioning 2.0.0**, with an explicit `0.x` era policy:

| Range    | Meaning                                                                  | Policy                                                                                                                                      |
| -------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `0.x.y`  | pre-1.0, API stabilizing                                                 | **minor** (`0.x`) may contain breaking changes (always documented in the changelog with migration notes); **patch** (`0.x.y`) is fixes only |
| `1.0.0`  | public API freeze: pass contract, config schema, CLI commands/exit codes | full SemVer: breaking = major, features = minor, fixes = patch                                                                              |
| post-1.0 | stability era                                                            | deprecations span a full major cycle ([plugin-api.md §7](plugin-api.md))                                                                    |

We commit to honesty over version-shyness: if it breaks users, the major number moves, even if the change is small.

## 2. What the Version Covers (and Doesn't)

**Covered by SemVer** (breaking changes require major post-1.0):

- The `Pass` / `PassContext` / `PassResult` / `RefinementReport` contracts
- The `refine.config.json` schema (removing/renaming fields or changing semantics)
- CLI command names, flags, exit codes, and stdout/stderr contracts ([cli-design.md](cli-design.md))
- The public programmatic API (`refine()`, registry)

**Explicitly NOT covered:**

- **Refinement output content.** Pass improvements change refined output between versions — that's the product improving, not an API break. Version-to-version output stability is not guaranteed (see [open-questions.md Q11](open-questions.md)); _within_ a version, the deterministic track is reproducible.
- Diagnostic _wording_ (codes are stable, messages may improve)
- Benchmark scores and baselines

This distinction is documented prominently because "my golden file changed after upgrade" would otherwise be our most common non-bug report.

## 3. Changesets-Driven Workflow

We use [changesets](https://github.com/changesets/changesets) — the version is derived from intent declared at PR time, never hand-edited:

1. A PR affecting the published package includes a `.changeset/<name>.md`: bump type (`patch`/`minor`/`major`) + a user-facing summary line.
2. CI fails PRs that touch `src/` without a changeset (with an allow-label for docs/test-only PRs).
3. The release workflow aggregates changesets → bumps version → generates `CHANGELOG.md` entries → tags → publishes (see [release-strategy.md](release-strategy.md)).

**Choosing the bump (0.x era):** breaking contract change → `minor`; new pass or feature → `minor`; fixes, docs, internal refactors → `patch`. Err upward when unsure — an over-bump costs nothing, an under-bump breaks trust.

## 4. Prereleases

- `next` dist-tag carries prereleases: `0.2.0-next.0`, `0.2.0-next.1`, … cut from `main` on demand.
- TUI/CLI milestones (M3) ship as `-next` first; `latest` only when the milestone's exit criteria pass.
- Prerelease semver ordering is preserved (`-next.N` increments; never reused).

## 5. Changelog

- `CHANGELOG.md` is **generated** from changesets (Keep a Changelog format); hand edits to released sections are forbidden, edits to `Unreleased` are fine.
- Every breaking entry must include a **migration note**: what breaks, why, exactly what to change. A breaking change without a migration note is an unfinished PR.
