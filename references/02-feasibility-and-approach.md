# Feasibility verdict & approach selection

## Decision classes

| Class | Meaning | Typical effort |
|---|---|---|
| **A** | Direct port: reconstructed/source project builds to WebGL nearly as-is | low |
| **B** | Direct port + middleware replacements (netcode/voice/TTS/Steam removal) | medium |
| **C** | Hybrid: core in WASM, some systems reimplemented in JS | medium-high |
| **D** | Rewrite/reimplement: engine/model incompatible | very high |
| **E** | Not feasible client-side → cloud streaming only | n/a (ops cost) |

## Scoring checklist (score each 0-2; a 0 anywhere is a hard blocker to name)

- **Engine**: Unity + a WebGL-supported version? (Unity 2018.3+ is the practical
  floor; older needs a version bump or a rewrite.)
- **Scripting**: IL2CPP generally exports cleanly; heavy Mono reflection may not.
- **Rendering**: built-in/URP mostly fine; HDRP and compute-heavy shaders are
  often a blocker on WebGL.
- **Middleware**: does every critical SDK have a browser-capable path or a
  substitutable one?
- **Networking**: can it use WebSocket/WebRTC and does it have a WebGL transport?
- **Native plugins**: any `*_x86_64.dll`/`.so` with no WASM alternative is a
  blocker or a rewrite.
- **Anti-cheat/DRM**: Denuvo/EAC/BattlEye = effectively **E** unless removed.
- **Assets**: total size vs a tolerable first-load (see asset delivery notes).
- **Platform APIs**: Steam, filesystem, registry, threads absence handled.

## Red flags that force E or D

- Kernel-level anti-cheat or always-online DRM you cannot legally remove.
- A rendering path with no WebGL/WebGPU target (heavy HDRP, GPU compute).
- A networking model that requires raw UDP *and* the user refuses WebRTC/TCP.
- Console-exclusive or platform-locked assets/APIs.
- Requirements that need threads/wasm SIMD/full memory that browsers forbid.

## Approach options (pick ONE, name the runner-up)

1. **Unity WebGL export** from a reconstructed project - default for A/B.
   Most faithful; cost is the reconstruction + middleware substitution.
2. **Emscripten/WASM native rebuild** - for non-Unity engines or to keep native
   plugins by rebuilding them to WASM.
3. **Wrap an existing WASM build** - rare; only if one already exists.
4. **Pixel streaming** - Phase 2 = E. Runs the real game server-side, streams
   video to the browser. Always works; highest latency and running cost; needs a
   GPU host per concurrent player. Good for "demo now", bad for scale.
5. **Partial HTML rewrite** - reimplement the shell/UI/menus in HTML/JS while the
   game core runs in WASM. Useful for menus, matchmaking, and account pages.

## Output of this phase

For the chosen class: a **go/no-go**, the **blocker list** with a mitigation each,
the **residual risk**, a rough **effort**, and the **chosen approach + why**.
Then ask the user to accept before any build work.
