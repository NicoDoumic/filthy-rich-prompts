import { describe, expect, it } from "vitest";
import { constraintExtraction } from "./constraint-extraction.js";
import { ctxOf } from "../../tests/helpers/ctxOf.js";

describe("constraint extraction", () => {
  it("extracts implicit constraints from make-it patterns", async () => {
    const result = await constraintExtraction.run(ctxOf("make it fast and keep it simple"));
    expect(result.prompt).toBeDefined();
    expect(result.prompt).toContain("## Constraints");
    expect(result.prompt).toContain("[constraint: extracted]");
    expect(result.explanations).toBeDefined();
  });

  it("extracts constraints from must-be patterns", async () => {
    const result = await constraintExtraction.run(ctxOf("it should be secure and must be compatible with IE11"));
    expect(result.prompt).toBeDefined();
    expect(result.prompt).toContain("## Constraints");
    expect(result.prompt).toContain("Security");
    expect(result.prompt).toContain("Compatibility");
  });

  it("returns no-op when no constraints are present", async () => {
    const result = await constraintExtraction.run(ctxOf("Fix the login bug"));
    expect(result.prompt).toBeUndefined();
  });

  it("labels a don't-break constraint as Preservation", async () => {
    const result = await constraintExtraction.run(
      ctxOf("make it faster but don't break the login flow"),
    );
    expect(result.prompt).toContain("Preservation");
    expect(result.prompt).toContain("don't break");
  });

  it("labels an uncategorized constraint with the generic prefix", async () => {
    const result = await constraintExtraction.run(
      ctxOf("make this nice"),
    );
    expect(result.prompt).toContain("Constraint:");
  });

  it("deduplicates repeated constraint phrases", async () => {
    const result = await constraintExtraction.run(
      ctxOf("make it fast and make it fast"),
    );
    const matches = result.prompt!.match(/\[constraint: extracted\]/g) ?? [];
    expect(matches.length).toBe(1);
  });
});