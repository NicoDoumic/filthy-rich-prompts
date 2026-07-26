import { describe, expect, it } from "vitest";
import { initialContext } from "../core/context.js";
import type { PassContext, ResolvedConfig } from "../core/types.js";
import { ambiguityDetection } from "./ambiguity-detection.js";

const config: ResolvedConfig = { passes: {}, toolVersion: "0.0.0-test" };

function ctxOf(prompt: string): PassContext {
  return initialContext(prompt, config);
}

async function codesFor(prompt: string): Promise<string[]> {
  const result = await ambiguityDetection.run(ctxOf(prompt));
  return (result.diagnostics ?? []).map((d) => d.code);
}

describe("ambiguity-detection", () => {
  it("flags vague quantifiers as warnings", async () => {
    const codes = await codesFor("the app is kinda slow");
    expect(codes).toContain("VAGUE_QUANTIFIER");
  });

  it("flags vague qualifiers and deadlines", async () => {
    expect(await codesFor("make it faster")).toContain("VAGUE_QUALIFIER");
    expect(await codesFor("fix it asap")).toContain("VAGUE_DEADLINE");
  });

  it("flags hedges", async () => {
    expect(await codesFor("maybe fix the login bug")).toContain(
      "HEDGE_LANGUAGE",
    );
  });

  it("flags sentence-initial referents with a span pointing at the word", async () => {
    const result = await ambiguityDetection.run(
      ctxOf("the login broke. It worked yesterday."),
    );
    const referent = (result.diagnostics ?? []).find(
      (d) => d.code === "AMBIGUOUS_REFERENT",
    );
    expect(referent).toBeDefined();
    expect(
      referent?.span &&
        "the login broke. It worked yesterday.".slice(
          referent.span.start,
          referent.span.end,
        ),
    ).toBe("It");
  });

  it("flags compound requests and implicit constraints", async () => {
    expect(await codesFor("fix the crash and also update the docs")).toContain(
      "COMPOUND_REQUEST",
    );
    expect(await codesFor("make sure the tests pass")).toContain(
      "IMPLICIT_CONSTRAINT",
    );
  });

  it("emits no diagnostics for precise prompts", async () => {
    const result = await ambiguityDetection.run(
      ctxOf("rename the variable timeoutSeconds to requestTimeoutMs"),
    );
    expect(result.diagnostics).toEqual([]);
  });

  it("caps findings per code at 3 but keeps full counts in metadata", async () => {
    const prompt = "maybe one. maybe two. maybe three. maybe four. maybe five.";
    const result = await ambiguityDetection.run(ctxOf(prompt));
    const hedges = (result.diagnostics ?? []).filter(
      (d) => d.code === "HEDGE_LANGUAGE",
    );
    expect(hedges.length).toBe(3);
    const counts = result.metadata?.["ambiguity-detection:counts"] as Record<
      string,
      number
    >;
    expect(counts.HEDGE_LANGUAGE).toBe(5);
  });

  it("never emits blocking severity and never mutates", async () => {
    const result = await ambiguityDetection.run(
      ctxOf("kinda maybe asap it is broken and also slow"),
    );
    expect(
      (result.diagnostics ?? []).every((d) => d.severity !== "blocking"),
    ).toBe(true);
    expect(result.prompt).toBeUndefined();
  });
});
