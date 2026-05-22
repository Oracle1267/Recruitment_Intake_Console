param(
    [int]$Port = 8001,
    [string]$HostAddress = "127.0.0.1"
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
$BackendPath = Join-Path $Root "backend"
$PythonExe = Join-Path $Root ".venv\Scripts\python.exe"

if (-not (Test-Path $PythonExe)) {
    throw "Backend venv not found. Run scripts\setup-backend.ps1 first."
}

Push-Location $BackendPath
try {
    & $PythonExe -m uvicorn app.main:app --host $HostAddress --port $Port --reload
}
finally {
    Pop-Location
}

