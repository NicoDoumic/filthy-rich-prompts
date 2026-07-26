/**
 * Property-based invariants (docs/testing-strategy.md §4) — the intent guard.
 *
 * P1 intent preservation (heuristic proxy): every content token of the raw
 *   input survives into the refined output.
 * P2 idempotence: refine(refine(x)) === refine(x).
 * P3 explanation completeness: every transformation is covered by at least
 *   one Explanation, and every added diff line is scaffolding or a verbatim
 *   span of the input.
 * P4 crash isolation: a throwing pass never loses the prompt.
 * P5 detection purity: detection passes never change the working prompt.
 *
 * Seeds: fixed in CI for reproducibility, random locally (fast-check prints
 * the seed on failure for replay).
 */
import fc from "fast-check";
import { describe, it } from "vitest";
import {
  builtinPasses,
  createRegistry,
  refine,
  runPipeline,
} from "../../src/index.js";
import { ambiguityDetection } from "../../src/passes/ambiguity-detection.js";
import { intentDetection } from "../../src/passes/intent-detection.js";
import type { Pass, ResolvedConfig } from "../../src/core/types.js";
import { promptArb, structuredPromptArb } from "./generators.js";

const config: ResolvedConfig = { passes: {}, toolVersion: "0.0.0-test" };
const SEED = process.env.CI ? 20260726 : undefined;
const RUNS =
  SEED === undefined ? { numRuns: 100 } : { numRuns: 100, seed: SEED };

const SCAFFOLDING = new Set(["# Task", "## Context", ""]);

function contentTokens(text: string): string[] {
  return text.split(/\s+/).filter((token) => token.trim().length >= 2);
}

describe("P1 — intent preservation (information survives)", () => {
  it("every content token of the raw prompt appears in the refined output", async () => {
    await fc.assert(
      fc.asyncProperty(promptArb, async (raw) => {
        const { refined } = await refine(raw);
        for (const token of contentTokens(raw)) {
          if (!refined.includes(token)) {
            throw new Error(
              `lost token "${token}"\nraw:     ${raw}\nrefined: ${refined}`,
            );
          }
        }
      }),
      RUNS,
    );
  });
});

describe("P2 — idempotence", () => {
  it("refining a refined prompt changes nothing further", async () => {
    await fc.assert(
      fc.asyncProperty(promptArb, async (raw) => {
        const first = await refine(raw);
        const second = await refine(first.refined);
        if (second.refined !== first.refined) {
          throw new Error(
            `not idempotent:\nfirst:  ${first.refined}\nsecond: ${second.refined}`,
          );
        }
      }),
      RUNS,
    );
  });

  it("already-structured prompts are returned structurally unchanged", async () => {
    await fc.assert(
      fc.asyncProperty(structuredPromptArb, async (raw) => {
        const { refined } = await refine(raw);
        if (refined !== raw)
          throw new Error(`structured input was mutated:\n${refined}`);
      }),
      RUNS,
    );
  });
});

describe("P3 — explanation completeness", () => {
  it("transformations always carry explanations; added lines are scaffolding or verbatim spans", async () => {
    await fc.assert(
      fc.asyncProperty(promptArb, async (raw) => {
        const { refined, diff, explanations } = await refine(raw);
        const changed = diff.some((line) => line.type !== "same");
        if (changed && explanations.length === 0) {
          throw new Error(`silent transformation on:\n${raw}`);
        }
        for (const line of diff) {
          if (
            line.type === "add" &&
            !SCAFFOLDING.has(line.line.trim()) &&
            !raw.includes(line.line.trim())
          ) {
            throw new Error(
              `invented line "${line.line}" not present in:\n${raw}`,
            );
          }
        }
        if (
          !refined.includes(raw.trim()) &&
          refined.trim().length === 0 &&
          raw.trim().length > 0
        ) {
          throw new Error("prompt was emptied");
        }
      }),
      RUNS,
    );
  });
});

describe("P4 — crash isolation", () => {
  const crasher: Pass = {
    id: "crash-test",
    description: "always throws, for P4",
    kind: "detection",
    phase: 20,
    requiresLLM: false,
    requiresNetwork: false,
    run: () => {
      throw new Error("deliberate P4 crash");
    },
  };

  it("a throwing pass never loses the prompt or the run", async () => {
    await fc.assert(
      fc.asyncProperty(promptArb, async (raw) => {
        const registry = createRegistry([crasher, ...builtinPasses]);
        const result = await runPipeline(registry, raw, config);
        if (typeof result.refined !== "string")
          throw new Error("run lost the prompt");
        if (!result.report.diagnostics.some((d) => d.code === "PASS_CRASH")) {
          throw new Error("crash was not recorded as a diagnostic");
        }
        if (
          result.report.passRuns.find((r) => r.id === "crash-test")?.status !==
          "failed"
        ) {
          throw new Error("crash was not recorded as a failed pass run");
        }
      }),
      RUNS,
    );
  });
});

describe("P5 — detection purity", () => {
  it("detection-only pipelines return the prompt byte-identical", async () => {
    await fc.assert(
      fc.asyncProperty(promptArb, async (raw) => {
        const registry = createRegistry([intentDetection, ambiguityDetection]);
        const result = await runPipeline(registry, raw, config);
        if (result.refined !== raw)
          throw new Error("detection passes mutated the prompt");
      }),
      RUNS,
    );
  });
});
