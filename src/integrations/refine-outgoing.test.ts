import fc from "fast-check";
import { describe, expect, it } from "vitest";
import type { RefineResult } from "../core/types.js";
import {
  ORIGINAL_HEADING,
  REFINED_HEADING,
} from "../core/discovery.js";
import {
  OPEN_QUESTIONS_HEADING,
  refineOutgoing,
  type RefineFn,
} from "./refine-outgoing.js";

function stubResult(overrides: Partial<RefineResult> = {}): RefineResult {
  return {
    refined: "# Task\n\nstubbed\n",
    diff: [],
    explanations: [{ pass: "structure", change: "c", reason: "r" }],
    report: {
      toolVersion: "0.0.0-test",
      passRuns: [],
      intent: { category: "unknown", confidence: 0 },
      diagnostics: [],
      explanations: [],
      assumptions: [],
    },
    ...overrides,
  };
}

describe("refineOutgoing", () => {
  it("returns byte-identical output when autoRefine is off — and never invokes the engine", async () => {
    let invoked = false;
    const spy: RefineFn = async (raw) => {
      invoked = true;
      return stubResult({ refined: raw });
    };
    const result = await refineOutgoing(
      "fix the login bug",
      { autoRefine: false },
      spy,
    );
    expect(result).toEqual({ text: "fix the login bug", changed: false });
    expect(invoked).toBe(false);
  });

  it("refines raw prose when enabled", async () => {
    const result = await refineOutgoing("write a blog post about tabs", {
      autoRefine: true,
    });
    expect(result.changed).toBe(true);
    expect(result.text).toContain("# Task");
    expect(result.note).toContain("refined by prompt-refiner");
  });

  it("passes through no-op refinements without a note", async () => {
    const structured = "# Task\n\nalready structured\n";
    const result = await refineOutgoing(structured, { autoRefine: true });
    expect(result).toEqual({ text: structured, changed: false });
  });

  it("appends an Open questions section on blocking diagnostics", async () => {
    const withBlocking: RefineFn = async () =>
      stubResult({
        report: {
          toolVersion: "0.0.0-test",
          passRuns: [],
          intent: { category: "unknown", confidence: 0 },
          diagnostics: [
            {
              pass: "missing-context",
              severity: "blocking",
              code: "MISSING_CONTEXT",
              message: "Which database are you on?",
            },
          ],
          explanations: [],
          assumptions: [],
        },
      });
    const result = await refineOutgoing(
      "make it faster",
      { autoRefine: true },
      withBlocking,
    );
    expect(result.text).toContain(OPEN_QUESTIONS_HEADING);
    expect(result.text).toContain("Which database are you on?");
  });

  it("returns the original text when the engine throws (failure doctrine)", async () => {
    const crasher: RefineFn = async () => {
      throw new Error("engine exploded");
    };
    const result = await refineOutgoing(
      "fix the thing",
      { autoRefine: true },
      crasher,
    );
    expect(result).toEqual({ text: "fix the thing", changed: false });
  });

  it("delivers the original AND the refined prompt when changed (dual delivery)", async () => {
    const result = await refineOutgoing("write a blog post about tabs", {
      autoRefine: true,
    });
    expect(result.changed).toBe(true);
    expect(result.original).toBe("write a blog post about tabs");
    expect(result.text).toContain(ORIGINAL_HEADING);
    expect(result.text).toContain("write a blog post about tabs");
    expect(result.text).toContain(REFINED_HEADING);
    expect(result.text).toContain("# Task");
  });

  it("guarantees at least 5 discovery questions in the wire format", async () => {
    const result = await refineOutgoing(
      "make the login faster",
      { autoRefine: true },
    );
    const block = result.text.split(OPEN_QUESTIONS_HEADING)[1] ?? "";
    const numbered = block.match(/^\s*\d+\.\s/mg) ?? [];
    expect(numbered.length).toBeGreaterThanOrEqual(5);
    expect(result.note).toMatch(/\d+ discovery questions/);
  });

  it("omits the original block when includeOriginal is false, keeping the questions", async () => {
    const result = await refineOutgoing(
      "make the login faster",
      { autoRefine: true, includeOriginal: false },
    );
    expect(result.text).not.toContain(ORIGINAL_HEADING);
    expect(result.text).toContain(OPEN_QUESTIONS_HEADING);
    expect(result.text).toMatch(/answer the \d+ questions above/);
  });

  it("honors a custom minQuestions count", async () => {
    const result = await refineOutgoing(
      "make it faster",
      { autoRefine: true, minQuestions: 8 },
    );
    const block = result.text.split(OPEN_QUESTIONS_HEADING)[1] ?? "";
    const numbered = block.match(/^\s*\d+\.\s/mg) ?? [];
    expect(numbered.length).toBeGreaterThanOrEqual(8);
  });

  it("returns empty input untouched", async () => {
    expect(await refineOutgoing("   ", { autoRefine: true })).toEqual({
      text: "   ",
      changed: false,
    });
  });

  it("uses the real engine by default (integration with refine())", async () => {
    const result = await refineOutgoing(
      "can you make it faster? using react btw",
      { autoRefine: true },
    );
    expect(result.changed).toBe(true);
    expect(result.text).toContain("## Context");
  });

  it("preserves every content token of the original (P1 through the hook)", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 3, maxLength: 120 }),
        async (raw) => {
          const result = await refineOutgoing(raw, { autoRefine: true });
          for (const token of raw
            .split(/\s+/)
            .filter((t) => t.trim().length >= 2)) {
            if (!result.text.includes(token)) {
              throw new Error(`lost token "${token}"`);
            }
          }
        },
      ),
      { numRuns: 30 },
    );
  });
});
