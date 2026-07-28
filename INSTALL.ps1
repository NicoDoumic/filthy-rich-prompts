<#
╔══════════════════════════════════════════════════════════════════════╗
║  filthy-rich-prompts — Auto-Refine Plugin Installer for OpenCode   ║
║  Version: v0.2.0-next.0 · Pre-release                             ║
╚══════════════════════════════════════════════════════════════════════╝

This script installs the filthy-rich-prompts auto-refine plugin into
OpenCode's global plugin directory and prints configuration instructions.

The recommended installation method is:
  npx filthy-rich-prompts install

This script is a fallback for environments where npx is unavailable.

Usage:
  .\INSTALL.ps1

Requirements:
  - PowerShell 5.1+ (comes with Windows 10/11)
  - OpenCode 1.18.5+
  - The `dist/opencode-plugin.js` file must exist (run `pnpm build` first)
#>

$ErrorActionPreference = "Stop"

# ────────────────────────────────────────────────────────────────────
#  Step 1: Locate the plugin bundle
# ────────────────────────────────────────────────────────────────────
$RepoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$PluginSource = Join-Path $RepoRoot "dist" "opencode-plugin.js"

if (-not (Test-Path $PluginSource)) {
    Write-Host "✗ Plugin bundle not found at: $PluginSource" -ForegroundColor Red
    Write-Host "  Build it first by running: pnpm build" -ForegroundColor Yellow
    exit 1
}

# ────────────────────────────────────────────────────────────────────
#  Step 2: Create OpenCode plugin directory (global)
# ────────────────────────────────────────────────────────────────────
$PluginDir = "$env:USERPROFILE\.config\opencode\plugin"
$PluginDest = Join-Path $PluginDir "filthy-rich-prompts.js"

New-Item -ItemType Directory -Path $PluginDir -Force -ErrorAction SilentlyContinue | Out-Null
Copy-Item $PluginSource $PluginDest -Force

Write-Host "✓ Plugin installed to: $PluginDest" -ForegroundColor Green

# ────────────────────────────────────────────────────────────────────
#  Step 3: Configure OpenCode to load the plugin
# ────────────────────────────────────────────────────────────────────
$ConfigPath = "$env:USERPROFILE\.config\opencode\opencode.json"

Write-Host ""
Write-Host "── Step 3: Configure OpenCode ──────────────────────────" -ForegroundColor Cyan
Write-Host ""
Write-Host "OpenCode needs to be told to load the plugin."
Write-Host ""
Write-Host "Run this command to open your OpenCode config:"
Write-Host ""
Write-Host "  code $ConfigPath"
Write-Host ""
Write-Host "Then add or update the `"plugin`" array in opencode.json:"
Write-Host ""

$ConfigEntry = "[""$PluginDest"", { ""autoRefine"": true }]".Replace("\", "\\")

Write-Host '  {'
Write-Host "    `"plugin`": [$ConfigEntry]"
Write-Host '  }'
Write-Host ""
Write-Host "If you already have plugins, just append to the array:"
Write-Host ""
Write-Host '  {'
Write-Host '    "plugin": ['
Write-Host '      ["existing-plugin.js"],'
Write-Host "      $ConfigEntry"
Write-Host '    ]'
Write-Host '  }'
Write-Host ""
Write-Host "Set `"autoRefine`": false to disable without uninstalling."

# ────────────────────────────────────────────────────────────────────
#  Step 4: Verification instructions
# ────────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "── Step 4: Verify ───────────────────────────────────────" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Restart OpenCode (Ctrl+C if running, then restart)"
Write-Host "2. Inside OpenCode, run:  opencode debug skill"
Write-Host "3. Verify both ""prompt-refiner"" (skill) and the auto-refine plugin are active"
Write-Host ""
Write-Host "If something failed, check the log:"
Write-Host ""
Write-Host "  Get-Content ""$env:USERPROFILE\.local\share\opencode\log\opencode.log"" | Select-String ""failed to load plugin"""
Write-Host ""

# ────────────────────────────────────────────────────────────────────
#  How it works
# ────────────────────────────────────────────────────────────────────
Write-Host "── How Auto-Refine Works ──────────────────────────────" -ForegroundColor Cyan
Write-Host ""
Write-Host "With ""autoRefine"": true, every prompt you type in OpenCode"
Write-Host "is automatically refined before reaching the agent:"
Write-Host ""
Write-Host "  1. You type a prompt (e.g. ""fix the login it's slow"")"
Write-Host "  2. The refiner restructures it into clear sections"
Write-Host "  3. If critical context is missing, the agent asks you first"
Write-Host "  4. The refined prompt is what the model receives"
Write-Host ""
Write-Host "To disable: set ""autoRefine"": false in opencode.json and restart."
Write-Host ""

Write-Host "✓ Installation complete. Happy refining!" -ForegroundColor Green