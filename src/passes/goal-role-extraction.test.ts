import { describe, expect, it } from "vitest";
import { goalRoleExtraction } from "./goal-role-extraction.js";
import { initialContext } from "../core/context.js";
import type { PassContext, ResolvedConfig } from "../core/types.js";

const EMPTY_CONFIG: ResolvedConfig = { passes: {}, toolVersion: "test" };
function ctxOf(prompt: string): PassContext {
  return initialContext(prompt, EMPTY_CONFIG);
}

describe("goal & role extraction", () => {
  it("adds objective and role sections", async () => {
    const ctx = ctxOf("Fix the login bug using react");
    // Simulate intent detection having run
    const result = await goalRoleExtraction.run(ctx);
    expect(result.prompt).toBeDefined();
    expect(result.prompt).toContain("## Objective");
    expect(result.prompt).toContain("## Role");
    expect(result.explanations).toBeDefined();
    expect(result.explanations!.length).toBeGreaterThanOrEqual(2);
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