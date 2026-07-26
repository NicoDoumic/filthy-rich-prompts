/**
 * filthy-rich-prompts — public API (M1).
 *
 * Minimal surface, SemVer-covered from 1.0 (docs/versioning.md §2):
 * `refine()`, the pass/registry contracts, and the built-in passes.
 */
import { runPipeline } from "./core/pipeline.js";
import { createRegistry } from "./core/registry.js";
import { TOOL_VERSION } from "./core/version.js";
import { ambiguityDetection } from "./passes/ambiguity-detection.js";
import { intentDetection } from "./passes/intent-detection.js";
import { structure } from "./passes/structure.js";
import type {
  Pass,
  RefineOptions,
  RefineResult,
  ResolvedConfig,
} from "./core/types.js";

export type * from "./core/types.js";
export { createRegistry, RegistryError } from "./core/registry.js";
export type { Registry } from "./core/registry.js";
export { runPipeline } from "./core/pipeline.js";
export { diffLines, applyDiff } from "./core/diff.js";
export { TOOL_VERSION } from "./core/version.js";
export { intentDetection } from "./passes/intent-detection.js";
export { ambiguityDetection } from "./passes/ambiguity-detection.js";
export { structure } from "./passes/structure.js";

/** The built-in passes, in registration order. Execution order is by phase. */
export const builtinPasses: readonly Pass[] = [
  intentDetection,
  ambiguityDetection,
  structure,
];

/**
 * Refines a raw prompt through the built-in pipeline.
 *
 * Returns the refined prompt, its line-wise diff against the original, every
 * explanation, and the aggregated report (ROADMAP M1 exit criterion).
 *
 * @example
 * const result = await refine('make the login faster it\'s broken sometimes');
 * console.log(result.refined);
 */
export async function refine(
  rawPrompt: string,
  options: RefineOptions = {},
): Promise<RefineResult> {
  const config: ResolvedConfig = {
    passes: { ...(options.passes ?? {}) },
    toolVersion: TOOL_VERSION,
  };
  return runPipeline(createRegistry(builtinPasses), rawPrompt, config);
}
