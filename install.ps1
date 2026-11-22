# Install the skills in this repo for one or more AI agents (Windows PowerShell).
#
#   .\install.ps1                      # all global locations
#   .\install.ps1 -Target antigravity  # only Antigravity (global)
#   .\install.ps1 -Target claude,agents
#   .\install.ps1 -Project D:\my-app   # into D:\my-app\.agents\skills (workspace, read by Antigravity, Codex, ...)
#
# Targets:
#   antigravity  ~/.gemini/config/skills  and legacy ~/.gemini/antigravity/skills
#   claude       ~/.claude/skills          (Claude Code)
#   agents       ~/.agents/skills          (Codex and other agents using the shared folder)
#   gemini       ~/.gemini/skills          (Gemini CLI)
#   all          every target above
param(
  [string[]]$Target = @("all"),
  [string]$Project = ""
)

$ErrorActionPreference = "Stop"
$repo = Split-Path -Parent $MyInvocation.MyCommand.Path
$src = Join-Path $repo "skills"
$skills = Get-ChildItem -Directory $src | Where-Object { Test-Path (Join-Path $_.FullName "SKILL.md") }

$map = @{
  antigravity = @("$HOME\.gemini\config\skills", "$HOME\.gemini\antigravity\skills")
  claude      = @("$HOME\.claude\skills")
  agents      = @("$HOME\.agents\skills")
  gemini      = @("$HOME\.gemini\skills")
}

$dests = @()
if ($Project -ne "") {
  $dests += (Join-Path (Resolve-Path $Project) ".agents\skills")
} else {
  $names = if ($Target -contains "all") { $map.Keys } else { $Target }
  foreach ($n in $names) {
    if (-not $map.ContainsKey($n)) { throw "Unknown target '$n'. Use: antigravity, claude, agents, gemini, all" }
    $dests += $map[$n]
  }
}

foreach ($d in ($dests | Select-Object -Unique)) {
  New-Item -ItemType Directory -Force -Path $d | Out-Null
  foreach ($s in $skills) {
    $to = Join-Path $d $s.Name
    $item = Get-Item $to -ErrorAction SilentlyContinue
    if ($item -and ($item.Attributes -band [IO.FileAttributes]::ReparsePoint)) {
      Write-Host "  skip $to (is a link, left untouched)"
      continue
    }
    if ($item) { Remove-Item -Recurse -Force $to }
    Copy-Item -Recurse $s.FullName $to
    Write-Host "  installed $($s.Name) -> $to"
  }
}

Write-Host ""
Write-Host "Done. Install the npm packages once if you have not:"
Write-Host "  npm install -g pptxgenjs docx sharp react react-dom react-icons"
Write-Host "Then check with:"
Write-Host "  node `"$src\pptx-deck-builder\scripts\check_deps.js`""
