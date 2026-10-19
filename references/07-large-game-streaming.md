# Large-game asset streaming: chunked download, cache, eviction

Use this when a game's assets exceed what can be fetched up front or held in
memory - in practice anything much past **~500 MB total**, or whose working set
would exceed **~1-1.5 GB**. The goal is a **streamed install**: a small bootstrap
that downloads, plus content fetched and cached on demand, running inside a
tight memory budget.

This is the pattern behind browser GTA V (`playgta5.net`), the C&C Generals
WASM port, LEGO Racers, and emulator disk streaming - see the case study below.

## The four budgets - keep them separate

| Budget | Meaning | Typical ceiling |
|---|---|---|
| Install/download size | everything the player may eventually fetch | tens of GB, streamed |
| Local cache size | bytes kept in OPFS/IndexedDB | a few GB (user-controlled) |
| Resident memory | WASM heap + JS heap | **wasm32 4 GiB max; wasm64 16 GiB** (no Safari); Unity default 2 GB heap |
| GPU residency | textures/buffers in VRAM | engine-managed; no virtual-texturing API |

A 50 GB game runs in a browser **only** if these are decoupled: stream from
storage, keep the working set small, and evict. "50 GB fully resident" is
impossible - 50 GB is ~12× the wasm32 limit and ~3× wasm64, and the browser tab
dies well before that.

## Architecture: the streamed install

1. **Small bootstrap up front** - loader, engine `.wasm`/framework, menu, UI
   fonts, and the first playable level only.
2. **A manifest** - a file table mapping logical assets → chunk IDs, byte
   ranges, compressed/uncompressed sizes, codec, SHA-256, and a `buildId`.
   Small enough to hold in memory and mirror in IndexedDB.
3. **Chunks fetched by HTTP Range** into a persistent store (OPFS), verified,
   then read back on demand.
4. **LRU eviction** under a budget, with the current level's chunks pinned.
5. **Saves and settings exported or synced off-origin**, because eviction removes
   every store in the origin.

### Storage tiers

| Tier | Store | Budget | Contents |
|---|---|---|---|
| App shell | Cache Storage / HTTP cache | 10-50 MB | HTML, JS, loader, icons |
| Runtime | Cache Storage or OPFS | 20-100 MB | bootstrap `.wasm`, engine modules |
| Hot game data | **OPFS** | seconds-GBs | chunked textures, meshes, audio, level data |
| Metadata | **IndexedDB** | a few MB | manifest, chunk index, LRU table, completion bitmap |
| Saves/settings | IndexedDB, exported or synced off-origin | small | eviction removes same-origin stores, so back them up |

**For a native/WASM runtime, OPFS is the best multi-GB random-access cache.**
`createSyncAccessHandle()` (dedicated workers only) gives synchronous positioned
`read(buffer, {at})` / `write`, which is the primitive a WASM virtual filesystem
needs. IndexedDB can store Blobs and slice them, but it has no synchronous
positioned access and is a poor fit for a hot asset cache. Cache Storage has no
partial reads. The File System Access API is Chromium-only and gesture-gated.
Unity cannot mount OPFS; see the engine-specific section below.

## Chunk protocol rules

- **Content-address chunks** by `sha256`, immutable names → caches dedupe and
  survive version changes.
- **Chunk size is a tuning result, not a rule.** 4-8 MB is a common starting
  point, but real ports range from 512 KiB to 64 MB (LEGO Racers to Generals).
  Derive it from measured RTT, throughput and asset access patterns, and test
  cancellation on teleport and level change.
- **Compress each chunk independently.** Never whole-file `gzip` if you need
  byte ranges - offsets then refer to compressed bytes and random access breaks.
  (In practice gzip/deflate in `DecompressionStream` is portable; Brotli is not
  a safe baseline - feature-detect and fall back.)
- **Parallel range requests** (4-8 over HTTP/2-3); coalesce adjacent small
  chunks; cancel outstanding requests on teleport/level change.
- **Verify SHA-256** per chunk; write to a temp name then rename; keep a
  **completion bitmap** so an interrupted install resumes with `If-Range`/`ETag`.
- Serve `Accept-Ranges: bytes`, `206 Partial Content` + `Content-Range`, and
  expose `Content-Range`/`Accept-Ranges`/`Content-Length` for CORS.

## Quotas, persistence, eviction

- Per-origin quota: **Chrome ~60% of total disk** (browser-wide ~80%);
  **Firefox best-effort `min(10% disk, 10 GiB)`**; **Safari ~60%** but evicts
  script-writable storage after **7 days** without interaction; **incognito**
  is memory-backed (~5-6% of RAM). A 50 GB install is desktop-only and still
  fails on Firefox best-effort and on Safari/iOS.
- `navigator.storage.estimate()` is approximate; `persist()` requests
  protection from auto-eviction (it does **not** raise quota; Chrome decides
  silently, Firefox prompts). `persisted()` checks it.
- **Eviction is all-or-nothing per origin** - when an origin is evicted, OPFS,
  IndexedDB and Cache Storage go together, so a "separate" IndexedDB does not
  save the player's data. Export saves, sync them to a server, or host them on
  another origin.
