param(
    [int]$BackendPort = 8001,
    [int]$FrontendPort = 3002
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot

Start-Process powershell -ArgumentList @(
    "-NoExit",
    "-ExecutionPolicy", "Bypass",
    "-File", (Join-Path $PSScriptRoot "run-backend.ps1"),
    "-Port", "$BackendPort"
) -WorkingDirectory $Root

Start-Process powershell -ArgumentList @(
    "-NoExit",
    "-ExecutionPolicy", "Bypass",
    "-File", (Join-Path $PSScriptRoot "run-frontend.ps1"),
    "-Port", "$FrontendPort",
    "-ApiBaseUrl", "http://127.0.0.1:$BackendPort"
) -WorkingDirectory $Root

Write-Host "Started Rush Tracker backend on $BackendPort and frontend on $FrontendPort."
