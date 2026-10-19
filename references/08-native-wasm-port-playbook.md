# Native / WASM port playbook (non-Unity, and custom engines)

Use this path when the game is **not Unity**, when its engine can be rebuilt from
source (open-source or decompiled), or when a large native plugin must be
recompiled to WASM. It is also the path for **emulator** targets with no source.

It matters because it is where real **demand-paged streaming** lives: you control
the asset format and the filesystem, so you can implement the OPFS block-cache
pattern that a stock Unity build cannot.

## When this is the right path

- The game runs on open-source or decompiled engine source (e.g. C&C Generals
  GPL, Warzone 2100, OpenTTD, LEGO Racers, Diablo / MapleStory decompilations).
- You need demand-paged streaming (OPFS block cache, content-addressed chunks)
  that Unity's `.data`/AssetBundle model cannot give you.
- A heavy native plugin has portable C/C++ you can compile to WASM.
- You want WebAssembly threads / `SharedArrayBuffer` and full filesystem control.

## Toolchain

- **Emscripten (`emcc`)** compiles C/C++ to WebAssembly; SDL/GLES glue to the canvas.
- **Graphics:** OpenGL ES 3 → **WebGL2** (SDL2/GLES3 or ANGLE); Direct3D-era
  titles use a **D3D → WebGL2/WebGPU** translation layer.
- **Threads:** `-pthread` + `SharedArrayBuffer` require cross-origin isolation
  (**COOP/COEP**). A service worker can inject those headers on plain static hosting.
- **64-bit:** **memory64** when a >4 GB address space is needed (Chrome/Firefox,
  not Safari).
- **Audio:** **AudioWorklet** (needs a user gesture to start).
- **Networking:** games that spoke TCP/UDP go through a **WebSocket proxy** to a
  relay; WebRTC data channels are the lower-latency alternative.
- **Filesystem:** Emscripten FS (MEMFS / IDBFS / WORKERFS / custom backends) or
  the newer **WASMFS** with pluggable backends.

## The streaming filesystem (the core of this path)

- **WASMFS fetch backend** - file reads become **HTTP Range** requests (default
  16 MiB chunks); requires a worker thread.
- **OPFS backend** - downloaded bytes persist in the Origin Private File System.
- **`FS.createLazyFile()`** - a file loads on first access (worker-only).
- **`WORKERFS`** - mount a user-supplied `File`/`Blob` without copying it all
  into memory; ideal for "bring your own assets".
- **`IDBFS`** - IndexedDB-backed persistence for **saves/config**, synced with
  `FS.syncfs()`.

The production pattern is a **custom lower FS backend**: read/write go through a
chunk cache - manifest → chunk IDs → OPFS hit or HTTP-Range fetch → verify →
write → LRU evict. That is genuine demand paging, and it is what makes a
tens-of-GB game run in a browser tab.

## Case studies (technique references)

| Project | Approach | Numbers / notes |
|---|---|---|
| C&C Generals: Zero Hour | ~500k LOC C++ → WASM; D3D8 → WebGL2; GAXD archives | ~2 GB streamed as 64 MB Brotli segments decompressed in a worker into OPFS; peak RAM ~130 MB; service worker injects COOP/COEP; WebRTC multiplayer |
| LEGO Racers | Emscripten; WASMFS fetch backend | 512 KiB HTTP-range chunks for archive/music/movies; OPFS saves |
| LEGO Island | Emscripten; original streaming code | ~25 MB first load; optional ~550 MB full offline install |
| MapleStory v83 | Original C++ client → WASM | WebSocket proxy for TCP; "LazyFS" streams `.nx` on demand and caches |
| Warzone 2100 / OpenTTD / Diablo Web | Emscripten / WebGL2 | async streaming, on-demand video, IndexedDB saves, user-supplied assets |

These assets are proprietary. Open-source engine code is **not** a licence to ship
the game's content - see the legal note in `05-hard-won-lessons.md`.

## Emulator path (no source, no port)

When there is no source and no port, emulate the original in the browser:

- **EmulatorJS / RetroArch (libretro cores)** - consoles; MEMFS for ROMs, IDBFS
  for saves; some cores require threads + COOP/COEP.
- **js-dos / DOSBox-X** - DOS/Windows 9x; **Sockdrive** streams large FAT disk
  images on demand instead of downloading the whole image.
- Practical ceiling: PS1/N64/PSP/DOS are viable; PS2/GameCube/Xbox/3DS generally
  are not.

## Build order

1. Get it compiling to WASM.
2. Map input to DOM events / pointer lock.
3. Get one frame rendering.
4. Replace networking with a WebSocket/WebRTC proxy.
5. Repackage assets into chunkable archives + a manifest.
6. Implement the streaming FS (WASMFS fetch + OPFS + LRU).
7. Cache the first level; prefetch a ring around the player.
8. Persist saves in a store separate from the cache.

## Gotchas

- Threads need **COOP/COEP**; inject them with a service worker on static hosting.
- GLES3 → WebGL2 feature gaps and shader translation cost; expect cold-cache
  shader stutter on first run.
- `AudioContext` needs a user gesture.
- wasm32's **4 GB** limit means stream; do not try to load the world.
- OPFS sync handles are worker-only and exclusive - elect one downloader tab with
  the **Web Locks API**.
- Keep saves out of the disposable cache (eviction is all-or-nothing per origin).

## How it differs from Unity

You own the asset format and the filesystem, so you can implement the full OPFS
demand-paged block cache with content-addressed chunks. Unity's `.data` and
AssetBundle model cannot do OPFS zero-copy, so Unity streaming is coarser (zone
bundles). This path is more work for materially more control.
