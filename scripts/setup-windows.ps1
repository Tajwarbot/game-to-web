# Install the common Windows tools for a game-to-web port.
# Prints the install commands by default. Pass -Yes to run them.
# Usage: pwsh -File scripts/setup-windows.ps1 -Yes
param(
    [switch]$Yes
)

$tools = @(
    @{ Name = 'Git';        Id = 'Git.Git' },
    @{ Name = 'Node LTS';   Id = 'OpenJS.NodeJS.LTS' },
    @{ Name = 'Python 3.12'; Id = 'Python.Python.3.12' },
    @{ Name = 'Chrome';     Id = 'Google.Chrome' },
    @{ Name = '7-Zip';      Id = '7zip.7zip' },
    @{ Name = 'ffmpeg';     Id = 'Gyan.FFmpeg' },
    @{ Name = 'CMake';      Id = 'Kitware.CMake' },
    @{ Name = 'VS Build Tools'; Id = 'Microsoft.VisualStudio.2022.BuildTools' },
    @{ Name = 'Unity Hub';  Id = 'Unity.UnityHub' }
)

Write-Output "Tools for a port. Missing ones are installed with winget."
Write-Output ""

foreach ($t in $tools) {
    $installed = winget list --id $t.Id -e --accept-source-agreements 2>$null | Select-String -SimpleMatch $t.Id
    if ($installed) {
        Write-Output ("ok       " + $t.Name)
        continue
    }

    Write-Output ("MISSING  " + $t.Name + "  ->  winget install --id " + $t.Id + " -e")
    if ($Yes) {
        winget install --id $t.Id -e --accept-package-agreements --accept-source-agreements
    }
}

Write-Output ""
Write-Output "Manual steps that winget cannot do:"
Write-Output "1. Unity Hub: install the editor version that matches the game, plus WebGL Build Support and IL2CPP."
Write-Output "2. AssetRipper: download the release from its GitHub page."
Write-Output "3. Emscripten:"
Write-Output "     git clone https://github.com/emscripten-core/emsdk.git C:\emsdk"
Write-Output "     cd C:\emsdk; .\emsdk install latest; .\emsdk activate latest"
Write-Output ""
Write-Output "Then run: pwsh -File scripts/check-tools.ps1"
