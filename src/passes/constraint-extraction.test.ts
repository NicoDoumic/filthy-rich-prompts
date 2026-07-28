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
});