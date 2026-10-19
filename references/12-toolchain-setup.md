# Toolchain setup

Check first, install with consent, verify. Never start research or a build on an
unverified toolchain, and record the versions in `STATE.md` so a later failure
can be attributed to a tool change.

Run the checker before anything else:

- Windows: `pwsh -File scripts/check-tools.ps1`
- macOS / Linux: `bash scripts/check-tools.sh`

To install the common Windows tools, see `scripts/setup-windows.ps1` (it prints
commands unless you pass `-Yes`).

## Core tools (every approach)

| Tool | Why | Verify |
| --- | --- | --- |
| Git | source control, releases | `git --version` |
| Node LTS | headless test harnesses, tooling | `node -v` |
| Python 3 | static server, small scripts | `python --version` |
| Chrome or Chromium | drive the build headlessly | `chrome --version` |
| 7-Zip or unzip | inspect builds and archives | `7z` |
| ffmpeg | extract or convert audio and video | `ffmpeg -version` |

## Unity WebGL

| Tool | Why |
| --- | --- |
| Unity Hub | install and switch editors |
| Unity Editor at the game's exact version | reconstruction must match the asset format |
| WebGL Build Support module | the build target |
| IL2CPP | script compilation for the build |
| AssetRipper | turn a shipped build into a project |
| Il2CppDumper or Cpp2IL | recover IL2CPP metadata and IL; AssetRipper alone is not enough |
| .NET SDK (if the project needs it) | script tooling |

Install the editor version that matches the game. A mismatched editor is the most
common cause of a reconstruction that will not open. Record the version.

## Native / WASM

| Tool | Why |
| --- | --- |
| Emscripten SDK (`emsdk`) | compile C/C++ to WebAssembly |
| CMake | build system for most native engines |
| Ninja or Make | fast builds |
| Python 3 | emsdk and build scripts |
| Engine source | the thing you are compiling |

Verify with `emcc --version`.

## Emulator path

| Tool | Why |
| --- | --- |
| Emscripten SDK or a prebuilt emulator | the emulator core |
| The emulator project | libretro core, DOSBox, and so on |
| The user's own game media | never redistribute it |

## Hosting and delivery

| Tool | Why |
| --- | --- |
| Cloudflare account and API token, or another host | static delivery |
| `wrangler` or the provider API | deploy the worker and assets |
| `boto3` (Python) | chunked uploads to R2 or S3 |
| A domain | optional, for a stable URL |

## Install commands

### Windows (winget)

```powershell
winget install --id Git.Git -e
winget install --id OpenJS.NodeJS.LTS -e
winget install --id Python.Python.3.12 -e
winget install --id Google.Chrome -e
winget install --id 7zip.7zip -e
winget install --id Gyan.FFmpeg -e
winget install --id Kitware.CMake -e
winget install --id Microsoft.VisualStudio.2022.BuildTools -e
winget install --id Unity.UnityHub -e
```

Then, in Unity Hub, install the matching editor plus WebGL Build Support and
IL2CPP. AssetRipper is a release download from its GitHub page.

Emscripten:

```powershell
git clone https://github.com/emscripten-core/emsdk.git C:\emsdk
cd C:\emsdk
.\emsdk install latest
.\emsdk activate latest
```

### macOS (Homebrew)

```bash
brew install git node python ffmpeg cmake
brew install --cask google-chrome unity-hub
git clone https://github.com/emscripten-core/emsdk.git ~/emsdk
cd ~/emsdk && ./emsdk install latest && ./emsdk activate latest
```

### Linux (Debian/Ubuntu)

```bash
sudo apt update
sudo apt install -y git nodejs npm python3 python3-pip ffmpeg cmake build-essential
# Chrome: install the .deb from Google, or use Chromium
git clone https://github.com/emscripten-core/emsdk.git ~/emsdk
cd ~/emsdk && ./emsdk install latest && ./emsdk activate latest
# Unity Hub: install the .deb or AppImage, then the matching editor
```

## Verification

- `scripts/check-tools.ps1` and `scripts/check-tools.sh` report each tool and its
  version, and exit non-zero when a core tool is missing.
- Add the exact versions to the plan and to `STATE.md`.
- Re-run the checker after any tool upgrade and before a release build.

## Disk and time

- A Unity `Library` can be several GB. Keep at least 20 GB free for a large build.
- A native build can take tens of minutes. Use a detached process and poll logs.
- First-generation asset caches are slow; do not mistake that for a hang.
