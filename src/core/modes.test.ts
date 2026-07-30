import { describe, expect, it } from "vitest";
import {
  clarifyingQuestions,
  modeTagline,
  OPEN_QUESTIONS_HEADING,
  VALID_MODES,
} from "./modes.js";
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

describe("VALID_MODES", () => {
  it("includes all four modes", () => {
    expect(VALID_MODES).toEqual(["beginner", "expert", "interactive", "silent"]);
  });
});

describe("modeTagline", () => {
  it("returns a tagline for beginner", () => {
    expect(modeTagline("beginner")).toContain("detailed explanations");
  });

  it("returns undefined for expert", () => {
    expect(modeTagline("expert")).toBeUndefined();
  });

  it("returns a tagline for silent", () => {
    expect(modeTagline("silent")).toContain("silent mode");
  });

  it("returns a tagline for interactive", () => {
    expect(modeTagline("interactive")).toContain("interactively");
  });
});

describe("clarifyingQuestions", () => {
  const diagWith = (suggestions: string[]) =>
    diag({ suggestions, severity: "warning" } as Partial<Diagnostic>);

  it("returns empty when there are no diagnostics", () => {
    expect(clarifyingQuestions("beginner", [])).toEqual([]);
  });

  it("returns empty when diagnostics have no suggestions", () => {
    const d = diag();
    expect(clarifyingQuestions("beginner", [d])).toEqual([]);
  });

  it("appends Open Questions heading for beginner mode", () => {
    const result = clarifyingQuestions("beginner", [diagWith(["try this"])]);
    expect(result[0]).toBe(OPEN_QUESTIONS_HEADING);
  });

  it("includes numbered suggestions for beginner mode", () => {
    const result = clarifyingQuestions("beginner", [
      diagWith(["do X", "do Y"]),
    ]);
    expect(result).toContain("1. do X");
    expect(result).toContain("2. do Y");
  });

  it("appends Open Questions heading for interactive mode", () => {
    const result = clarifyingQuestions("interactive", [diagWith(["try this"])]);
    expect(result[0]).toBe(OPEN_QUESTIONS_HEADING);
  });

  it("returns Blocking concerns heading for expert mode", () => {
    const d = diag({
      severity: "blocking",
      suggestions: ["fix this"],
    } as Partial<Diagnostic>);
    const result = clarifyingQuestions("expert", [d]);
    expect(result[0]).toBe("## Blocking concerns");
  });

  it("returns bullet suggestions for expert mode", () => {
    const d = diag({
      severity: "blocking",
      suggestions: ["fix this"],
    } as Partial<Diagnostic>);
    const result = clarifyingQuestions("expert", [d]);
    expect(result).toContain("- fix this");
  });

  it("returns empty for silent mode even with diagnostics", () => {
    expect(clarifyingQuestions("silent", [diagWith(["try this"])])).toEqual([]);
  });

  it("expert mode returns empty when no blocking diagnostics exist", () => {
    expect(
      clarifyingQuestions("expert", [diagWith(["skip me"])]),
    ).toEqual([]);
  });

  it("expert mode includes questions when any diagnostic is blocking", () => {
    const diagnostics = [
      diag({ severity: "warning", suggestions: ["skip me"] } as Partial<Diagnostic>),
      diag({ severity: "blocking", suggestions: ["answer me"] } as Partial<Diagnostic>),
    ];
    const result = clarifyingQuestions("expert", diagnostics);
    expect(result).toContain("- answer me");
    expect(result).not.toContain("skip me");
  });
});
