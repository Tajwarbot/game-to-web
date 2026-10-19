# Check the tools needed for a port. Read-only.
# Usage: pwsh -File scripts/check-tools.ps1
$ErrorActionPreference = 'SilentlyContinue'

function Resolve-Exe([string]$exe, [string[]]$fallbacks) {
    $cmd = Get-Command $exe -ErrorAction SilentlyContinue
    if ($cmd) { return $cmd.Source }
    foreach ($f in $fallbacks) {
        if ($f -and (Test-Path -LiteralPath $f)) { return $f }
    }
    return $null
}

function Get-ToolInfo($c) {
    $path = Resolve-Exe $c.Exe $c.Fallbacks
    if (-not $path) { return $null }
    if ($c.FileVersion) {
        $vi = (Get-Item -LiteralPath $path).VersionInfo
        if ($vi.ProductVersion) { return $vi.ProductVersion }
        if ($vi.FileVersion) { return $vi.FileVersion }
        return 'present'
    }
    $out = & $path @($c.Args) 2>&1 | Select-Object -First 1
    if (-not $out) { $out = 'present' }
    return ([string]$out).Trim()
}

$chromePaths = @(
    "$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
    "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe",
    "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe"
)

$checks = @(
    @{ Name = 'git';     Exe = 'git';     Args = @('--version');  Required = $true;  Fallbacks = @() },
    @{ Name = 'node';    Exe = 'node';    Args = @('-v');         Required = $true;  Fallbacks = @() },
    @{ Name = 'npm';     Exe = 'npm';     Args = @('-v');         Required = $true;  Fallbacks = @() },
    @{ Name = 'python';  Exe = 'python';  Args = @('--version');  Required = $true;  Fallbacks = @() },
    @{ Name = 'chrome';  Exe = 'chrome';  Args = @();             Required = $true;  Fallbacks = $chromePaths; FileVersion = $true },
    @{ Name = '7z';      Exe = '7z';      Args = @();             Required = $false; Fallbacks = @() },
    @{ Name = 'ffmpeg';  Exe = 'ffmpeg';  Args = @('-version');   Required = $false; Fallbacks = @() },
    @{ Name = 'cmake';   Exe = 'cmake';   Args = @('--version');  Required = $false; Fallbacks = @() },
    @{ Name = 'emcc';    Exe = 'emcc';    Args = @('--version');  Required = $false; Fallbacks = @() },
    @{ Name = 'unity';   Exe = 'unity';   Args = @('--version');  Required = $false; Fallbacks = @() }
)

$rows = @()
$missingRequired = @()

foreach ($c in $checks) {
    $v = Get-ToolInfo $c
    $status = if ($v) { 'ok' } else { 'MISSING' }
    if (-not $v -and $c.Required) { $missingRequired += $c.Name }
    $rows += [pscustomobject]@{
        Tool     = $c.Name
        Status   = $status
        Required = if ($c.Required) { 'yes' } else { 'optional' }
        Version  = $v
    }
}

$rows | Format-Table -AutoSize

if ($missingRequired.Count -gt 0) {
    Write-Output ""
    Write-Output ("Missing required: " + ($missingRequired -join ', '))
    Write-Output "See references/12-toolchain-setup.md, or run scripts/setup-windows.ps1."
    exit 1
}

Write-Output ""
Write-Output "Core tools present. Engine tools (unity, emcc) depend on your approach."
exit 0
