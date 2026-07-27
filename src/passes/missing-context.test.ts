/**
 * Tests for missing-context detection (phase 20, detection).
 *
 * Covers: each context category emits a diagnostic when absent, no diagnostics
 * when all context is present, and the pass never mutates the prompt.
 */
import { describe, expect, it } from "vitest";
import { missingContextDetection } from "./missing-context.js";
import { initialContext } from "../core/context.js";
import type { PassContext, ResolvedConfig } from "../core/types.js";

const EMPTY_CONFIG: ResolvedConfig = {
  passes: {},
  toolVersion: "test",
};

function ctxOf(prompt: string): PassContext {
  return initialContext(prompt, EMPTY_CONFIG);
}

async function codesFor(prompt: string): Promise<string[]> {
  const result = await missingContextDetection.run(ctxOf(prompt));
  return (result.diagnostics ?? []).map((d) => d.code);
}

describe("missing-context detection", () => {
  it("emits diagnostics for a bare prompt with no context", async () => {
    const codes = await codesFor("fix the thing");
    expect(codes.length).toBeGreaterThanOrEqual(5);
    expect(codes).toContain("MISSING_ENVIRONMENT");
    expect(codes).toContain("MISSING_SCOPE");
    expect(codes).toContain("MISSING_REPRODUCTION");
  });

  it("emits no diagnostics when all context is present", async () => {
    const codes = await codesFor(
      "Using React 18.2 on Node 22. The app crashes when I click export. Steps to reproduce: 1. Open dashboard 2. Click export button. Expected: CSV downloads. Actual: white screen. This is for our internal team. Scope: just the export feature. Must be secure and handle 10MB files. Output as JSON.",
    );
    expect(codes).not.toContain("MISSING_ENVIRONMENT");
    expect(codes).not.toContain("MISSING_VERSION");
    expect(codes).not.toContain("MISSING_SCOPE");
    expect(codes).not.toContain("MISSING_AUDIENCE");
    expect(codes).not.toContain("MISSING_CONSTRAINTS");
    expect(codes).not.toContain("MISSING_REPRODUCTION");
    expect(codes).not.toContain("MISSING_OUTPUT_FORMAT");
  });

  it("detects environment context from stack mentions", async () => {
    const codes = await codesFor("we use python and postgresql, fix the query");
    expect(codes).not.toContain("MISSING_ENVIRONMENT");
  });

  it("detects version context from semver patterns", async () => {
    const codes = await codesFor("upgrade from v2.1.0 to v3.0.0");
    expect(codes).not.toContain("MISSING_VERSION");
  });

  it("detects scope from boundary language", async () => {
    const codes = await codesFor("only fix the login, don't touch the dashboard");
    expect(codes).not.toContain("MISSING_SCOPE");
  });

  it("detects audience from explicit mention", async () => {
    const codes = await codesFor("write this for beginner developers");
    expect(codes).not.toContain("MISSING_AUDIENCE");
  });

  it("detects constraints from requirement language", async () => {
    const codes = await codesFor("must be under 200ms and compatible with IE11");
    expect(codes).not.toContain("MISSING_CONSTRAINTS");
  });

  it("detects reproduction from step patterns", async () => {
    const codes = await codesFor("when I click save, the app crashes");
    expect(codes).not.toContain("MISSING_REPRODUCTION");
  });

  it("detects output format from format language", async () => {
    const codes = await codesFor("return the result as a markdown table");
    expect(codes).not.toContain("MISSING_OUTPUT_FORMAT");
  });

  it("never mutates the prompt (detection pass)", async () => {
    const result = await missingContextDetection.run(ctxOf("test prompt"));
    expect(result.prompt).toBeUndefined();
  });

  it("returns metadata with findings", async () => {
    const result = await missingContextDetection.run(ctxOf("fix the thing"));
    expect(result.metadata).toBeDefined();
    expect(result.metadata!["missing-context-detection:findings"]).toBeDefined();
  });
});