---
name: webport-unity-game
description: Research, feasibility-assess, and port a Unity-class desktop game to run in a web browser ("webport"). Use when the user wants to bring a game to the browser, asks "can this game run in a browser", mentions WebGL/WebGPU ports, Emscripten, AssetRipper, decompiling a Unity build, Unity WebGL, browser multiplayer (Photon/PUN), or publishing a playable web build. Also use to scope or estimate a webport before committing, and for the ongoing build/test/deploy loop of an existing webport.
metadata:
  version: "1"
  purpose: one-shot-to-plan webport workflow for any coding agent
---

# Webport a Unity-class game to the browser

Porting a native/desktop game to a playable web page is a **research-first, gated**
process. Do not write code, run a build engine, or start decompiling until the
research and feasibility gates below are cleared and the user has approved.

This skill is engine-agnostic in spirit but tuned for **Unity** games, because
that is the dominant case and it has a known, workable pipeline. For non-Unity
targets, apply the same phases and use the recon reference to classify them.

## How to use this skill

Work the phases in order. Each phase ends in a **gate**: a short artifact you
show the user, followed by an explicit question. **Stop and wait for the answer.**
Never skip ahead to building because it "seems obvious".

- Phase 0 — Intake (ask, collect, confirm scope)
- Phase 1 — Heavy research (no code) → **Research Dossier**
- Phase 2 — Feasibility verdict → **go / no-go** (gate)
- Phase 3 — Approach selection → **chosen method** (gate)
- Phase 4 — Execution plan → **plan** (gate)
- Phase 5 — Build / test / ship loop

Detail lives in `references/` (read the relevant one when you reach that phase):

| Phase | Reference |
|---|---|
| 1 | `references/01-recon-and-research.md` |
| 2–3 | `references/02-feasibility-and-approach.md` |
| 4–5 (Unity) | `references/03-unity-webgl-port-playbook.md` |
| 4–5 (browser platform) | `references/04-browser-platform-playbook.md` |
| all | `references/05-hard-won-lessons.md` |
| worked example | `references/06-worked-example-repo.md` |

## Non-negotiables

- **Research before building.** A wrong feasibility call wastes days.
- **Gate every phase with the user.** Ask; wait; then proceed.
- **Never commit secrets.** Photon/Steam/API AppIds, passwords, cookie secrets,
  and server source live only in untracked config. Scan before every commit.
- **Respect law and ToS.** The user must own or be licensed to the game. Do not
  redistribute proprietary assets, and do not defeat DRM. State this explicitly.
- **Know the browser ceiling** before promising anything:
  - No raw UDP/TCP sockets. Networking is WebSocket (TCP) or WebRTC only.
  - WebGL runs on a single (or limited) thread; software rendering (SwiftShader)
    is slow — always benchmark, never assume.
  - Memory ceiling is roughly 2–4 GB (browser/tab dependent).
  - No OS APIs: no Steam, no filesystem, no native dialogs, no background threads
    as on desktop.

## Phase 0 — Intake (ask first, build nothing)

Ask the user, in one message, and wait for answers:

1. **What exactly do we have?** Installer, a Steam copy, an already-decompiled
   project, or original source? Which platform/version/build?
2. **What must survive the port?** Single-player, multiplayer, voice chat, mods,
   specific input (controller), saves, achievements?
3. **Web target?** Desktop-first, mobile, or both? WebGL2 is assumed; WebGPU only
   if the user asks.
4. **Hosting & access?** Public or gated? Own domain? Any CDN/cloud preference?
5. **Constraint check:** budget/time, and the **legal basis** for the port.

Only proceed once you can summarise the ask back in three lines.

## Phase 1 — Heavy research (no code)

Goal: an accurate **Research Dossier** so the feasibility call is evidence-based,
not guessed. Read `references/01-recon-and-research.md` for exactly where to look.

Identify and record, with the evidence source for each:

- **Engine + version** and **scripting backend** (IL2CPP vs Mono) — this alone
  decides most of the pipeline.
- **Middleware inventory**: networking SDK, voice, audio/video codecs, input,
  analytics, DRM/Steam, anti-cheat, native plugins.
- **Rendering pipeline** (built-in/URP/HDRP), shaders, post-processing.
- **Asset formats** and size; **UI framework** (uGUI/IMGUI/UITK/other).
- **Save system** (files? registry? cloud?).
- **What is native-only** and has no browser equivalent.

Deliver the dossier, then say what you still cannot determine and how you would
determine it.

## Phase 2 — Feasibility verdict (gate)

Read `references/02-feasibility-and-approach.md`. Classify the game and score it:

- **A — Direct port**: source/reconstructed project builds to WebGL almost as-is.
- **B — Direct port + replacements**: needs substitutes for middleware (e.g. a
  different netcode/voice/TTS) and Steam removal.
- **C — Hybrid**: core runs in WASM; some systems are reimplemented in JS.
- **D — Rewrite / reimplement**: engine/model incompatible; rebuild the game.
- **E — Not feasible (cloud streaming only)**: cannot run client-side; only a
  pixel-streamed remote build is realistic.

Give a **go / no-go**, the blockers, and a mitigation for each blocker. For a
"yes", state the residual risk. Then ask the user to accept or reject the verdict.

## Phase 3 — Approach selection (gate)

Choose the single best method for *this* game and justify it against the runner-up:

1. **Unity WebGL export** from a reconstructed project (the usual answer for A/B).
2. **Native rebuild via Emscripten/WASM** (non-Unity, or Unity native plugins).
3. **Wrap an existing build** (rare; only if a WASM build already exists).
4. **Pixel streaming** (Phase 2 = E): the game runs on a server, the browser
   shows a video stream. Highest latency, highest cost, always works.
5. **Partial HTML rewrite** for UI/shell while the game runs in WASM.

State the chosen approach, why, its cost, and its main failure mode. Ask the user.

## Phase 4 — Execution plan (gate)

Only after approval. Produce a concrete plan covering, at minimum: build pipeline,
asset delivery + caching, networking transport, authentication, input, audio/voice,
saves, testing harnesses, and release/versioning. Use:

- `references/03-unity-webgl-port-playbook.md` for the Unity build/port mechanics.
- `references/04-browser-platform-playbook.md` for networking, hosting, auth,
  audio, input, saves, and testing.

Present the plan, then ask the user whether to start executing.

## Phase 5 — Build / test / ship loop

Run the loop, not one big bang:

1. Build (often **detached**; poll logs — engine builds are slow).
2. Regenerate any deployable page artifact (some engines do **not** regenerate
   the shipped `index.html` from the template — see the Unity playbook).
3. Serve locally and drive the build with an automated browser (headless).
4. Run single-client and multi-client functional tests.
5. Deploy to staging/hosted; re-run the same tests hosted.
6. Package a release; keep a versioned, reproducible artifact.

Record every "worked / didn't work" result in a running `STATE.md`, and keep a
`HANDOFF-*.md` that a successor agent can act on without re-discovering anything.
See `references/06-worked-example-repo.md` for the format that survived a real port.

## Ask-the-user checkpoints (do not skip)

- After Phase 0: "Is this the ask?" 
- After Phase 1: "Here is the dossier; is anything wrong?"
- After Phase 2: "Accept this go/no-go?"
- After Phase 3: "Accept this approach, or pick another?"
- After Phase 4: "Start executing?"
- Before any deploy/release or anything that costs money or publishes content.
