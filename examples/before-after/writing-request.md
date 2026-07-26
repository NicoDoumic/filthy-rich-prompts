# Before/After: Writing Request

Category: `writing` · Difficulty: trivial input, deceptive (underspecified in 6 dimensions)

---

## Raw prompt

> write a blog post about why tabs are better than spaces

## Refined prompt

```markdown
# Writing Brief: Blog post arguing that tabs are better than spaces

## Assignment

Write a blog post arguing in favor of tabs over spaces for code indentation.

## Stance (author's — do not balance it away)

- Position: tabs are better than spaces. This is a persuasive piece arguing one side, not a neutral survey.

## Audience (inferred — confirm)

- Software developers familiar with the tabs-vs-spaces debate
- Assumed comfortable with code examples

## Strongest arguments to consider covering

1. Accessibility — tab width is reader-configurable; spaces impose the author's preference on every reader
2. Semantics — one character, one indent level: tabs encode _meaning_, spaces encode _appearance_
3. Consistency across editors/teams — rendering separates from source
4. The strongest counterargument (alignment in multi-line constructs) and an honest rebuttal

## Missing specifications (use placeholders or defaults, and flag them)

1. Length — not specified (suggest 800–1,200 words as a default)
2. Tone — not specified (suggest: opinionated but good-humored; this is a holy war, not a funeral)
3. Title — not specified (propose options)
4. Formatting conventions — headers? code samples? (default: yes to both, it's a dev blog)
5. Call to action — end with a question to readers? a manifesto? (default: invitation to disagree in comments)

## Output format

- Markdown, publishable draft
- Include a proposed title plus 2 alternates
```

---

## What changed, and why

| #   | Change                                                                                      | Pass (phase)                   | Why                                                                                                                                                                                                                                                                                                                        |
| --- | ------------------------------------------------------------------------------------------- | ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Topic sentence → `## Assignment` restating the task verbatim in spirit                      | goal-extraction (40)           | The core ask was complete and correct — restated, not expanded                                                                                                                                                                                                                                                             |
| 2   | `## Stance` section with "do not balance it away"                                           | constraint-extraction (40)     | The #1 failure mode for persuasive writing prompts: the model "both-sides" it into mush. The user said _why tabs are better_ — that's a stance, and protecting it is protecting intent                                                                                                                                     |
| 3   | Arguments enumerated (accessibility, semantics, etc.)                                       | context-enrichment (30)        | **The judgment call.** These are not the user's arguments — they're the canonical pro-tabs points, offered as "consider covering" (a menu, not a requirement). Recorded as enrichment suggestions so the executor argues _well_ without the user having to brief it. The "confirm" framing keeps ownership with the author |
| 4   | Counterargument + rebuttal included as item 4                                               | context-enrichment (30)        | Persuasive writing that ignores the strongest objection is weak; including it _serves_ the user's stance rather than diluting it (contrast with change #2: addressing a counterargument ≠ neutrality)                                                                                                                      |
| 5   | Six underspecified dimensions → `## Missing specifications` with _defaults, not inventions_ | missing-context-detection (20) | Length/tone/title/format/CTA were all absent. Providing labeled defaults ("suggest 800–1,200 words") keeps the prompt executable now while marking every default as replaceable                                                                                                                                            |
| 6   | `## Output format`                                                                          | output-format-inference (50)   | "Blog post" implies markdown publishable draft; title options added because naming is the author's call — options preserve that                                                                                                                                                                                            |

## What was deliberately NOT changed

- **The stance.** Not balanced, not hedged, not "some people prefer." The user picked a side in a holy war; the refined prompt defends their right to fight it
- **No specific arguments attributed to the user.** The brief says "consider covering" — the user may have their own reasons; ours are scaffolding, not script
- **No audience demographics invented** ("junior devs at startups") — one inference (developers, knows the debate) directly from the topic, nothing more
- **The playful register of the request** was matched in the suggested tone default ("holy war, not a funeral") rather than flattened into corporate neutral

## Diagnostics emitted

| Code                    | Severity | Message                                                                     |
| ----------------------- | -------- | --------------------------------------------------------------------------- |
| `MISSING_CONTEXT`       | warning  | Length, tone, title, CTA unspecified — defaults applied, all replaceable    |
| `PERSUASIVE_STANCE`     | info     | One-sided persuasive brief detected; executor instructed to maintain stance |
| `UNDERDETERMINED_SCOPE` | info     | "blog post" length/format conventions vary — defaults flagged               |

## Questions interactive mode would ask

1. How long should it be?
2. Funny or fiery?
3. Is this for your personal blog or a company publication? _(changes tone defaults materially)_

Note how different this refinement is from the bug report: a trivial one-line raw prompt still produced a useful brief — but nearly everything added is _labeled default_, because with writing, the author's taste is the intent.
