import { describe, expect, it } from "vitest";
import { outputFormatInference } from "./output-format.js";
import { initialContext } from "../core/context.js";
import type { PassContext, ResolvedConfig } from "../core/types.js";

const EMPTY_CONFIG: ResolvedConfig = { passes: {}, toolVersion: "test" };
function ctxOf(prompt: string): PassContext {
  return initialContext(prompt, EMPTY_CONFIG);
}

describe("output format inference", () => {
  it("adds output format section when no format specified", async () => {
    const result = await outputFormatInference.run(ctxOf("Fix the login bug"));
    expect(result.prompt).toBeDefined();
    expect(result.prompt).toContain("## Output Format");
    expect(result.explanations).toBeDefined();
  });

  it("detects code format from cues", async () => {
    const result = await outputFormatInference.run(ctxOf("Write a function to fix the login"));
    expect(result.prompt).toBeDefined();
    expect(result.prompt).toContain("code");
  });

  it("returns no-op for empty prompts", async () => {
    const result = await outputFormatInference.run(ctxOf(""));
    expect(result.prompt).toBeUndefined();
  });

  it("returns no-op when output format is already specified", async () => {
    const result = await outputFormatInference.run(ctxOf("# Task\n\n## Output Format\n\nList"));
    expect(result.prompt).toBeUndefined();
  });
});