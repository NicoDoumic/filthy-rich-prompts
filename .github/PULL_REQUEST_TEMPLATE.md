<!--
Thanks for contributing. Reviewers check things in this order:
1. Intent preservation  2. Explanation completeness  3. Composability  4. Tests  5. Docs  6. Style (the linter's job)
Help them by filling in §1 and §2 honestly — a fast "yes" there is the fastest path to merge.
-->

## Summary

<!-- What does this PR do, in one or two sentences? Link the issue: Fixes #123 / Implements pass proposal #456 -->

## 1. Intent Preservation (mandatory)

<!-- THE question. Answer for the worst input you can imagine, not the happy path. -->

- [ ] This change cannot alter what a user's prompt asks for
- [ ] This change cannot silently drop information from a prompt (anything removed is accounted for in the report)
- [ ] Any inferred additions are labeled as assumptions/suggestions, never blended in

**Argument:** <!-- 2–4 sentences. Why do the checkboxes above hold? If this PR doesn't touch refinement behavior, say "no refinement behavior change" and explain briefly. -->

## 2. Explanation Completeness

- [ ] Every transformation this change introduces or modifies produces an `Explanation` (engine-enforced) with a _reason_, not just a description
- [ ] User-visible behavior changes are reflected in docs (README / SKILL.md / docs/ / examples/)

## 3. Tests

- [ ] Unit tests added/updated (per-pass logic)
- [ ] Golden fixture(s) added/updated — and every changed golden file is justified below
- [ ] Property invariants still green (`P1–P5`, see docs/testing-strategy.md)
- [ ] Bug fixes include a failing-test-first regression case

**Golden file justifications:** <!-- one line per changed fixture; "drive-by" updates will be rejected -->

## 4. Compatibility

- [ ] No changes to `Pass`/`PassContext`/`PassResult`/config schema/CLI contracts — **or** this PR is labeled `breaking` and includes a changeset with a migration note
- [ ] No new runtime dependencies in `src/core` or `src/passes` (zero-dep rule — see docs/coding-standards.md)

## Changeset

- [ ] Includes a `.changeset/` entry (required for anything touching the published package — see docs/versioning.md), or is labeled `no-changeset` (docs/tests/CI only)

---

<details><summary>🧩 For new refinement passes, also confirm</summary>

- [ ] Pass proposal issue was approved (`status: accepted`) before implementation: #___
- [ ] Kind (detection/transformation/generation) and phase match the proposal
- [ ] Pass no-ops cleanly on inputs it doesn't apply to (returns `{}`)
- [ ] At least one adversarial or tricky input is covered by a test or fixture
- [ ] `frp passes list` metadata (id, description, capabilities) is accurate

</details>
