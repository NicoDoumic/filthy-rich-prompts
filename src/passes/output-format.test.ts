import { describe, expect, it } from "vitest";
import { outputFormatInference } from "./output-format.js";
import { ctxOf } from "../../tests/helpers/ctxOf.js";

describe("output format inference", () => {
  it("adds default output format when no cues are found", async () => {
    const result = await outputFormatInference.run(ctxOf("Fix the login bug"));
    expect(result.prompt).toContain("## Output Format");
    expect(result.prompt).toContain("clear, well-structured format");
    expect(result.explanations?.[0]?.change).toContain("default output format");
  });

  it("detects list format", async () => {
    const result = await outputFormatInference.run(ctxOf("give me a bullet list of todos"));
    expect(result.prompt).toContain("a list format");
    expect(result.explanations?.[0]?.change).toContain("list");
  });

  it("detects table format", async () => {
    const result = await outputFormatInference.run(ctxOf("show results in a table"));
    expect(result.prompt).toContain("a table format");
  });

  it("detects code format", async () => {
    const result = await outputFormatInference.run(ctxOf("Write a function to fix the login"));
    expect(result.prompt).toContain("a code format");
  });

  it("detects json format", async () => {
    const result = await outputFormatInference.run(ctxOf("return the data as json"));
    expect(result.prompt).toContain("json format");
  });

  it("detects markdown format", async () => {
    const result = await outputFormatInference.run(ctxOf("write a markdown readme for this project"));
    expect(result.prompt).toContain("markdown format");
  });

  it("detects prose format", async () => {
    const result = await outputFormatInference.run(ctxOf("write a summary of the quarterly earnings report"));
    expect(result.prompt).toContain("a prose format");
  });

  it("detects diagram format", async () => {
    const result = await outputFormatInference.run(ctxOf("draw a mermaid diagram of the architecture"));
    expect(result.prompt).toContain("diagram format");
  });

  it("handles multi-format detection", async () => {
    const result = await outputFormatInference.run(
      ctxOf("write a function and return it as json"),
    );
    expect(result.prompt).toContain("a combination of");
    expect(result.explanations?.[0]?.change).toContain("code");
    expect(result.explanations?.[0]?.change).toContain("json");
  });

  it("returns no-op for empty prompts", async () => {
    const result = await outputFormatInference.run(ctxOf(""));
    expect(result.prompt).toBeUndefined();
  });

  it("returns no-op when Output Format is already specified", async () => {
    const result = await outputFormatInference.run(
      ctxOf("# Task\n\n## Output Format\n\nList"),
    );
    expect(result.prompt).toBeUndefined();
  });

  it("returns no-op when Deliverables heading exists", async () => {
    const result = await outputFormatInference.run(
      ctxOf("## Deliverables\n\n- item 1\n- item 2"),
    );
    expect(result.prompt).toBeUndefined();
  });

  it("returns no-op for already-structured prompts with headings", async () => {
    const result = await outputFormatInference.run(
      ctxOf("# Task\n\nDo something\n\n## Context\n\nSome context"),
    );
    expect(result.prompt).toBeUndefined();
  });
});
