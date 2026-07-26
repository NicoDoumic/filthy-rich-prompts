import { describe, expect, it } from "vitest";
import { createRegistry, RegistryError, validatePass } from "./registry.js";
import type { Pass } from "./types.js";

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

describe("validatePass", () => {
  it("accepts a valid pass", () => {
    expect(() => validatePass(makePass())).not.toThrow();
  });

  it("rejects non-kebab-case ids", () => {
    expect(() => validatePass(makePass({ id: "Bad_Id" }))).toThrow(
      RegistryError,
    );
    expect(() => validatePass(makePass({ id: "-leading" }))).toThrow(
      RegistryError,
    );
  });

  it("rejects empty descriptions", () => {
    expect(() => validatePass(makePass({ description: "  " }))).toThrow(
      /description/,
    );
  });

  it("rejects invalid phases", () => {
    expect(() => validatePass(makePass({ phase: 0 }))).toThrow(/phase/);
    expect(() => validatePass(makePass({ phase: Number.NaN }))).toThrow(
      /phase/,
    );
  });

  it("rejects detection passes above phase 50 (except 70)", () => {
    expect(() =>
      validatePass(makePass({ kind: "detection", phase: 55 })),
    ).toThrow(/phase ≤ 50/);
    expect(() =>
      validatePass(makePass({ kind: "detection", phase: 70 })),
    ).not.toThrow();
  });

  it("rejects passes without a run function", () => {
    expect(() =>
      validatePass(makePass({ run: undefined as unknown as Pass["run"] })),
    ).toThrow(/run\(\)/);
  });

  it("rejects mutating passes at the verify phase", () => {
    expect(() =>
      validatePass(makePass({ kind: "transformation", phase: 70 })),
    ).toThrow(/reserved/);
    expect(() =>
      validatePass(makePass({ kind: "generation", phase: 65 })),
    ).toThrow(/reserved/);
    expect(() =>
      validatePass(makePass({ kind: "generation", phase: 60 })),
    ).not.toThrow();
  });
});

describe("createRegistry", () => {
  it("rejects duplicate ids", () => {
    expect(() => createRegistry([makePass(), makePass()])).toThrow(/Duplicate/);
  });

  it("orders by phase, with registration order as the tiebreak", () => {
    const a = makePass({ id: "a-pass", phase: 50, kind: "transformation" });
    const b = makePass({ id: "b-pass", phase: 10 });
    const c = makePass({ id: "c-pass", phase: 20 });
    const d = makePass({ id: "d-pass", phase: 20 });
    const registry = createRegistry([a, b, c, d]);
    expect(registry.ordered.map((p) => p.id)).toEqual([
      "b-pass",
      "c-pass",
      "d-pass",
      "a-pass",
    ]);
    expect(registry.passes.map((p) => p.id)).toEqual([
      "a-pass",
      "b-pass",
      "c-pass",
      "d-pass",
    ]);
  });
});
