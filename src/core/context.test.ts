import { describe, expect, it } from "vitest";
import {
  applyResult,
  deepFreeze,
  initialContext,
  UNKNOWN_INTENT,
} from "./context.js";
import type { ResolvedConfig } from "./types.js";

const config: ResolvedConfig = { passes: {}, toolVersion: "0.0.0-test" };

describe("initialContext", () => {
  it("starts with current === raw and unknown intent", () => {
    const ctx = initialContext("fix the bug", config);
    expect(ctx.raw).toBe("fix the bug");
    expect(ctx.current).toBe("fix the bug");
    expect(ctx.intent).toEqual(UNKNOWN_INTENT);
    expect(ctx.diagnostics).toEqual([]);
    expect(ctx.explanations).toEqual([]);
    expect(ctx.assumptions).toEqual([]);
    expect(ctx.metadata).toEqual({});
  });

  it("is deeply frozen (D5)", () => {
    const ctx = initialContext("prompt", config);
    expect(Object.isFrozen(ctx)).toBe(true);
    expect(Object.isFrozen(ctx.diagnostics)).toBe(true);
    expect(Object.isFrozen(ctx.intent)).toBe(true);
    expect(Object.isFrozen(ctx.metadata)).toBe(true);
    expect(() => {
      // @ts-expect-error — deliberate mutation attempt
      ctx.current = "tampered";
    }).toThrow();
  });
});

describe("applyResult", () => {
  it("produces a new snapshot without mutating the previous one", () => {
    const ctx = initialContext("raw prompt", config);
    const next = applyResult(ctx, { prompt: "refined prompt" });
    expect(next.current).toBe("refined prompt");
    expect(next.raw).toBe("raw prompt");
    expect(ctx.current).toBe("raw prompt");
  });

  it("keeps current when the result has no prompt (no-op)", () => {
    const ctx = initialContext("same", config);
    const next = applyResult(ctx, {});
    expect(next.current).toBe("same");
  });

  it("appends diagnostics, explanations, assumptions and merges metadata and intent", () => {
    const ctx = initialContext("x", config);
    const withDiag = applyResult(ctx, {
      diagnostics: [
        { pass: "p1", severity: "info", code: "C1", message: "first" },
      ],
      metadata: { "p1:key": 1 },
      intent: { category: "coding", confidence: 0.8 },
    });
    const withMore = applyResult(withDiag, {
      diagnostics: [
        { pass: "p2", severity: "warning", code: "C2", message: "second" },
      ],
      explanations: [{ pass: "p2", change: "c", reason: "r" }],
      assumptions: [
        { pass: "p2", statement: "s", confidence: "low", basis: "b" },
      ],
      metadata: { "p2:key": 2 },
      intent: { confidence: 0.9 },
    });
    expect(withMore.diagnostics.map((d) => d.code)).toEqual(["C1", "C2"]);
    expect(withMore.explanations).toHaveLength(1);
    expect(withMore.assumptions).toHaveLength(1);
    expect(withMore.metadata).toEqual({ "p1:key": 1, "p2:key": 2 });
    expect(withMore.intent).toEqual({ category: "coding", confidence: 0.9 });
  });

  it("returns frozen snapshots", () => {
    const next = applyResult(initialContext("x", config), {
      diagnostics: [{ pass: "p", severity: "info", code: "C", message: "m" }],
    });
    expect(Object.isFrozen(next)).toBe(true);
    expect(Object.isFrozen(next.diagnostics)).toBe(true);
    expect(Object.isFrozen(next.diagnostics[0])).toBe(true);
  });
});

describe("deepFreeze", () => {
  it("handles null, primitives, and nested structures", () => {
    expect(deepFreeze(null)).toBe(null);
    expect(deepFreeze(42)).toBe(42);
    const nested = { a: [{ b: "c" }] };
    deepFreeze(nested);
    expect(Object.isFrozen(nested.a)).toBe(true);
    expect(Object.isFrozen(nested.a[0])).toBe(true);
  });
});
