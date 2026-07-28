/**
 * filthy-rich-prompts — public API (M1).
 *
 * Minimal surface, SemVer-covered from 1.0 (docs/versioning.md §2):
 * `refine()`, the pass/registry contracts, and the built-in passes.
 */
import { runPipeline } from "./core/pipeline.js";
import { createRegistry } from "./core/registry.js";
import { TOOL_VERSION } from "./core/version.js";
import {
  clarifyingQuestions,
  modeTagline,
  type Mode as _Mode,
} from "./core/modes.js";
import { ambiguityDetection } from "./passes/ambiguity-detection.js";
import { constraintExtraction } from "./passes/constraint-extraction.js";
import { contextEnrichment } from "./passes/context-enrichment.js";
import { finalGeneration } from "./passes/final-generation.js";
import { goalRoleExtraction } from "./passes/goal-role-extraction.js";
import { intentDetection } from "./passes/intent-detection.js";
import { missingContextDetection } from "./passes/missing-context.js";
import { outputFormatInference } from "./passes/output-format.js";
import { structure } from "./passes/structure.js";
import { taskDecomposition } from "./passes/task-decomposition.js";
import { verification } from "./passes/verification.js";
import type {
  Pass,
  RefineOptions,
  RefineResult,
} from "./core/types.js";
import { resolveConfig, toResolvedConfig } from "./integrations/config-loader.js";

export type * from "./core/types.js";
export { createRegistry, RegistryError } from "./core/registry.js";
export type { Registry } from "./core/registry.js";
export { runPipeline } from "./core/pipeline.js";
export { diffLines, applyDiff } from "./core/diff.js";
export { TOOL_VERSION } from "./core/version.js";
export { intentDetection } from "./passes/intent-detection.js";
export { ambiguityDetection } from "./passes/ambiguity-detection.js";
export { constraintExtraction } from "./passes/constraint-extraction.js";
export { contextEnrichment } from "./passes/context-enrichment.js";
export { finalGeneration } from "./passes/final-generation.js";
export { goalRoleExtraction } from "./passes/goal-role-extraction.js";
export { missingContextDetection } from "./passes/missing-context.js";
export { outputFormatInference } from "./passes/output-format.js";
export { structure } from "./passes/structure.js";
export { taskDecomposition } from "./passes/task-decomposition.js";
export { verification } from "./passes/verification.js";

/** The built-in passes, in registration order. Execution order is by phase. */
export const builtinPasses: readonly Pass[] = [
  intentDetection,
  ambiguityDetection,
  missingContextDetection,
  contextEnrichment,
  constraintExtraction,
  goalRoleExtraction,
  structure,
  taskDecomposition,
  outputFormatInference,
  finalGeneration,
  verification,
];

export type { Mode } from "./core/modes.js";
export { DEFAULT_MODE } from "./core/modes.js";

/**
 * Refines a raw prompt through the built-in pipeline.
 *
 * Mode-aware: the `mode` option controls output presentation.
 *   - beginner (default): full explanations, clarifying questions
 *   - expert: terse one-liners, only blocking questions
 *   - silent: no questions, assumptions inline
 *
 * @example
 * const result = await refine('make the login faster', { mode: 'silent' });
 * console.log(result.refined);
 */
export async function refine(
  rawPrompt: string,
  options: RefineOptions = {},
): Promise<RefineResult> {
  const resolved = resolveConfig(process.cwd(), options);
  const config = toResolvedConfig(resolved, TOOL_VERSION);

  const result = await runPipeline(createRegistry(builtinPasses), rawPrompt, config);

  // Mode-aware post-processing: only applied when mode is explicitly requested.
  const mode = config.mode as _Mode | undefined;
  if (mode !== undefined) {
    const diagnostics = result.report.diagnostics ?? [];

    let refined = result.refined;

    const questions = clarifyingQuestions(mode, diagnostics);
    if (questions.length > 0) {
      refined = refined.trimEnd() + "\n\n" + questions.join("\n") + "\n";
    }

    const tagline = modeTagline(mode);
    if (tagline) {
      refined = refined.trimEnd() + "\n" + tagline + "\n";
    }

    return {
      ...result,
      refined,
      report: { ...result.report, mode },
    };
  }

  return result;
}
