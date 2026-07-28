import { initialContext } from "../../src/core/context.js";
import type { PassContext, ResolvedConfig } from "../../src/core/types.js";

export const EMPTY_CONFIG: ResolvedConfig = {
  passes: {},
  toolVersion: "test",
};

export function ctxOf(prompt: string): PassContext {
  return initialContext(prompt, EMPTY_CONFIG);
}
