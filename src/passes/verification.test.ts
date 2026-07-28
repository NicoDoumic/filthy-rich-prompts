import { describe, expect, it } from "vitest";
import { verification } from "./verification.js";
import { applyResult, initialContext } from "../core/context.js";
import { intentDetection } from "./intent-detection.js";
import { ctxOf, EMPTY_CONFIG } from "../../tests/helpers/ctxOf.js";
import type { PassContext } from "../core/types.js";

async function ctxWithIntent(prompt: string): Promise<PassContext> {
  const ctx = initialContext(prompt, EMPTY_CONFIG);
  const intentResult = await intentDetection.run(ctx);
  if (intentResult.intent) {
    return applyResult(ctx, intentResult);
  }
  return ctx;
}

describe("verification", () => {
  it("emits INTENT_VERIFIED when intent is known", async () => {
    const ctx = await ctxWithIntent("Fix the login bug");
    const result = await verification.run(ctx);
    expect(result.diagnostics).toBeDefined();
    const codes = result.diagnostics!.map((d) => d.code);
    expect(codes).toContain("INTENT_VERIFIED");
  });

  it("never mutates the prompt", async () => {
    const result = await verification.run(initialContext("test", EMPTY_CONFIG));
    expect(result.prompt).toBeUndefined();
  });

  it("detects information loss", async () => {
    const longPrompt =
      "The application has a critical bug where users cannot login with their credentials " +
      "because the authentication service is returning an internal server error " +
      "when the database connection pool is exhausted";
    const baseCtx = ctxOf(longPrompt);
    const modifiedCtx = applyResult(baseCtx, { prompt: "Fix the login bug" });
    const result = await verification.run(modifiedCtx);
    expect(result.diagnostics).toBeDefined();
    const codes = result.diagnostics!.map((d) => d.code);
    expect(codes).toContain("INFO_LOSS");
  });

  it("no info loss on identical input", async () => {
    const prompt = "Fix the authentication bug in the login service";
    const ctx = ctxOf(prompt);
    const result = await verification.run(ctx);
    const codes = result.diagnostics?.map((d) => d.code) ?? [];
    expect(codes).not.toContain("INFO_LOSS");
  });

  it("handles empty input gracefully", async () => {
    const ctx = ctxOf("");
    const result = await verification.run(ctx);
    expect(result.diagnostics).toBeDefined();
    expect(Array.isArray(result.diagnostics)).toBe(true);
  });

  it("handles unicode content", async () => {
    const ctx = ctxOf("Fix the login \u{1F510} bug \u2014 users can\u2019t access their \u{1F4BB}");
    const result = await verification.run(ctx);
    expect(result).toBeDefined();
  });

  it("info loss on high loss ratio", async () => {
    const rawPrompt =
      "The application authentication service database connection pool is exhausted " +
      "when many users attempt to login simultaneously during peak hours " +
      "causing severe performance degradation";
    const baseCtx = ctxOf(rawPrompt);
    const modifiedCtx = applyResult(baseCtx, { prompt: "Fix bug" });
    const result = await verification.run(modifiedCtx);
    expect(result.diagnostics).toBeDefined();
    const infoLossDiagnostic = result.diagnostics!.find(
      (d) => d.code === "INFO_LOSS",
    );
    expect(infoLossDiagnostic).toBeDefined();
    expect(infoLossDiagnostic!.severity).toBe("blocking");
  });

  it("no intent verified for unknown intent", async () => {
    const ctx = ctxOf("some random prompt");
    const result = await verification.run(ctx);
    const codes = result.diagnostics?.map((d) => d.code) ?? [];
    expect(codes).not.toContain("INTENT_VERIFIED");
  });
});
