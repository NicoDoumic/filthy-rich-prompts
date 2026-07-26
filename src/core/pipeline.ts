/**
 * The pipeline engine (architecture §5): phase-ordered execution over immutable
 * context snapshots, with contract validation between every pass.
 *
 * Error doctrine (D6 / architecture §8):
 * - Pass exceptions and contract-violating results are caught: the pass is
 *   marked `failed`, a `blocking` diagnostic is recorded, and the pipeline
 *   continues from the last good snapshot. One bad pass must never lose the
 *   user's prompt.
 * - Invalid pass *definitions* never reach here — the registry throws first.
 */
import { applyResult, deepFreeze, initialContext } from "./context.js";
import { diffLines } from "./diff.js";
import { buildReport } from "./report.js";
import type { Registry } from "./registry.js";
import type {
  Diagnostic,
  Pass,
  PassContext,
  PassResult,
  PassRun,
  RefineResult,
  ResolvedConfig,
} from "./types.js";

const ENGINE = "engine";

function engineDiagnostic(code: string, message: string): Diagnostic {
  return { pass: ENGINE, severity: "blocking", code, message };
}

/**
 * Validates a pass result against the contract invariants (architecture §4.3).
 * Returns a violation message, or `null` when the result is valid.
 */
export function validateResult(pass: Pass, result: PassResult): string | null {
  // Invariant 2: detection passes never mutate.
  if (pass.kind === "detection" && result.prompt !== undefined) {
    return `detection pass "${pass.id}" returned a prompt — detection passes must not mutate`;
  }
  // Phase-70 rule: nothing mutates after verification.
  if (pass.phase === 70 && result.prompt !== undefined) {
    return `pass "${pass.id}" mutated at phase 70 — the verify phase is non-mutating`;
  }
  if (result.prompt !== undefined) {
    // Invariant 4: the original may never be dropped entirely.
    if (result.prompt.trim().length === 0) {
      return `pass "${pass.id}" returned an empty prompt — refinement must never lose the user's input`;
    }
    // Invariant 3: every transformation explains itself.
    if (!result.explanations || result.explanations.length === 0) {
      return `${pass.kind} pass "${pass.id}" mutated the prompt without an explanation`;
    }
  }
  return null;
}

/**
 * Runs the registered passes over `rawPrompt` and returns the refined prompt,
 * its diff against the original, all explanations, and the aggregated report.
 */
export async function runPipeline(
  registry: Registry,
  rawPrompt: string,
  config: ResolvedConfig,
): Promise<RefineResult> {
  let ctx = initialContext(rawPrompt, config);
  const passRuns: PassRun[] = [];

  for (const pass of registry.ordered) {
    const run: PassRun = {
      id: pass.id,
      phase: pass.phase,
      kind: pass.kind,
      status: "applied",
    };

    if (config.passes[pass.id] === false) {
      passRuns.push({ ...run, status: "skipped" });
      continue;
    }

    // The context a pass sees is always frozen (D5) — mutation attempts throw.
    const frozen = deepFreeze(ctx);
    let result: PassResult;
    try {
      result = await pass.run(frozen);
    } catch (error) {
      // Architecture §8: catch, downgrade to a diagnostic, continue.
      const message = error instanceof Error ? error.message : String(error);
      ctx = applyResult(ctx, {
        diagnostics: [
          engineDiagnostic("PASS_CRASH", `pass "${pass.id}" threw: ${message}`),
        ],
      });
      passRuns.push({ ...run, status: "failed" });
      continue;
    }

    const violation = validateResult(pass, result);
    if (violation !== null) {
      ctx = applyResult(ctx, {
        diagnostics: [engineDiagnostic("CONTRACT_VIOLATION", violation)],
      });
      passRuns.push({ ...run, status: "failed" });
      continue;
    }

    ctx = applyResult(ctx, result);
    passRuns.push(run);
  }

  const finalCtx: PassContext = ctx;
  return {
    refined: finalCtx.current,
    diff: diffLines(finalCtx.raw, finalCtx.current),
    explanations: finalCtx.explanations,
    report: buildReport(finalCtx, passRuns),
  };
}
