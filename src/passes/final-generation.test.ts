import { describe, expect, it } from "vitest";
import { finalGeneration } from "./final-generation.js";
import { initialContext } from "../core/context.js";
import type { PassContext, ResolvedConfig } from "../core/types.js";

const EMPTY_CONFIG: ResolvedConfig = { passes: {}, toolVersion: "test" };
function ctxOf(prompt: string): PassContext {
  return initialContext(prompt, EMPTY_CONFIG);
}

describe("final generation", () => {
  it("assembles prompt into canonical section order", async () => {
    const result = await finalGeneration.run(
      ctxOf("## Context\n\nusing react\n\n# Task\n\nFix the bug"),
    );
    expect(result.prompt).toBeDefined();
    // # Task should come before ## Context
    const taskIndex = result.prompt!.indexOf("# Task");
    const contextIndex = result.prompt!.indexOf("## Context");
    expect(taskIndex).toBeLessThan(contextIndex);
    expect(result.explanations).toBeDefined();
  });

  it("returns no-op for empty prompts", async () => {
    const result = await finalGeneration.run(ctxOf(""));
    expect(result.prompt).toBeUndefined();
  });
});