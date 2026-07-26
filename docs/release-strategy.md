# Release Strategy

> Status: **Active** — first release (`v0.1.0`) is the Phase 1 exit event.

Releases are boring by design: automated, reversible, and announced only when there's something to say.

---

## 1. Cadence

| Channel             | Cadence                                                                                | Content                                                    |
| ------------------- | -------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| `latest` (stable)   | **monthly minor** train (if changesets are pending) + **on-demand patch** for bugfixes | everything merged since last release                       |
| `next` (prerelease) | on demand, maintainer-triggered                                                        | milestone previews (M3 TUI/CLI, M4 eval harness)           |
| nightly             | none — deliberately                                                                    | `next` is enough; nightlies train users to expect breakage |

The monthly train is a _ceiling on waiting_, not an obligation to ship: no pending changesets → no release that month. Patch releases for correctness bugs (especially intent-preservation bugs — our `priority: critical` class) ship as fast as CI allows, any day.

## 2. The Release Pipeline (automation)

Fully automated via GitHub Actions + changesets:

```
PRs merge with changesets
        │
        ▼
release.yml (scheduled monthly / manual dispatch)
  1. changesets/action opens (or updates) a "Release: vX.Y.Z" PR
     — version bumped, CHANGELOG.md generated, changesets consumed
  2. maintainer reviews & merges the Release PR      ← the only manual step
  3. publish workflow fires on merge:
     a. full test suite + golden + property + benchmark deterministic track
     b. build + npm pack smoke test (install into clean dir, refine one prompt)
     c. npm publish --provenance (SLSA provenance attestation)
     d. git tag vX.Y.Z + GitHub Release with generated notes
     e. post: benchmark report regenerated if pass behavior changed
```

**Provenance and supply-chain:** publishes use npm provenance from GitHub-hosted runners with OIDC — no long-lived npm tokens anywhere. The lockfile is the release artifact's source of truth; `pnpm publish` runs from a clean checkout, never a maintainer laptop.

## 3. Release Readiness Checklist (the Release PR must show)

- [ ] CI fully green on the exact merge commit
- [ ] Deterministic benchmark track at 100% intent preservation, no Tier-1 regressions ([evaluation-metrics.md](evaluation-metrics.md))
- [ ] CHANGELOG entries accurate, breaking changes carry migration notes
- [ ] Docs match behavior (SKILL.md contract, configuration.md schema, cli-design.md surface)
- [ ] For minors: `ROADMAP.md` milestone status updated

## 4. Rollback & Incident Policy

- **Bad release discovered:** `npm deprecate <version> "message"` immediately → patch release with fix → postmortem issue labeled `type: bug, priority: critical`.
- **Intent-preservation bug in a released version** is our severity-1 class: deprecate within hours, not days; the postmortem must add the failing case as a benchmark fixture (fixtures-and-fixes-together rule, [testing-strategy.md](testing-strategy.md)).
- We never `npm unpublish` (breaks dependents silently); deprecation + patch is always the move.

## 5. Announcements

| Release class | Announcement                                                                                  |
| ------------- | --------------------------------------------------------------------------------------------- |
| patch         | GitHub Release notes only                                                                     |
| minor         | Release notes + Discussion post summarizing highlights with before/after examples             |
| major / 1.0   | Full launch treatment: blog-style post, benchmark report, migration guide, community outreach |

Every public announcement follows the house style: lead with a real before/after transformation, link the benchmark evidence, credit contributors by name. We market with demonstrations, not adjectives.

## 6. Version Support Window

- `0.x` era: latest minor only — no backports (moving forward is cheaper than maintaining branches at this stage).
- Post-1.0: latest major fully supported; previous major receives **security and intent-preservation fixes for 6 months** after the new major ships.

## 7. First Release Plan (`v0.1.0`)

1. Phase 1 exit criteria met ([ROADMAP.md](../ROADMAP.md) M1)
2. `npm publish` of `filthy-rich-prompts@0.1.0` with provenance
3. GitHub Release `v0.1.0` titled "Phase 1: core engine + foundational passes"
4. No marketing push — 0.1.0 is for early adopters and OpenCode integration validation; the public push is M5/1.0
