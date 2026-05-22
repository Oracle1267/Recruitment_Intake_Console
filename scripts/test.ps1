$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
$PythonExe = Join-Path $Root ".venv\Scripts\python.exe"
$BackendPath = Join-Path $Root "backend"
$FrontendPath = Join-Path $Root "frontend"

function Invoke-Checked {
    param(
        [Parameter(Mandatory = $true)]
        [scriptblock]$Command
    )

    & $Command
    if ($LASTEXITCODE -ne 0) {
        throw "Command failed with exit code $LASTEXITCODE"
    }
}

if (-not (Test-Path $PythonExe)) {
    throw "Backend venv not found. Run scripts\setup-backend.ps1 first."
}

Push-Location $BackendPath
try {
    Invoke-Checked { & $PythonExe -m pytest tests -q }
}
finally {
    Pop-Location
}

Push-Location $FrontendPath
try {
    Invoke-Checked { npm test -- --run }
    Invoke-Checked { npm run build }
}
finally {
    Pop-Location
}

Write-Host "RushIntel verification complete."
