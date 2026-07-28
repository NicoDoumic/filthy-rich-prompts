# Troubleshooting Guide

Common issues when installing and configuring filthy-rich-prompts for OpenCode.

---

## 1. Plugin Not Loading in OpenCode

**Symptom:** OpenCode starts, but prompts are not refined — no change in behavior after installing the plugin.

**Cause:** The plugin file is not discovered, loaded, or registered. Usually a path misconfiguration or missing restart.

**Solution:**

1. **Verify the skill is registered:**
   ```
   opencode debug skill
   ```
   If `prompt-refiner` does not appear, see issue #3. If it appears but auto-refine is inactive, check the plugin registration.

2. **Check the OpenCode log file:**
   ```
   # Windows (PowerShell):
   Get-Content "$env:LOCALAPPDATA\..\..\.local\share\opencode\log\opencode.log" | Select-String "failed to load plugin"

   # macOS / Linux:
   cat ~/.local/share/opencode/log/opencode.log | grep "failed to load plugin"
   ```

3. **Verify the plugin path in `opencode.json`:**
   ```json
   {
     "plugin": [["C:\\Users\\YOU\\.config\\opencode\\plugin\\filthy-rich-prompts.js", { "autoRefine": true }]]
   }
   ```
   The path must point to the actual file. On Windows, use double backslashes (`\\`) or forward slashes (`/`).

4. **Restart OpenCode completely** — not just a session switch. Config files are read at startup only.

---

## 2. Auto-Refine Not Working (Config Ignored)

**Symptom:** `opencode.json` contains `"autoRefine": true` but prompts are not refined.

**Cause:** Common config mistakes.

**Solution:**

- **Wrong JSON format:** The plugin config must be an array inside the `"plugin"` array:
  ```json
  { "plugin": [["path/to/plugin.js", { "autoRefine": true }]] }
  ```
  The outer array holds all plugins; each inner array is `[path, options]`.

- **Missing restart:** OpenCode reads `opencode.json` at startup only. Restart completely.

- **Wrong config file:** OpenCode uses `opencode.json` in the project root or global config directory. Verify you're editing the right one:
  ```
  # Global config location:
  ~/.config/opencode/opencode.json
  # Project config:
  .opencode/opencode.json
  ```

- **Typo in `autoRefine`:** Must be exactly `"autoRefine"` (capital R). No trailing comma after the last item in the block.

---

## 3. Skill Not Appearing in `opencode debug skill`

**Symptom:** Running `opencode debug skill` does not list `prompt-refiner`.

**Cause:** SKILL.md not installed in the right location, or OpenCode not restarted.

**Solution:**

1. **Verify the directory structure:**
   ```
   # Global install:
   ~/.config/opencode/skills/prompt-refiner/SKILL.md

   # Project install:
   .opencode/skills/prompt-refiner/SKILL.md
   ```
   Both `skill/` and `skills/` work (OpenCode accepts both).

2. **The folder name must match the `name` field in SKILL.md frontmatter:**
   ```yaml
   ---
   name: prompt-refiner
   ```
   The folder must be named `prompt-refiner` (not `filthy-rich-prompts`, not `promptrefiner`).

3. **Restart OpenCode** — skills are discovered at startup only.

4. **Check the description field:** Skills without a `description` in frontmatter are filtered out. Our SKILL.md has one, but if you edited it, ensure it's present:
   ```yaml
   description: >-
     Refines raw user prompts into high-quality AI instructions...
   ```

---

## 4. Refinement Seems to Change Intent

**Symptom:** The refined prompt appears to ask for something different from what you wrote.

**Cause:** This should never happen. If it does, it is a **severity-1 bug**.

**Solution:**

1. **Save both the raw and refined prompts** immediately.
2. **File a bug report** using the [bug report template](https://github.com/NicoDoumic/filthy-rich-prompts/issues/new?template=01-bug-report.yml).
3. **Include:**
   - The raw prompt (exactly as typed)
   - The refined output
   - The version (`npm list filthy-rich-prompts` or check `package.json`)
   - Node.js and OpenCode versions


The refinement pipeline is designed with multiple safeguards (immutable originals, required explanations per change, verification pass), but no system is perfect. Every confirmed drift report becomes a new benchmark fixture.

---

## 5. Build Errors (`pnpm build`)

**Symptom:** `pnpm build` fails with errors.

**Cause:** Node.js or pnpm version mismatch.

**Solution:**

1. **Check Node version:**
   ```cmd
   node --version
   ```
   Requires Node **22+** (active LTS). See `.nvmrc` for the pinned minor.

2. **Check pnpm version:**
   ```cmd
   pnpm --version
   ```
   Must match `packageManager` in `package.json` (currently `pnpm@10.13.1`). If wrong:
   ```cmd
   corepack enable
   corepack prepare pnpm@10.13.1 --activate
   ```

3. **Clean and retry:**
   ```cmd
   pnpm clean               # if available, otherwise:
   rm -rf node_modules
   pnpm install
   pnpm build
   ```

---

## 6. Tests Failing (`pnpm test`)

**Symptom:** `pnpm test` fails on your machine.

**Cause:** Environment setup, Node/pnpm version mismatch, or golden fixtures need regeneration.

**Solution:**

1. **Verify Node and pnpm** (see issue #5).
2. **Run tests with verbose output:**
   ```cmd
   npx vitest run --reporter=verbose
   ```
3. **Golden fixture drift:** If tests fail on golden fixtures, you may need to regenerate:
   ```cmd
   node scripts/update-goldens.mjs
   ```
   **Important:** Only regenerate if you intentionally changed pass behavior. Review the diff before committing.

4. **Check the test matrix:** Tests pass on Node 22/24/26 on Windows, macOS, and Linux in CI. If they fail only on your machine, it's likely an environment issue.

---

## 7. Config File Errors

**Symptom:** OpenCode or the plugin reports a config parsing error.

**Cause:** Invalid JSON, or using comments in a strict JSON parser.

**Solution:**

- **JSON syntax:** Use a JSON linter to validate your config. Trailing commas are not allowed in strict JSON.
- **Comments:** If you need comments, use JSONC format (JSON with comments). Some parsers accept it, others don't. The full `refine.config.json` spec uses JSONC; `opencode.json` uses strict JSON.
- **Common mistakes:**
  ```jsonc
  // ❌ Wrong: trailing comma
  { "autoRefine": true, }

  // ❌ Wrong: single quotes
  { 'autoRefine': true }

  // ✅ Correct
  { "autoRefine": true }
  ```

- **Path issues on Windows:** Use escaped backslashes or forward slashes:
  ```json
  { "plugin": [["C:\\Users\\Me\\.config\\opencode\\plugin\\plugin.js", { "autoRefine": true }]] }
  ```

---

## 8. Where to Get Help

| Resource | Location |
| -------- | -------- |
| **Bug reports** | [GitHub Issues — Bug report form](https://github.com/NicoDoumic/filthy-rich-prompts/issues/new?template=01-bug-report.yml) |
| **Feature requests** | [GitHub Issues — Feature request form](https://github.com/NicoDoumic/filthy-rich-prompts/issues/new?template=02-feature-request.yml) |
| **Discussions** | [GitHub Discussions](https://github.com/NicoDoumic/filthy-rich-prompts/discussions) |
| **Documentation** | `docs/` directory in the repository |
| **Quickstart** | [docs/quickstart.md](quickstart.md) |

When filing a bug, include:
- Your Node.js version, OS, and OpenCode version
- The exact steps to reproduce
- The raw prompt and refined output (if applicable)
- Any error messages from the OpenCode log (see issue #1)