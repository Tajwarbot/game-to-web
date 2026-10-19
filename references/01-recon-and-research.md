# Recon & research: identify what we are porting

Goal: fill a **Research Dossier** with evidence, so feasibility is decided from
facts. Never guess the engine or middleware.

## Where to look (in order)

1. **Game directory layout.** Unity desktop builds ship:
   - `Game.exe`, `Game_Data/` (`Managed/`, `Resources/`, `StreamingAssets/`,
     `Plugins/`), and `UnityPlayer.dll`.
   - `Managed/` shows **Mono** (has `Assembly-CSharp.dll`) vs **IL2CPP**
     (`GameAssembly.dll` + `global-metadata.dat`, no managed DLLs).
   - `StreamingAssets/` and `Plugins/` reveal native deps (e.g. `steam_api64.dll`,
     `fmod.dll`, `speechsdk`).
2. **Data files.** `Game_Data/level*`, `.assets`, `globalgamemanagers`, and
   `*.resS` hold assets; `Resources/unity default resources` is engine-side.
3. **Config/INI/JSON** next to the exe: engine settings, renderer, quality.
4. **Binary strings** (a fast triage):
   - Engine: `UnityEngine`, `il2cpp`, `UnityPlayer`, `Unity2016+`.
   - Middleware keywords: `Photon`, `PUN`, `exitgames`, `Steamworks`, `steam_api`,
     `FMOD`, `wwise`, `FMODAudio`, `Vivox`, `Dissonance`, `Mirror`, `Netcode`,
     `Nakama`, `Firebase`, `PlayFab`, `EasyAntiCheat`, `BattlEye`, `Denuvo`,
     `Havok`, `PhysX`, `AVProVideo`, `InControl`, `Rewired`, `TextMeshPro`.
   - Codec/native: `libopus`, `speex`, `ffmpeg`, `openh264`.
5. **Version strings** in `globalgamemanagers` / `app.info` / `boot.config`
   (`Unity 2019.4.x`, `2021.3.x`, ...). The Unity version pins the export pipeline.

## Reconstructing a project (when there is no source)

- **AssetRipper** turns a build's assets into a Unity project (`ExportedProject/`
  with `Assets/` and `ProjectSettings/`). It does **not** recover IL2CPP logic:
  scripts come back as stubs.
- **IL2CPP needs a code-recovery step.** Dump `global-metadata.dat` with
  Il2CppDumper or Cpp2IL, decompile the IL, and check for obfuscation,
  encryption and control-flow flattening. Decompile about 20 core methods and
  judge readability. Coverage decides the class:
  - readable and bounded: a reconstruction is plausible (class B);
  - unreadable or unbounded: default to class D (rewrite), not B.
- **Mono** builds are easier: `Assembly-CSharp.dll` decompiles with a standard
  .NET decompiler.
- Keep the reconstruction **separate** from any hand-written port code so it can
  be re-imported when the pipeline changes.

## Dossier template (fill every row, cite the source)

| Field | Value | Evidence |
|---|---|---|
| Game / version | | |
| Engine + version | | |
| Scripting backend | IL2CPP / Mono | `Managed/` vs `GameAssembly.dll` |
| Rendering pipeline | Built-in/URP/HDRP | assets/strings |
| Networking SDK | | strings/plugins |
| Voice / audio middle-ware | | plugins |
| Input system | old/new/middleware | strings |
| DRM / anti-cheat | | plugins |
| Native plugins | | `Plugins/`, `MonoBleedingEdge` |
| UI framework | uGUI/IMGUI/UITK | assemblies |
| Save system | | files/registry/strings |
| Asset size / formats | | data dir |
| Native-only systems | | analysis |

## Universal questions to answer

- Which subsystems have **no browser equivalent** (Steam, anti-cheat, native
  voice, OS dialogs, threads, raw sockets)?
- Which subsystems have a **drop-in browser equivalent** (see the lessons file)?
- What is **hard-wired to the desktop runtime** (standalone defines, `#if
  UNITY_STANDALONE`, `Application.Quit`, file paths, `Registry`)?

Output the dossier, then list the open questions and how you would close them
(another strings pass, a build attempt, asking the user).
