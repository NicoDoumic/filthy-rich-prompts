import { describe, expect, it } from "vitest";
import {
  buildDiscoveryQuestions,
  composeDualDelivery,
  DEFAULT_MIN_QUESTIONS,
  DISCOVERY_HEADING,
  ORIGINAL_HEADING,
  REFINED_HEADING,
  renderDiscoveryBlock,
  stripAppendedQuestions,
} from "./discovery.js";
import type { Diagnostic } from "./types.js";

function diag(
  overrides: Partial<Diagnostic> = {},
): Diagnostic {
  return {
    pass: "test",
    severity: "warning",
    code: "TEST",
    message: "test diagnostic",
    ...overrides,
  } as Diagnostic;
}

describe("buildDiscoveryQuestions", () => {
  it("guarantees at least DEFAULT_MIN_QUESTIONS for an empty diagnostic set", () => {
    const q = buildDiscoveryQuestions([]);
    expect(q.length).toBeGreaterThanOrEqual(DEFAULT_MIN_QUESTIONS);
  });

  it("keeps diagnostic suggestions first and verbatim", () => {
    const q = buildDiscoveryQuestions([
      diag({ suggestions: ["Specify the runtime/version"] }),
    ]);
    expect(q[0]).toBe("Specify the runtime/version");
  });

  it("uses the diagnostic message when no suggestions exist", () => {
    const q = buildDiscoveryQuestions([
      diag({ message: "Which database are you on?" }),
    ]);
    expect(q).toContain("Which database are you on?");
  });

  it("dedupes identical suggestions across diagnostics", () => {
    const q = buildDiscoveryQuestions([
      diag({ suggestions: ["Specify the runtime/version"] }),
      diag({ suggestions: ["specify the runtime/version"] }),
    ]);
    const count = q.filter(
      (s) => s.toLowerCase() === "specify the runtime/version",
    ).length;
    expect(count).toBe(1);
  });

  it("returns all specific questions even when they exceed the minimum", () => {
    const suggestions = Array.from(
      { length: 9 },
      (_, i) => `specific question ${i + 1}`,
    );
    const q = buildDiscoveryQuestions([diag({ suggestions })]);
    expect(q.length).toBe(9);
    expect(q).toEqual(suggestions);
  });

  it("does not add a catalog question when a specific one covers its dimension", () => {
    const q = buildDiscoveryQuestions([diag({ suggestions: ["Specify the environment and versions"] })]);
    expect(q[0]).toContain("environment");
    expect(q.some((s) => /What environment does this apply/.test(s))).toBe(false);
  });

  it("respects a custom minimum", () => {
    const q = buildDiscoveryQuestions([], 8);
    expect(q.length).toBeGreaterThanOrEqual(8);
  });

  it("clamps an invalid minimum down to 1", () => {
    const q = buildDiscoveryQuestions([], -3);
    expect(q.length).toBeGreaterThanOrEqual(1);
  });
});

describe("stripAppendedQuestions", () => {
  it("leaves text without a questions block unchanged", () => {
    expect(stripAppendedQuestions("# Task\n\nwork")).toBe("# Task\n\nwork");
  });

  it("removes a trailing open-questions block", () => {
    const input = `# Task\n\nwork\n\n${DISCOVERY_HEADING}\n\n1. x\n2. y\n`;
    const out = stripAppendedQuestions(input);
    expect(out).toBe("# Task\n\nwork");
    expect(out).not.toContain(DISCOVERY_HEADING);
  });

  it("removes a trailing blocking-concerns block", () => {
    const out = stripAppendedQuestions("# Task\n\nwork\n\n## Blocking concerns\n\n- x\n");
    expect(out).toBe("# Task\n\nwork");
  });

  it("removes a trailing tagline that follows the questions block", () => {
    const out = stripAppendedQuestions(
      `# Task\n\nwork\n\n${DISCOVERY_HEADING}\n\n1. x\n\n---\n*Refined with detailed explanations.*\n`,
    );
    expect(out).toBe("# Task\n\nwork");
  });
});

describe("renderDiscoveryBlock", () => {
  it("returns empty for no questions", () => {
    expect(renderDiscoveryBlock([])).toBe("");
  });

  it("renders the heading with a numbered list", () => {
    const out = renderDiscoveryBlock(["a", "b"]);
    expect(out).toContain(DISCOVERY_HEADING);
    expect(out).toContain("1. a");
    expect(out).toContain("2. b");
  });
});

describe("composeDualDelivery", () => {
  const raw = "make the login faster";
  const refined = "# Task\n\nImprove login speed\n";
  const questions = ["Q a", "Q b", "Q c", "Q d", "Q e"];

  it("delivers the original verbatim under the original heading", () => {
    const out = composeDualDelivery(raw, refined, []);
    expect(out).toContain(ORIGINAL_HEADING);
    expect(out).toContain(raw);
  });

  it("delivers the refined request under the refined heading", () => {
    const out = composeDualDelivery(raw, refined, []);
    expect(out).toContain(REFINED_HEADING);
    expect(out).toContain("# Task");
  });

  it("includes the discovery block and bridge when questions exist", () => {
    const out = composeDualDelivery(raw, refined, questions);
    expect(out).toContain(DISCOVERY_HEADING);
    expect(out).toContain("1. Q a");
    expect(out).toContain("5. Q e");
    expect(out).toContain("answer the 5 questions above");
    expect(out).toContain("the original wins");
  });

  it("omits the discovery block and bridge when no questions exist", () => {
    const out = composeDualDelivery(raw, refined, []);
    expect(out).not.toContain(DISCOVERY_HEADING);
    expect(out).not.toContain("answer the 0 questions");
  });

  it("strips a mode-level questions block from the refined prompt", () => {
    const modeRefined = `# Task\n\nwork\n\n${DISCOVERY_HEADING}\n\n1. residual\n`;
    const out = composeDualDelivery(raw, modeRefined, questions);
    expect(out).not.toContain("1. residual");
  });
});
