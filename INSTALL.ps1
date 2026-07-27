<#
╔══════════════════════════════════════════════════════════════════════╗
║  filthy-rich-prompts — Auto-Refine Hook para OpenCode              ║
║  Instrucciones para instalar en TU OpenCode manualmente            ║
║  Versión: v0.2.0-next.0 · Pre-release                             ║
╚══════════════════════════════════════════════════════════════════════╝

# ────────────────────────────────────────────────────────────────────
#  PASO 1: Copiar el plugin a la carpeta global de OpenCode
# ────────────────────────────────────────────────────────────────────
# Abrí PowerShell (como usuario normal, no admin) y ejecutá:

New-Item -ItemType Directory -Path "$env:USERPROFILE\.config\opencode\plugin" -Force -ErrorAction SilentlyContinue | Out-Null
Copy-Item "$env:USERPROFILE\Desktop\filthy-rich-prompts\dist\opencode-plugin.js" "$env:USERPROFILE\.config\opencode\plugin\filthy-rich-prompts.js" -Force
Write-Host "✓ Plugin copiado a $env:USERPROFILE\.config\opencode\plugin\filthy-rich-prompts.js"

# ────────────────────────────────────────────────────────────────────
#  PASO 2: Activar el auto-refine en la configuración global
# ────────────────────────────────────────────────────────────────────
# Ejecutá esto para abrir el archivo de configuración global de OpenCode:

code "$env:USERPROFILE\.config\opencode\opencode.json"

# Si el archivo no existe, se va a abrir vacío. Pegá esto adentro:
#
#   {
#     "plugin": [["C:\\Users\\Nico\\.config\\opencode\\plugin\\filthy-rich-prompts.js", { "autoRefine": true }]]
#   }
#
# Si ya tenés otros plugins, concatenalos con coma:
#
#   {
#     "plugin": [
#       ["otro-plugin.js"],
#       ["C:\\Users\\Nico\\.config\\opencode\\plugin\\filthy-rich-prompts.js", { "autoRefine": true }]
#     ]
#   }
#
# Guardá el archivo (Ctrl+S) y cerrá VS Code.

# ────────────────────────────────────────────────────────────────────
#  PASO 3: Reiniciar OpenCode
# ────────────────────────────────────────────────────────────────────
# Cerralo completamente (Ctrl+C en la terminal, o cerrá la ventana).
# Volvé a abrirlo. El auto-refine ya está activo.

# ────────────────────────────────────────────────────────────────────
#  PASO 4: Verificar que cargó
# ────────────────────────────────────────────────────────────────────
# Dentro de OpenCode ejecutá:
#   opencode debug skill
# Tenés que ver "prompt-refiner" en la lista de skills.
# Si ves errores, revisá el log:
#   Get-Content "$env:LOCALAPPDATA\..\..\.local\share\opencode\log\opencode.log" | Select-String "failed to load plugin"

# ╔══════════════════════════════════════════════════════════════════╗
# ║  CÓMO FUNCIONA                                                ║
# ╚══════════════════════════════════════════════════════════════════╝
#
# Con "autoRefine": true, CADA mensaje que escribas en OpenCode
# pasa por el refiner antes de llegar al agente.
#
# Flujo:
#   1. Escribís tu prompt (ej: "arreglá el login que está lento")
#   2. El refiner lo procesa y lo estructura:
#        # Task
#        Arreglá el login que está lento...
#        ## Context
#        Stack: React, Node.js
#   3. Si falta contexto crítico, agrega:
#        ## Open questions (answer before proceeding)
#        - Which database are you on?
#      El agente te pregunta ANTES de ejecutar.
#   4. El prompt refinado es lo que recibe el agente.
#
# Para desactivar: cambiá "autoRefine": true → false y reiniciá.
# Para activar la SKILL manual (sin el hook): usá el nombre
#   "prompt-refiner" en OpenCode y describí tu tarea.
#
# ⚠️  ADVERTENCIA: el pass "structure" es PROVISIONAL
#     contra la verificación semántica (Tier 0 gate).
#     Opera reorganizando y etiquetando, nunca reescribe.
#     Si alguna vez sentís que cambió lo que quisiste decir,
#     reportalo como bug severity-1.
#>