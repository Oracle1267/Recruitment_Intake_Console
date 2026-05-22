$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
$FrontendPath = Join-Path $Root "frontend"

Push-Location $FrontendPath
try {
    npm install
}
finally {
    Pop-Location
}

Write-Host "Frontend dependencies ready: $FrontendPath"

