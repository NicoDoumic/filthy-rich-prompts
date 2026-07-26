# Before/After: Research Request

Category: `research` · Difficulty: gnarly (decision question with hidden context dependencies)

---

## Raw prompt

> can you look into whether we should switch from postgres to sqlite for our saas

## Refined prompt

```markdown
# Research Request: Evaluate migrating the product's database from PostgreSQL to SQLite

## Decision to inform

Should our SaaS product migrate from PostgreSQL to SQLite? Deliver a recommendation with reasoning — not just a comparison.

## Context (stated by requester)

- Current database: PostgreSQL
- Product type: SaaS (multi-user, hosted)

## Comparison axes to cover

1. Concurrency model — multi-tenant write/read patterns vs. SQLite's single-writer design
2. Operational model — backups, replication, failover, monitoring for a hosted product
3. Scaling ceiling — connection limits, database size, concurrent tenants
4. Migration cost — schema differences, data migration, application-layer changes, rollback strategy
5. Total cost of ownership — hosting, ops time, failure modes
6. When SQLite _is_ the right answer (embedded, single-tenant, edge/replica patterns like LiteFS) — steelman the switch

## Constraints (inferred — confirm or reject)

- This is a production, revenue-bearing product: availability and data-safety requirements are assumed high
- "Should we switch" implies a go/no-go recommendation is the deliverable, with conditions under which the answer changes

## Assumptions made (labeled — correct if wrong)

- Multi-tenant: "our SaaS" suggests shared infrastructure, which is the single biggest factor against SQLite as primary store
- Team has PostgreSQL operational experience already (they run it today)

## Deliverable format (inferred)

1. Recommendation (switch / don't switch / switch only under conditions X)
2. Evidence per comparison axis
3. Risks of each path
4. If relevant: architectures where SQLite plays a role _without_ replacing PostgreSQL
```

---

## What changed, and why

| #   | Change                                                  | Pass (phase)                 | Why                                                                                                                                                                                                                                          |
| --- | ------------------------------------------------------- | ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Question → explicit `## Decision to inform`             | goal-extraction (40)         | "Look into whether" is open-ended; naming the decision converts wandering research into an answerable question with a stopping condition                                                                                                     |
| 2   | "Deliver a recommendation, not just a comparison"       | output-format-inference (50) | The most common failure of research prompts: getting a feature matrix when you needed a verdict. **Labeled as inferred** — but flagged because "should we" strongly implies decision-support                                                 |
| 3   | Comparison axes enumerated                              | context-enrichment (30)      | Postgres→SQLite for SaaS has well-known decisive factors (single-writer, multi-tenant ops); listing them prevents a shallow generic answer. Each axis is _domain structure_, not user requirements — nothing here narrows the question asked |
| 4   | Axis 6 "steelman the switch" added                      | context-enrichment (30)      | Counteracts confirmation bias in the refined prompt itself; a decision brief that only argues one side is advocacy, not research                                                                                                             |
| 5   | Multi-tenant inference → `## Assumptions made`          | ambiguity-detection (20)     | "our SaaS" _probably_ means multi-tenant — and that fact alone nearly decides the question — but "probably" is not "stated". Recorded as a labeled, correctable assumption, exactly per prime directive #2                                   |
| 6   | Constraints labeled inferred                            | constraint-extraction (40)   | Production-SaaS availability expectations are context, not user words; the label preserves the line between their intent and our framing                                                                                                     |
| 7   | "for our saas" → `## Context` with "multi-user, hosted" | context-enrichment (30)      | The two load-bearing properties of SaaS for this decision, surfaced from the user's own term                                                                                                                                                 |

## What was deliberately NOT changed

- **The answer was not pre-loaded.** Nothing in the refined prompt says "SQLite is wrong for this" — the executor must reach that conclusion (or not) from evidence. Pre-loading the answer would be intent drift: the user asked to _look into_ it
- **No team size, scale, or budget invented** — all absent context is in assumptions/questions, not stated as fact
- **The casual tone was not "formalized" into corporate requirements-speak** — a decision brief, not an RFP
- **No timeline imposed** — the user didn't state one

## Diagnostics emitted

| Code                    | Severity | Message                                                                                                                   |
| ----------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------- |
| `MISSING_CONTEXT`       | warning  | Unknown: tenant count, write volume, team size, current pain with Postgres (why is this being considered?)                |
| `HIDDEN_MOTIVATION`     | info     | No stated reason for considering the switch (cost? ops burden? curiosity?) — the motivation shapes which axes matter most |
| `UNDERDETERMINED_SCOPE` | info     | "Switch" could mean full replacement or partial (e.g., per-tenant shards); both readings covered                          |

## Questions interactive mode would ask

1. What's prompting the consideration — cost, operational burden, or something breaking today?
2. Roughly how many tenants / how much write concurrency do you have?
3. Is this a full replacement question, or "where could SQLite fit in our architecture"?

That first question is the highest-value one: a migration evaluation without the _motivation_ answers the wrong question half the time.