- Handle `QuotaExceededError` (check `err.name`): evict the oldest unpinned
  ~10%, re-read `estimate()`, retry once; if it still fails, drop to
  streaming-only and warn the player.
- **Evict** at ~80% of the cache budget: keep `lastAccess/size/pinned/buildId`
  in IndexedDB, pin the current level, and prefetch a ring around the player.
  Keep the previous `buildId` for rollback and switch the manifest pointer in two
  phases; do not delete a build another tab may still be using.
- **Multi-tab:** OPFS sync handles are exclusive, and an async `getFile()` while
  another tab appends can return stale or short data. Keep chunks immutable,
  elect one downloader with the **Web Locks API**, and let other tabs read
  snapshots. Service workers cannot use sync handles.

## Why streaming is mandatory (memory numbers)

- **wasm32:** 4 GiB hard ceiling. Unity's initial and maximum heap are
  version-specific and usually far below it.
- **wasm64 / memory64:** 16 GiB top on Chrome and Firefox, no Safari, and slower.
  Unity support depends on the editor version.
- Measure the real tab budget: JS, GPU and network memory sit outside the heap.
- The Unity heap is one contiguous buffer; growth is one-way and can fail.
  Textures also live in GPU memory. So only the working set can be resident.
- There is **no `mmap`** for WASM. Emulate demand paging: fixed-size pages, an
  LRU page table, read-from-OPFS-on-miss, copy into the heap, evict cold pages.

## Engine-specific

**Unity.** `.data` downloads **whole** unless you move content into
**Addressables remote groups** or enable **Progressive Asset Loading** (a Unity 6
feature; verify the exact version before relying on it, and note it is
incompatible with exact-version reconstruction on older editors). AssetBundles
must be **LZ4** (no LZMA on Web) and the whole bundle is held in memory when
loaded, so pack **2-10 MB per bundle** by zone/chapter and release promptly.
There is **no OPFS zero-copy**: assets always land in the heap. `Caching` is
unsupported on Web and `GetDownloadSizeAsync` does **not** reflect the browser
cache. Unity's automatic IndexedDB bundle cache grows across levels and builds
and has no eviction API, so manage it from JS or ship a clear-cache control.
Do not assume wasm64 on older editors. For Unity, large-game streaming is
Addressables zone bundles plus careful cache management; the OPFS block-cache
pattern needs a custom JS layer.

**Custom Emscripten/C++ (or other engines with a filesystem hook).** Implement a
**WASMFS fetch backend** (HTTP-Range reads; Emscripten default 16 MiB chunks) and
an **OPFS backend** for writes, then a demand-paged VFS. This is the pattern the
large webports actually use and is more capable than stock Unity for this
specific job.

**Emulator targets.** Stream the disk image (js-dos Sockdrive style) rather than
downloading the ROM whole.

## Case study: playgta5.net (technique reference)

Verified from the site's own served files:

- **Real client-side execution, not pixel streaming.** The game engine is
  compiled to **WebAssembly (Emscripten)** and renders through a **D3D11 →
  WebGPU** translation layer in a dedicated GPU worker. Threaded (WebAssembly
  **Memory64** + `SharedArrayBuffer`), which requires cross-origin isolation
  (`COOP`/`COEP` headers).
- **Progressive streaming, small boot.** ~**580 MB boot-set prefetch** delivered
  by **HTTP Range** requests (dozens of lanes), not a full download.
- **OPFS is the cache**: an append-only block store (`gamedata/store.bin` plus a
  journal) written via `createSyncAccessHandle()`, streamed chunk-by-chunk - no
  JS buffering. **IndexedDB** holds only saves and cached GPU pipeline recipes.
  No service worker and no Cache API (older versions used them; they were
  removed).
- **~3 GB** of local cache; **no eviction** (append-only, reset only on a new
  build). The full mirror is ~21 GB, so the cache is a small on-demand subset.
- Published figures put it at roughly **~700 MB** instead of a ~170 GB install.
  Treat every size here as **observed on one build**, not as a planning target.
- **Caveat:** this build derives from leaked engine source. Cite it as a
  *technique* reference only. It is not a licence model - the assets are
  proprietary and must not be redistributed. Engine source is not a right to
  ship assets.

## Feasibility questions (feed into Phase 2)

- Are assets chunkable by level/zone? Is there an archive/manifest you can split?
- Does the engine support async asset load **and unload**?
- Can the working set stay ≤ ~1-1.5 GB desktop?
- Does the CDN support Range, immutable chunk names, and CORS?
- Is the target desktop (persistent storage) or mobile (a few GB won't fit)?

## Time-to-first-play budgets

| Item | Target |
|---|---|
| Loader + framework + wasm | 3-8 MB |
| Boot data / first playable | < 5-10 MB (Unity) to a few hundred MB (streamed AAA) |
| Resident heap, desktop | 1-1.5 GB |
| Resident heap, mobile | 256-512 MB |
| Chunk size | 4-8 MB compressed |
| Eviction threshold | ~80% of the cache budget |
