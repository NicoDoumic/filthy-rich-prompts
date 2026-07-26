import { describe, expect, it } from "vitest";
import { initialContext } from "../core/context.js";
import type { PassContext, ResolvedConfig } from "../core/types.js";
import { structure } from "./structure.js";

const config: ResolvedConfig = { passes: {}, toolVersion: "0.0.0-test" };

function ctxOf(prompt: string): PassContext {
  return initialContext(prompt, config);
}

/** Strips known scaffolding and asserts every remaining sentence is a verbatim input span (the verbatim-span doctrine). */
function expectVerbatimSpans(input: string, output: string): void {
  const withoutScaffolding = output
    .replace(/^# Task\n\n/, "")
    .replace(/\n\n## Context\n\n/, "\n");
  for (const sentence of withoutScaffolding.split(/(?<=[.!?])\s+/)) {
    const trimmed = sentence.trim();
    if (trimmed.length > 0) {
      expect(input).toContain(trimmed);
    }
  }
}

describe("structure", () => {
  it("no-ops on empty and whitespace-only input", async () => {
    expect(await structure.run(ctxOf(""))).toEqual({});
    expect(await structure.run(ctxOf("   \n  "))).toEqual({});
  });

  it("no-ops on prompts that already have headings (idempotence)", async () => {
    const structured = "# Task\n\nfix the login bug\n";
    expect(await structure.run(ctxOf(structured))).toEqual({});
  });

  it("adds a # Task heading to a single-line prompt", async () => {
    const result = await structure.run(
      ctxOf("write a blog post about why tabs are better than spaces"),
    );
    expect(result.prompt).toBe(
      "# Task\n\nwrite a blog post about why tabs are better than spaces\n",
    );
    expect(result.explanations?.length).toBeGreaterThan(0);
  });

  it("relocates context-clue sentences verbatim into ## Context", async () => {
    const input =
      "can you make it faster? also maybe fix the login bug where it logs me out. using react + node btw";
    const result = await structure.run(ctxOf(input));
    expect(result.prompt).toContain("## Context");
    expect(result.prompt).toContain("using react + node btw");
    expect(result.prompt?.indexOf("## Context")).toBeGreaterThan(
      result.prompt?.indexOf("# Task") ?? -1,
    );
    expect(
      result.explanations?.some((e) => e.change.includes("relocated")),
    ).toBe(true);
    expectVerbatimSpans(input, result.prompt ?? "");
  });

  it("preserves every input sentence verbatim (the doctrine)", async () => {
    const input =
      "hey the app is kinda slow when I open the dashboard and sometimes it just spins forever lol. can you make it faster? using react + node btw";
    const result = await structure.run(ctxOf(input));
    expectVerbatimSpans(input, result.prompt ?? "");
  });

  it("handles the whole-prompt-is-context edge case without an empty Task body", async () => {
    const result = await structure.run(ctxOf("using react + node btw"));
    expect(result.prompt).toBe("# Task\n\nusing react + node btw\n");
    expect(result.prompt).not.toContain("## Context");
  });

  it("handles unicode content via Intl.Segmenter", async () => {
    const input = "修复登录 bug 🐛。它昨天还能用。";
    const result = await structure.run(ctxOf(input));
    expect(result.prompt).toContain(input.replace(/。$/, "。"));
    expectVerbatimSpans(input, result.prompt ?? "");
  });

  it("every transformation carries an explanation (engine invariant 3)", async () => {
    const result = await structure.run(
      ctxOf("fix the crash on export, it worked yesterday"),
    );
    expect(result.prompt).toBeDefined();
    expect(
      result.explanations?.every(
        (e) => e.pass === "structure" && e.reason.length > 0,
      ),
    ).toBe(true);
  });

  it("is idempotent: structuring structured output is a no-op", async () => {
    const first = await structure.run(
      ctxOf("fix the crash on export, it worked yesterday"),
    );
    const second = await structure.run(ctxOf(first.prompt ?? ""));
    expect(second).toEqual({});
  });
});
