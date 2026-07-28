/**
 * Tests for context enrichment (phase 30, transformation).
 *
 * Covers: extracting context sentences, adding assumptions, no-op when no
 * context cues are present, and mutating the prompt.
 */
import { describe, expect, it } from "vitest";
import { contextEnrichment } from "./context-enrichment.js";
import { ctxOf } from "../../tests/helpers/ctxOf.js";

describe("context enrichment", () => {
  it("extracts context sentences into a ## Context section", async () => {
    const result = await contextEnrichment.run(
      ctxOf("Fix the login bug. using react + node btw"),
    );
    expect(result.prompt).toBeDefined();
    expect(result.prompt).toContain("## Context");
    expect(result.prompt).toContain("using react + node btw");
    expect(result.prompt).toContain("# Task");
    expect(result.explanations).toBeDefined();
    expect(result.explanations!.length).toBeGreaterThanOrEqual(1);
  });

  it("adds labeled assumptions for recognized technologies", async () => {
    const result = await contextEnrichment.run(
      ctxOf("Using react and node, fix the dashboard. btw we use postgresql"),
    );
    expect(result.prompt).toBeDefined();
    const prompt = result.prompt!;
    expect(prompt).toContain("[assumption:");
    expect(prompt).toContain("Frontend framework");
    expect(prompt).toContain("Runtime");
    expect(prompt).toContain("Database");
  });

  it("returns no-op when no context cues are present", async () => {
    const result = await contextEnrichment.run(
      ctxOf("Fix the login bug"),
    );
    expect(result.prompt).toBeUndefined();
    expect(result.explanations).toBeUndefined();
  });

  it("returns no-op for empty prompts", async () => {
    const result = await contextEnrichment.run(ctxOf(""));
    expect(result.prompt).toBeUndefined();
  });

  it("returns no-op for prompts with existing headings", async () => {
    const result = await contextEnrichment.run(
      ctxOf("# Task\n\nFix the login bug. using react btw"),
    );
    // Structured prompts should not be mutated by context enrichment
    expect(result.prompt).toBeUndefined();
  });

  it("adds metadata with context sentence and assumption counts", async () => {
    const result = await contextEnrichment.run(
      ctxOf("Fix the bug. using react btw"),
    );
    expect(result.metadata).toBeDefined();
    expect(result.metadata!["context-enrichment:context-sentences"]).toBe(1);
    expect(result.metadata!["context-enrichment:assumptions"]).toBeGreaterThanOrEqual(1);
  });
});