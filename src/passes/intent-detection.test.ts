import { describe, expect, it } from "vitest";
import { ctxOf } from "../../tests/helpers/ctxOf.js";
import { intentDetection } from "./intent-detection.js";

describe("intent-detection", () => {
  it("classifies a coding request", async () => {
    const result = await intentDetection.run(
      ctxOf("implement a react component for the dashboard"),
    );
    expect(result.intent?.category).toBe("coding");
    expect(result.intent?.confidence).toBeGreaterThan(0);
    expect(result.diagnostics?.[0]?.code).toBe("INTENT_DETECTED");
  });

  it("classifies a bug report", async () => {
    const result = await intentDetection.run(
      ctxOf("the app crashed when i clicked export, it worked yesterday"),
    );
    expect(result.intent?.category).toBe("bug-report");
  });

  it("classifies a research request", async () => {
    const result = await intentDetection.run(
      ctxOf(
        "can you look into whether we should switch from postgres to sqlite",
      ),
    );
    expect(result.intent?.category).toBe("research");
  });

  it("classifies a writing request", async () => {
    const result = await intentDetection.run(
      ctxOf("write a blog post about why tabs are better than spaces"),
    );
    expect(result.intent?.category).toBe("writing");
    expect(result.intent?.goal).toBe(
      "write a blog post about why tabs are better than spaces",
    );
  });

  it("returns unknown with a diagnostic when no cues match", async () => {
    const result = await intentDetection.run(ctxOf("hello there"));
    expect(result.intent?.category).toBe("unknown");
    expect(result.diagnostics?.[0]?.code).toBe("INTENT_UNKNOWN");
  });

  it("refuses to guess on a category tie", async () => {
    // "implement" (coding strong, 2) + "crash" (bug-report strong, 2) = 2:2 tie
    const result = await intentDetection.run(ctxOf("implement crash handling"));
    expect(result.intent?.category).toBe("unknown");
    expect(result.diagnostics?.[0]?.code).toBe("AMBIGUOUS_INTENT");
    expect(result.diagnostics?.[0]?.suggestions?.length).toBeGreaterThan(1);
  });

  it("never mutates the prompt (detection kind)", async () => {
    const result = await intentDetection.run(
      ctxOf("fix the broken api endpoint"),
    );
    expect(result.prompt).toBeUndefined();
  });

  it("publishes scores to metadata for later passes", async () => {
    const result = await intentDetection.run(ctxOf("write a newsletter"));
    expect(result.metadata?.["intent-detection:scores"]).toBeDefined();
  });

  it("falls back to the first sentence when no imperative starter exists", async () => {
    // "api" + "slow" classify as coding, but no sentence starts with an imperative verb
    const result = await intentDetection.run(ctxOf("the api is really slow"));
    expect(result.intent?.category).toBe("coding");
    expect(result.intent?.goal).toBe("the api is really slow");
  });
});
