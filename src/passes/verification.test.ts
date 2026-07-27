import { describe, expect, it } from "vitest";
import { verification } from "./verification.js";
import { applyResult, initialContext } from "../core/context.js";
import { intentDetection } from "./intent-detection.js";
import type { PassContext, ResolvedConfig } from "../core/types.js";

const EMPTY_CONFIG: ResolvedConfig = { passes: {}, toolVersion: "test" };
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
});
