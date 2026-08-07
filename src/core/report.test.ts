import { describe, expect, it } from "vitest";
import { initialContext, applyResult } from "./context.js";
import { buildReport } from "./report.js";
import type { ResolvedConfig } from "./types.js";

const config: ResolvedConfig = { passes: {}, toolVersion: "9.9.9-test" };

describe("buildReport", () => {
  it("aggregates version, pass runs, intent, diagnostics, explanations, assumptions", () => {
    let ctx = initialContext("raw", config);
    ctx = applyResult(ctx, {
      intent: { category: "coding", confidence: 0.7 },
      diagnostics: [{ pass: "p", severity: "info", code: "X", message: "m" }],
      explanations: [{ pass: "p", change: "c", reason: "r" }],
      assumptions: [
        { pass: "p", statement: "s", confidence: "high", basis: "b" },
      ],
    });
    const report = buildReport(ctx, [
      { id: "p", phase: 10, kind: "detection", status: "applied" },
    ]);
    expect(report.toolVersion).toBe("9.9.9-test");
    expect(report.passRuns).toHaveLength(1);
    expect(report.intent.category).toBe("coding");
    expect(report.diagnostics[0]?.code).toBe("X");
    expect(report.explanations).toHaveLength(1);
    expect(report.assumptions).toHaveLength(1);
  });

  it("is JSON-serializable and contains no timing fields (D8)", () => {
    const report = buildReport(initialContext("raw", config), []);
    const parsed = JSON.parse(JSON.stringify(report)) as Record<
      string,
      unknown
    >;
    expect(Object.keys(parsed).sort()).toEqual(
      [
        "assumptions",
        "diagnostics",
        "explanations",
        "intent",
        "passRuns",
        "toolVersion",
      ].sort(),
    );
  });

  it("includes the mode in the report when configured", () => {
    const ctx = initialContext("raw", { ...config, mode: "beginner" });
    const report = buildReport(ctx, []);
    expect(report.mode).toBe("beginner");
  });
});
