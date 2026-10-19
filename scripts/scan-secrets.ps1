# Scan a folder for likely secrets. Read-only.
# Usage: pwsh -File scripts/scan-secrets.ps1 [-Path <dir>]
param(
    [string]$Path = (Get-Location).Path
)

$patterns = @(
    @{ Name = 'UUID (possible app id)'; Regex = '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}' },
    @{ Name = 'GitHub token';           Regex = 'gh[pousr]_[A-Za-z0-9]{20,}' },
    @{ Name = 'OpenAI key';             Regex = 'sk-[A-Za-z0-9]{20,}' },
    @{ Name = 'AWS access key';         Regex = 'AKIA[0-9A-Z]{16}' },
    @{ Name = 'Private key';            Regex = 'BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY' },
    @{ Name = 'Bearer token';           Regex = 'Bearer\s+[A-Za-z0-9\-._~+/]{16,}' }
)

$secretFiles = @('config.js', '.env', '.env.local', 'worker-*.js')

$hits = @()
$files = Get-ChildItem -LiteralPath $Path -Recurse -File -ErrorAction SilentlyContinue |
    Where-Object { $_.FullName -notmatch '\\\.git\\|\\node_modules\\|\\Build\\|\\Library\\' }

foreach ($f in $files) {
    foreach ($p in $patterns) {
        $m = Select-String -LiteralPath $f.FullName -Pattern $p.Regex -AllMatches -ErrorAction SilentlyContinue
        foreach ($hit in $m) {
            $hits += [pscustomobject]@{
                File = $f.FullName.Replace($Path, '.')
                Line = $hit.LineNumber
                Kind = $p.Name
            }
        }
    }
}

foreach ($name in $secretFiles) {
    Get-ChildItem -LiteralPath $Path -Recurse -File -Filter $name -ErrorAction SilentlyContinue |
        Where-Object { $_.FullName -notmatch '\\\.git\\|\\node_modules\\' } |
        ForEach-Object {
            $hits += [pscustomobject]@{ File = $_.FullName.Replace($Path, '.'); Line = 0; Kind = 'Secret file present' }
        }
}

if ($hits.Count -eq 0) {
    Write-Output "No obvious secrets found in $Path"
    exit 0
}

$hits | Sort-Object File, Line | Format-Table -AutoSize
Write-Output ""
Write-Output ("Potential secrets: " + $hits.Count + ". Review each, then remove or ignore it.")
exit 1
