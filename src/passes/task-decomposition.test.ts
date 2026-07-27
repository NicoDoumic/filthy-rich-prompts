import { describe, expect, it } from "vitest";
import { taskDecomposition } from "./task-decomposition.js";
import { initialContext } from "../core/context.js";
import type { PassContext, ResolvedConfig } from "../core/types.js";

const EMPTY_CONFIG: ResolvedConfig = { passes: {}, toolVersion: "test" };
function ctxOf(prompt: string): PassContext {
  return initialContext(prompt, EMPTY_CONFIG);
}

describe("task decomposition", () => {
  it("splits compound requests into sub-tasks", async () => {
    const result = await taskDecomposition.run(
      ctxOf("Fix the login bug. Also update the dashboard. And then add tests."),
    );
    expect(result.prompt).toBeDefined();
    expect(result.prompt).toContain("## Sub-tasks");
    expect(result.prompt).toContain("Sub-task 1");
    expect(result.prompt).toContain("Sub-task 2");
    expect(result.explanations).toBeDefined();
  });

  it("returns no-op for single-task prompts", async () => {
    const result = await taskDecomposition.run(ctxOf("Fix the login bug"));
    expect(result.prompt).toBeUndefined();
  });

  it("returns no-op for empty prompts", async () => {
    const result = await taskDecomposition.run(ctxOf(""));
    expect(result.prompt).toBeUndefined();
  });
});