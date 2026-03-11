#Requires -Version 5.1
[CmdletBinding()]
param(
    [switch]$Full,
    [switch]$Addon,
    [switch]$Bridge,
    [switch]$StartBridge,
    [switch]$NoApply,
    [switch]$Help,
    [string]$RepoBase = "https://raw.githubusercontent.com/Ketchio-dev/ivLyrics-Web-AI-Provider/main"
)

$ErrorActionPreference = "Stop"

function Write-Info($Message) { Write-Host "[INFO]  $Message" -ForegroundColor Cyan }
function Write-Ok($Message) { Write-Host "[OK]    $Message" -ForegroundColor Green }
function Write-Warn($Message) { Write-Host "[WARN]  $Message" -ForegroundColor Yellow }
function Write-Err($Message) { Write-Host "[ERROR] $Message" -ForegroundColor Red }

if ($Help) {
    Write-Host "Usage: .\install.ps1 [OPTIONS]"
    Write-Host ""
    Write-Host "Options:"
    Write-Host "  -Full         Install addon + bridge"
    Write-Host "  -Addon        Install addon only"
    Write-Host "  -Bridge       Install bridge only"
    Write-Host "  -StartBridge  Start bridge in background after install"
    Write-Host "  -NoApply      Skip spicetify apply"
    Write-Host "  -Help         Show this help"
    exit 0
}

if (-not ($Full -or $Addon -or $Bridge)) {
    $Full = $true
}
if ($Full) {
    $Addon = $true
    $Bridge = $true
}

function Require-Command([string]$Name) {
    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
        throw "Required command not found: $Name"
    }
}

function Ensure-Dir([string]$Path) {
    if (-not (Test-Path -LiteralPath $Path)) {
        New-Item -ItemType Directory -Path $Path -Force | Out-Null
    }
}

function Get-SpicetifyCandidates {
    $candidates = @()
    try {
        $cfg = (& spicetify -c 2>$null | Select-Object -First 1)
        if (-not [string]::IsNullOrWhiteSpace($cfg)) {
            $candidates += (Split-Path -Parent $cfg.Trim())
        }
    } catch {}

    $candidates += @(
        (Join-Path $env:LOCALAPPDATA "spicetify"),
        (Join-Path $env:APPDATA "spicetify"),
        (Join-Path $env:USERPROFILE ".config\spicetify"),
        (Join-Path $env:USERPROFILE ".spicetify")
    )

    $seen = @{}
    foreach ($item in $candidates) {
        if (-not [string]::IsNullOrWhiteSpace($item) -and -not $seen.ContainsKey($item)) {
            $seen[$item] = $true
            $item
        }
    }
}

function Resolve-SpicetifyConfig {
    foreach ($candidate in Get-SpicetifyCandidates) {
        if (Test-Path -LiteralPath (Join-Path $candidate "CustomApps\ivLyrics")) {
            return $candidate
        }
        if (Test-Path -LiteralPath $candidate) {
            return $candidate
        }
    }
    return (Join-Path $env:LOCALAPPDATA "spicetify")
}

function Download-File([string]$RemotePath, [string]$Destination) {
    Ensure-Dir (Split-Path -Parent $Destination)
    Invoke-WebRequest -UseBasicParsing -Uri "$RepoBase/$RemotePath" -OutFile $Destination
}

function Ensure-AddonManifestEntry([string]$ManifestPath) {
    if (-not (Test-Path -LiteralPath $ManifestPath)) { return }
    $raw = Get-Content -LiteralPath $ManifestPath -Raw
    if ($raw -match '"Addon_AI_FreeAIprovider\.js"') { return }
    $replacement = "`"Addon_AI_FreeAIprovider.js`"," + [Environment]::NewLine + "		`$1"
    $updated = [regex]::Replace($raw, '("Addon_AI_Gemini\.js",)', $replacement, 1)
    [System.IO.File]::WriteAllText($ManifestPath, $updated, New-Object System.Text.UTF8Encoding($false))
}

$SpicetifyConfig = Resolve-SpicetifyConfig
$IvLyricsApp = Join-Path $SpicetifyConfig "CustomApps\ivLyrics"
$BridgeDir = Join-Path $SpicetifyConfig "freeai-bridge"

if ($Addon) {
    Write-Info "Installing addon into $IvLyricsApp"
    Ensure-Dir $IvLyricsApp
    Download-File "Addon_AI_FreeAIprovider.js" (Join-Path $IvLyricsApp "Addon_AI_FreeAIprovider.js")
    Ensure-AddonManifestEntry (Join-Path $IvLyricsApp "manifest.json")
    Write-Ok "Addon installed"
}

if ($Bridge) {
    Require-Command "node"
    Require-Command "npm"

    Write-Info "Installing bridge into $BridgeDir"
    Ensure-Dir $BridgeDir
    Download-File "freeai-bridge/server.js" (Join-Path $BridgeDir "server.js")
    Download-File "freeai-bridge/start-background.js" (Join-Path $BridgeDir "start-background.js")
    Download-File "freeai-bridge/stop-background.js" (Join-Path $BridgeDir "stop-background.js")
    Download-File "freeai-bridge/package.json" (Join-Path $BridgeDir "package.json")
    Download-File "freeai-bridge/package-lock.json" (Join-Path $BridgeDir "package-lock.json")
    Download-File "freeai-bridge/README.md" (Join-Path $BridgeDir "README.md")
    Download-File "freeai-bridge/providers.example.json" (Join-Path $BridgeDir "providers.example.json")

    Push-Location $BridgeDir
    try {
        npm install
        npx playwright install chromium
    } finally {
        Pop-Location
    }

    Write-Ok "Bridge installed"
}

if ($StartBridge) {
    Push-Location $BridgeDir
    try {
        npm run start:bg
    } finally {
        Pop-Location
    }
}

if (-not $NoApply -and (Get-Command spicetify -ErrorAction SilentlyContinue)) {
    Write-Info "Running spicetify apply"
    spicetify apply
}

Write-Ok "Done"
