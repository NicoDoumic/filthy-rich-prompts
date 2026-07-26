import { describe, expect, it } from "vitest";
import { runPipeline, validateResult } from "./pipeline.js";
import { createRegistry } from "./registry.js";
import type { Pass, ResolvedConfig } from "./types.js";

const config: ResolvedConfig = { passes: {}, toolVersion: "0.0.0-test" };

function makePass(overrides: Partial<Pass> = {}): Pass {
  return {
    id: "test-pass",
    description: "a test pass",
    kind: "detection",
    phase: 20,
    requiresLLM: false,
    requiresNetwork: false,
    run: () => ({}),
    ...overrides,
  };
}

describe("runPipeline ordering", () => {
  it("executes passes by phase, registration order as tiebreak", async () => {
    const order: string[] = [];
    const recorder = (id: string, phase: number): Pass =>
      makePass({
        id,
        phase,
        run: () => {
          order.push(id);
          return {};
        },
      });
    const registry = createRegistry([
      recorder("c-last", 30),
      recorder("a-first", 10),
      recorder("b-mid", 30),
    ]);
    await runPipeline(registry, "prompt", config);
    expect(order).toEqual(["a-first", "c-last", "b-mid"]);
  });
});

describe("contract invariants (architecture §4.3)", () => {
  it("invariant 1: the context a pass receives is deeply frozen", async () => {
    let threw = false;
    const mutator = makePass({
      run: (ctx) => {
        try {
          // @ts-expect-error — deliberate mutation attempt
          ctx.current = "tampered";
        } catch {
          threw = true;
        }
        return {};
      },
    });
    await runPipeline(createRegistry([mutator]), "prompt", config);
    expect(threw).toBe(true);
  });

  it("invariant 2: a detection pass returning a prompt fails, pipeline continues", async () => {
    const bad = makePass({ run: () => ({ prompt: "illegal mutation" }) });
    const good = makePass({
      id: "later-pass",
      phase: 30,
      kind: "transformation",
      run: () => ({
        prompt: "# Task\n\nprompt\n",
        explanations: [{ pass: "later-pass", change: "c", reason: "r" }],
      }),
    });
    const result = await runPipeline(
      createRegistry([bad, good]),
      "prompt",
      config,
    );
    expect(result.refined).toBe("# Task\n\nprompt\n");
    expect(
      result.report.passRuns.find((r) => r.id === "test-pass")?.status,
    ).toBe("failed");
    expect(
      result.report.diagnostics.some((d) => d.code === "CONTRACT_VIOLATION"),
    ).toBe(true);
  });

  it("invariant 3: a transformation without explanations is rejected", async () => {
    const silent = makePass({
      kind: "transformation",
      phase: 50,
      run: () => ({ prompt: "changed without saying why" }),
    });
    const result = await runPipeline(
      createRegistry([silent]),
      "prompt",
      config,
    );
    expect(result.refined).toBe("prompt");
    expect(
      result.report.diagnostics.some((d) => d.code === "CONTRACT_VIOLATION"),
    ).toBe(true);
  });

  it("invariant 4: a pass may not empty the prompt", async () => {
    const destroyer = makePass({
      kind: "transformation",
      phase: 50,
      run: () => ({
        prompt: "   ",
        explanations: [{ pass: "test-pass", change: "c", reason: "r" }],
      }),
    });
    const result = await runPipeline(
      createRegistry([destroyer]),
      "prompt",
      config,
    );
    expect(result.refined).toBe("prompt");
    expect(
      result.report.diagnostics.some((d) => d.code === "CONTRACT_VIOLATION"),
    ).toBe(true);
  });

  it("invariant 5: a throwing pass is isolated — diagnostic, continue, no loss", async () => {
    const crasher = makePass({
      run: () => {
        throw new Error("boom");
      },
    });
    const survivor = makePass({
      id: "survivor",
      phase: 50,
      kind: "transformation",
      run: () => ({
        prompt: "# Task\n\nprompt\n",
        explanations: [{ pass: "survivor", change: "c", reason: "r" }],
      }),
    });
    const result = await runPipeline(
      createRegistry([crasher, survivor]),
      "prompt",
      config,
    );
    expect(result.refined).toBe("# Task\n\nprompt\n");
    const crash = result.report.diagnostics.find(
      (d) => d.code === "PASS_CRASH",
    );
    expect(crash?.severity).toBe("blocking");
    expect(crash?.message).toContain("boom");
    expect(
      result.report.passRuns.find((r) => r.id === "test-pass")?.status,
    ).toBe("failed");
  });

  it("non-Error throws are also isolated", async () => {
    const crasher = makePass({
      run: () => {
        throw "string failure";
      },
    });
    const result = await runPipeline(
      createRegistry([crasher]),
      "prompt",
      config,
    );
    expect(result.report.diagnostics.some((d) => d.code === "PASS_CRASH")).toBe(
      true,
    );
  });
});

describe("phase-70 rule", () => {
  it("rejects mutations at the verify phase even from generation passes", async () => {
    const late = makePass({
      kind: "generation",
      phase: 60,
      run: () => ({
        prompt: "assembled",
        explanations: [{ pass: "test-pass", change: "c", reason: "r" }],
      }),
    });
    // A generation pass may not register at phase 70, so simulate a phase-70
    // mutator via a detection-registered pass that misbehaves at runtime.
    const sneaky = makePass({
      id: "sneaky-verify",
      phase: 70,
      kind: "detection",
      run: () => ({ prompt: "mutated after verification" }),
    });
    const result = await runPipeline(
      createRegistry([late, sneaky]),
      "prompt",
      config,
    );
    expect(result.refined).toBe("assembled");
    expect(
      result.report.diagnostics.some((d) => d.code === "CONTRACT_VIOLATION"),
    ).toBe(true);
  });
});

describe("config pass toggles", () => {
  it("skips disabled passes and records the skip", async () => {
    const registry = createRegistry([makePass({ id: "toggle-me" })]);
    const result = await runPipeline(registry, "prompt", {
      passes: { "toggle-me": false },
      toolVersion: "0.0.0-test",
    });
    expect(result.report.passRuns[0]?.status).toBe("skipped");
    expect(result.refined).toBe("prompt");
  });
});

describe("validateResult", () => {
  it("returns null for valid no-op results", () => {
    expect(validateResult(makePass(), {})).toBeNull();
  });
});
