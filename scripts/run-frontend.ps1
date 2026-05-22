param(
    [int]$Port = 3002,
    [string]$ApiBaseUrl = "http://127.0.0.1:8001"
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
$FrontendPath = Join-Path $Root "frontend"

$env:NEXT_PUBLIC_API_BASE_URL = $ApiBaseUrl

Push-Location $FrontendPath
try {
    npm run dev -- --port $Port
}
finally {
    Pop-Location
}

