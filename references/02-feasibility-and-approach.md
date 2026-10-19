# Feasibility verdict and approach selection

## Verdict discipline

The job is to find a way to make the port work, not to find a reason to refuse it.
A "no" is the last resort.

Every blocker needs at least two candidate solutions before you give up on it:
replace the component, rewrite the system, wrap it, stream it, emulate it, or ask
the user to supply the assets. Test the cheap ones. If a path is untested, the
verdict is "uncertain", not "impossible".

| Verdict | When | What to tell the user |
| --- | --- | --- |
| Go | evidence supports a direct or staged port | the plan, the blockers, the residual risk |
| Uncertain | research is incomplete, or a blocker is untested | your confidence, the missing evidence, the test that would settle it |
| No-go | every candidate path was tested or documented as dead | the paths tried, why each failed, the closest viable alternative |

Never report "cannot be ported" from an untested assumption. If you are unsure,
say that you are unsure, say why, and say what would settle it.

## Legal stop gate

A licensed copy is not a licence to port and publish. Decompilation, asset
extraction and redistribution are separate legal questions: EULA terms,
anti-circumvention law, music/font/voice/middleware licences, and trademarks.
Treat this as a stop gate, not an engineering problem.

- Get written permission, use a clean-room rebuild, or require the user to supply
  their own assets.
- Do not remove anti-cheat or DRM as a "mitigation". That is not a porting task.
- Get legal sign-off before any public deploy.

If the legal basis is unclear, say so and stop. Do not hide it inside a plan.

## Decision classes

| Class | Meaning | Typical effort |
| --- | --- | --- |
| **A** | Direct port: reconstructed/source project builds to WebGL nearly as-is | low |
| **B** | Direct port plus middleware replacements (netcode/voice/TTS/Steam removal) | medium |
| **C** | Hybrid: core in WASM, some systems reimplemented in JS | medium-high |
| **D** | Rewrite or reimplement: engine or model incompatible | very high |
| **E** | Not feasible client-side, so cloud streaming only | n/a (ops cost) |

## Scoring rubric

Score each row 0-2. The anchors:

- **0**: no known path, or the path is untested and blocks everything.
- **1**: a path exists but needs a replacement, a rebuild, or an unproven assumption.
- **2**: a known, tested path exists.

Rows: engine and version, scripting backend, rendering, middleware, networking,
native plugins, anti-cheat/DRM, assets, platform APIs, legal basis.

Hard kills. The verdict cannot be Go if any of these is true:

- **HDRP**, or a renderer with no WebGL/WebGPU target. HDRP does not support
  WebGL. Convert to URP/Built-in (class D) or use pixel streaming.
- **IL2CPP with no source and unreadable recovered IL** (class D).
- **Kernel-level anti-cheat or DRM** that cannot legally be removed (class E).
- **Raw-UDP-only netcode** with no WebRTC, WebTransport or relay path and no
  server authority (class E or D).
- **Licensed content** that cannot be redistributed and cannot be user-supplied
  (legal stop).

## Engine matrix

| Engine | Typical verdict |
| --- | --- |
| Unity, Built-in or URP, Mono or IL2CPP | A/B, with a code-recovery check for IL2CPP |
| Unity HDRP | D (convert) or E (pixel stream) |
| Unreal Engine 4/5 | E or D; there is no practical WebGL target, so pixel streaming is the realistic path |
| Godot, GameMaker, RPG Maker | use the engine's own web export, then apply the platform checks |
| Source-available native engine | B via Emscripten if it builds |
| Proprietary native, no source | E via emulator or streaming; a rebuild is class D |

## Red flags that force E or D

- Kernel-level anti-cheat or always-online DRM you cannot legally remove.
- A rendering path with no WebGL/WebGPU target (HDRP, heavy GPU compute).
- A networking model that requires raw UDP and has no WebRTC, WebTransport or
  relay path, and no server authority.
- Console-exclusive or platform-locked assets or APIs.
- Requirements that need native threads, memory or APIs that browsers forbid.

## Approach options (pick one, name the runner-up)

1. **Unity WebGL export** from a reconstructed project. Default for A/B. Most
   faithful; the cost is reconstruction plus middleware substitution.
2. **Emscripten/WASM native rebuild**. For non-Unity engines, or to keep native
   plugins by rebuilding them to WASM.
3. **Wrap an existing WASM build**. Rare; only if one already exists.
4. **Pixel streaming**. Phase 2 = E. The game runs on a server and the browser
   shows a video stream. Always works; highest latency and running cost; needs a
   GPU host per concurrent player.
5. **Partial HTML rewrite**. Reimplement the shell, UI and matchmaking in HTML/JS
   while the game core runs in WASM.

## Output of this phase

For the chosen verdict: the confidence, the blocker list with at least two
candidate fixes each, the residual risk, an effort range, and the chosen approach
with its reasoning. Then ask the user to accept.
