import { describe, expect, it } from "vitest";
import { goalRoleExtraction } from "./goal-role-extraction.js";
import { ctxOf } from "../../tests/helpers/ctxOf.js";

describe("goal & role extraction", () => {
  it("adds objective and role sections", async () => {
    const ctx = ctxOf("Fix the login bug using react");
    const result = await goalRoleExtraction.run(ctx);
    expect(result.prompt).toContain("## Objective");
    expect(result.prompt).toContain("Fix the login bug");
    expect(result.prompt).toContain("## Role");
    expect(result.prompt).toMatch(/Expert software engineer|Knowledgeable assistant/);
    expect(result.explanations).toHaveLength(2);
    expect(result.explanations?.[0]?.change).toContain("Objective");
    expect(result.explanations?.[1]?.change).toMatch(/Role|expert role/);
  });

  it("returns no-op for prompts with existing headings", async () => {
    const result = await goalRoleExtraction.run(ctxOf("# Task\n\nFix the bug"));
    expect(result.prompt).toBeUndefined();
  });

  it("returns no-op for empty prompts", async () => {
    const result = await goalRoleExtraction.run(ctxOf(""));
    expect(result.prompt).toBeUndefined();
  });
});