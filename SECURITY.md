# Security Policy

## Reporting a Vulnerability

If a refinement pass could leak or expose sensitive content from a user's prompt, or if you discover any other security vulnerability, **do not open a public issue**.

Report it privately via one of these channels:

- **GitHub Security Advisory:** Use the ["Report a vulnerability"](https://github.com/NicoDoumic/filthy-rich-prompts/security/advisories/new) button on the Security tab
- **Email:** Contact a maintainer directly

Include:

- A description of the vulnerability and its potential impact
- Steps to reproduce, including the raw prompt and refined output
- The version you're running (`npx filthy-rich-prompts --help` shows the version)
- Node.js and OpenCode versions

We aim to respond within 72 hours and publish fixes within 7 days of confirmation.

## Scope

This security policy covers the refinement engine, built-in passes, plugin integration, installer, and configuration loading. It does not cover:

- The behavior of OpenCode itself (report OpenCode security issues to the OpenCode project)
- Third-party passes or plugins not shipped in this repository
- LLM providers configured by the user (the engine is local-first and makes no network requests in default configuration)

## Design Guarantees

The following design properties are security-relevant:

1. **Zero network requests by default.** All built-in passes are heuristic-only (pure TypeScript, no `fetch`, no `require` of network libraries). LLM-powered passes require explicit per-pass opt-in (`requiresLLM: true`) and explicit provider configuration.
2. **No persistent logging.** The engine writes nothing to disk, sends no telemetry, and keeps no logs of refined prompts.
3. **Plugin isolation.** Each plugin pass runs in the same process but is crash-isolated — one bad pass never loses the user's prompt.
4. **Config validation.** Configuration files are parsed with strict JSON, fail on unknown keys, and reject malformed input.

## Supported Versions

| Version | Supported |
|---------|-----------|
| 0.2.x   | Active (pre-release) |
| 0.1.x   | Tagged only (never published to npm) |

Once 1.0 is released, we will follow a 12-month support window for the latest major version.

## Disclosure Policy

We follow a coordinated disclosure process:

1. Reporter submits vulnerability privately
2. Maintainers confirm and assess severity within 72 hours
3. A fix is developed and tested
4. A security release is published with a CVE (if applicable)
5. A public advisory is published 7 days after the fix is released

We credit reporters in the advisory (with permission).
