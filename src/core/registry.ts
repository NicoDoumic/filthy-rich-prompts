/**
 * Pass registration and contract validation.
 *
 * Two failure modes, deliberately split (D6):
 * - Registration-time problems (bad pass *definition*) throw — programmer error.
 * - Run-time problems are the pipeline's concern (pipeline.ts) and never throw.
 */
import type { Pass } from "./types.js";

const KEBAB_CASE = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;

/** Highest phase at which a transformation/generation pass may run (generate = 60). */
const MAX_MUTATING_PHASE = 60;
/** The reserved verification phase (architecture §3: non-mutating validation only). */
const VERIFY_PHASE = 70;
/** Highest phase at which an ordinary detection pass may run. */
const MAX_DETECTION_PHASE = 50;

/**
 * Validates a pass definition. Throws `RegistryError` on any contract violation.
 *
 * Phase rules (architecture §3):
 * - detection passes run at phases ≤ 50, or at 70 (reserved verification phase)
 * - transformation/generation passes run at phases ≤ 60
 */
export function validatePass(pass: Pass): void {
  if (!KEBAB_CASE.test(pass.id)) {
    throw new RegistryError(
      `Pass id "${pass.id}" must be kebab-case (e.g. "my-pass").`,
    );
  }
  if (pass.description.trim().length === 0) {
    throw new RegistryError(
      `Pass "${pass.id}" must have a non-empty description.`,
    );
  }
  if (!Number.isFinite(pass.phase) || pass.phase <= 0) {
    throw new RegistryError(
      `Pass "${pass.id}" has invalid phase ${pass.phase}.`,
    );
  }
  if (
    pass.kind === "detection" &&
    pass.phase > MAX_DETECTION_PHASE &&
    pass.phase !== VERIFY_PHASE
  ) {
    throw new RegistryError(
      `Detection pass "${pass.id}" must run at phase ≤ ${MAX_DETECTION_PHASE} ` +
        `(or ${VERIFY_PHASE} for verification), got ${pass.phase}.`,
    );
  }
  if (pass.kind !== "detection" && pass.phase > MAX_MUTATING_PHASE) {
    throw new RegistryError(
      `${pass.kind} pass "${pass.id}" must run at phase ≤ ${MAX_MUTATING_PHASE} ` +
        `— phase ${VERIFY_PHASE} is reserved for non-mutating verification, got ${pass.phase}.`,
    );
  }
  if (typeof pass.run !== "function") {
    throw new RegistryError(`Pass "${pass.id}" must define a run() function.`);
  }
}

/** Error thrown for invalid pass definitions at registration time. */
export class RegistryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RegistryError";
  }
}

/**
 * A validated set of passes. Created once per `refine()` call; immutable.
 */
export interface Registry {
  /** All registered passes, in registration order. */
  readonly passes: readonly Pass[];
  /**
   * Passes in execution order: phase ascending, registration order as the
   * tiebreak (architecture §3 — phases are the only ordering mechanism).
   */
  readonly ordered: readonly Pass[];
}

/**
 * Validates and registers passes. Throws on duplicate ids or invalid definitions.
 */
export function createRegistry(passes: readonly Pass[]): Registry {
  const seen = new Set<string>();
  for (const pass of passes) {
    validatePass(pass);
    if (seen.has(pass.id)) {
      throw new RegistryError(`Duplicate pass id "${pass.id}".`);
    }
    seen.add(pass.id);
  }
  // Array.prototype.sort is stable in modern JS — registration order is the tiebreak.
  const ordered = [...passes].sort((a, b) => a.phase - b.phase);
  return Object.freeze({
    passes: Object.freeze([...passes]),
    ordered: Object.freeze(ordered),
  });
}
