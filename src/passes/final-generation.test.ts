import { describe, expect, it } from "vitest";
import { finalGeneration } from "./final-generation.js";
import { ctxOf } from "../../tests/helpers/ctxOf.js";

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

  it("no-ops on empty sections", async () => {
    const result = await finalGeneration.run(
      ctxOf("# Task\n\n\n## Context\n\n"),
    );
    expect(result.prompt).toBeUndefined();
  });

  it("sorts sections out of canonical order", async () => {
    const result = await finalGeneration.run(
      ctxOf("## Context\n\nstuff\n\n# Task\n\nFix it\n\n## Output Format\n\njson"),
    );
    expect(result.prompt).toBeDefined();
    const taskIndex = result.prompt!.indexOf("# Task");
    const contextIndex = result.prompt!.indexOf("## Context");
    const outputIndex = result.prompt!.indexOf("## Output Format");
    expect(taskIndex).toBeLessThan(contextIndex);
    expect(contextIndex).toBeLessThan(outputIndex);
  });

  it("preserves non-canonical sections at the end", async () => {
    const result = await finalGeneration.run(
      ctxOf("## Notes\n\nextra info\n\n# Task\n\nFix the bug"),
    );
    expect(result.prompt).toBeDefined();
    const taskIndex = result.prompt!.indexOf("# Task");
    const notesIndex = result.prompt!.indexOf("## Notes");
    expect(taskIndex).toBeLessThan(notesIndex);
    expect(result.prompt).toContain("## Notes");
    expect(result.prompt).toContain("extra info");
  });

  it("no-ops when already in canonical order", async () => {
    const input = "# Task\n\nFix the bug\n\n## Context\n\nusing react";
    const result = await finalGeneration.run(ctxOf(input));
    expect(result.prompt).toBeUndefined();
  });

  it("handles all sections present", async () => {
    const result = await finalGeneration.run(
      ctxOf(
        "## Output Format\n\njson\n\n## Context\n\nreact\n\n## Constraints\n\nfast\n\n## Role\n\nexpert\n\n# Task\n\nFix it\n\n## Sub-tasks\n\ndo stuff\n\n## Objective\n\ngoal",
      ),
    );
    expect(result.prompt).toBeDefined();
    const prompt = result.prompt!;
    const taskIdx = prompt.indexOf("# Task");
    const objIdx = prompt.indexOf("## Objective");
    const roleIdx = prompt.indexOf("## Role");
    const ctxIdx = prompt.indexOf("## Context");
    const consIdx = prompt.indexOf("## Constraints");
    const subIdx = prompt.indexOf("## Sub-tasks");
    const outIdx = prompt.indexOf("## Output Format");
    expect(taskIdx).toBeLessThan(objIdx);
    expect(objIdx).toBeLessThan(roleIdx);
    expect(roleIdx).toBeLessThan(ctxIdx);
    expect(ctxIdx).toBeLessThan(consIdx);
    expect(consIdx).toBeLessThan(subIdx);
    expect(subIdx).toBeLessThan(outIdx);
  });

  it("handles only task heading", async () => {
    const result = await finalGeneration.run(ctxOf("# Task\n\nFix it"));
    expect(result.prompt).toBeUndefined();
  });
});
