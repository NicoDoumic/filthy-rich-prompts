/**
 * Tool version, injected at build/test time from package.json via the
 * `__FRP_VERSION__` define (tsup.config.ts / vitest.config.ts). This makes
 * version drift between package.json and the report output impossible (Q11).
 *
 * Every supported entry point (vitest, tsup build, the published dist bundle)
 * defines the constant — there is intentionally no runtime fallback, so a
 * misconfigured build fails loudly instead of silently reporting a version.
 */
declare const __FRP_VERSION__: string;

export const TOOL_VERSION: string = __FRP_VERSION__;
