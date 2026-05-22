param(
    [string]$Python = "python"
)

$ErrorActionPreference = "Stop"
& (Join-Path $PSScriptRoot "setup-backend.ps1") -Python $Python
& (Join-Path $PSScriptRoot "setup-frontend.ps1")

Write-Host "RushIntel setup complete."

