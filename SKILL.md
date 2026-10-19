---
name: game-to-web
description: Research, feasibility-assess, and port a desktop game (Unity or native) to run in a web browser ("webport"). Use when the user wants to bring a game to the browser, asks "can this game run in a browser", mentions WebGL/WebGPU ports, Emscripten, AssetRipper, decompiling a Unity build, Unity WebGL, browser multiplayer (Photon/PUN), or publishing a playable web build. Also use to scope or estimate a webport before committing, and for the ongoing build/test/deploy loop of an existing webport.
metadata:
  version: "1"
  purpose: one-shot-to-plan G2W (Game to Web) workflow for any coding agent
---

# G2W: port a desktop game to the browser

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

- Phase 0 - Intake (ask, collect, confirm scope)
- Phase 1 - Heavy research (no code) → **Research Dossier**
- Phase 2 - Feasibility verdict → **go / no-go** (gate)
- Phase 3 - Approach selection → **chosen method** (gate)
- Phase 4 - Execution plan → **plan** (gate)
- Phase 5 - Build / test / ship loop

Detail lives in `references/` (read the relevant one when you reach that phase):

| Phase | Reference |
|---|---|
| 1 | `references/01-recon-and-research.md` |
| 2-3 | `references/02-feasibility-and-approach.md` |
| 4-5 (Unity) | `references/03-unity-webgl-port-playbook.md` |
| 4-5 (browser platform) | `references/04-browser-platform-playbook.md` |
| 2-4 (large games) | `references/07-large-game-streaming.md` |
| 3-5 (non-Unity / custom engine) | `references/08-native-wasm-port-playbook.md` |
| 4 (planning) | `references/10-plan-template.md` |
| 1-5 (parity) | `references/11-gameplay-parity-and-performance.md` |
| all (sources) | `references/09-sources.md` |
| all | `references/05-hard-won-lessons.md` |
| worked example | `references/06-worked-example-repo.md` |
| all (end to end) | `RUNBOOK.md` |
| 0-5 (toolchain) | `references/12-toolchain-setup.md` |
| 0-5 (toolchain) | `scripts/` |

## Non-negotiables

- **Research before building.** A wrong feasibility call wastes days.
- **Gate every phase with the user.** Ask; wait; then proceed.
- **Offer options, always with a recommendation.** When more than one approach is
  viable, present a short menu (2-4 options) with each trade-off, state your
  **best recommendation** and why, then let the user choose. Never present a
  single path as the only one, and never omit your recommendation.
- **Never commit secrets.** Photon/Steam/API AppIds, passwords, cookie secrets,
  and server source live only in untracked config. Scan before every commit.
- **Respect law and ToS.** The user must own or be licensed to the game. Do not
  redistribute proprietary assets, and do not defeat DRM. State this explicitly.
- **Know the browser ceiling** before promising anything:
  - No raw UDP/TCP sockets. Networking is WebSocket (TCP) or WebRTC only.
  - WebGL runs on a single (or limited) thread; software rendering (SwiftShader)
    is slow - always benchmark, never assume.
  - Memory ceiling: wasm32 tops out at 4 GB (Unity's default heap is 2 GB);
    wasm64 reaches 16 GB but not on Safari. Anything larger than the working set
    must be **streamed and evicted**, never held resident.
  - No OS APIs: no Steam, no filesystem, no native dialogs, no background threads
    as on desktop.

## Presenting a choice

Whenever a phase has real alternatives - the feasibility class, the approach, the
streamed-install strategy, transport, hosting/auth - do not collapse it to one
path. Show a short table:

| Option | What it costs | Main risk | When it wins |
|---|---|---|---|

Then state your **best recommendation** in one line with the reason, and let the
user pick. Keep it to 2-4 genuinely different options, not every permutation.

## Environment and tools

Run the checker before research: `scripts/check-tools.ps1` on Windows or
`scripts/check-tools.sh` elsewhere. Install whatever is missing with the user's
consent, following `references/12-toolchain-setup.md`. Record the versions. Do
not start a build on an unverified toolchain.

## Phase 0 - Intake (ask first, build nothing)

First run the toolchain check (see Environment and tools) and install what is
missing with consent. Then ask the user, in one message, and wait for answers:

1. **What exactly do we have?** Installer, a Steam copy, an already-decompiled
   project, or original source? Which platform/version/build?
2. **What must survive the port?** Single-player, multiplayer, voice chat, mods,
   specific input (controller), saves, achievements?
3. **Web target?** Desktop-first, mobile, or both? WebGL2 is assumed; WebGPU only
   if the user asks.
4. **Hosting & access?** Public or gated? Own domain? Any CDN/cloud preference?
5. **Constraint check:** budget/time, and the **legal basis** for the port.

Only proceed once you can summarise the ask back in three lines.

## Phase 1 - Heavy research (no code)

Goal: an accurate **Research Dossier** so the feasibility call is evidence-based,
not guessed. Read `references/01-recon-and-research.md` for exactly where to look.

Identify and record, with the evidence source for each:

- **Engine + version** and **scripting backend** (IL2CPP vs Mono) - this alone
  decides most of the pipeline.
- **Middleware inventory**: networking SDK, voice, audio/video codecs, input,
  analytics, DRM/Steam, anti-cheat, native plugins.
- **Rendering pipeline** (built-in/URP/HDRP), shaders, post-processing.
- **Asset formats** and size; **UI framework** (uGUI/IMGUI/UITK/other).
- **Save system** (files? registry? cloud?).
- **What is native-only** and has no browser equivalent.
- **Gameplay mechanics**: the core loop, every player-visible system, and the
  observable behaviours that define them. Build the inventory in
  `references/11-gameplay-parity-and-performance.md`.

Deliver the dossier, then say what you still cannot determine and how you would
determine it.

## Phase 2 - Feasibility verdict (gate)

Read `references/02-feasibility-and-approach.md`. Classify the game and score it:

- **A - Direct port**: source/reconstructed project builds to WebGL almost as-is.
- **B - Direct port + replacements**: needs substitutes for middleware (e.g. a
  different netcode/voice/TTS) and Steam removal.
- **C - Hybrid**: core runs in WASM; some systems are reimplemented in JS.
- **D - Rewrite / reimplement**: engine/model incompatible; rebuild the game.
- **E - Not feasible (cloud streaming only)**: cannot run client-side; only a
  pixel-streamed remote build is realistic.

For an asset-heavy game, also decide here whether a **streamed install** is
required - a big game cannot fit in memory and must be chunk-streamed and cached
(see `references/07-large-game-streaming.md`).

Also score **mechanics risk**: which systems depend on engine features, frame
timing, physics or netcode that will change in the browser. Put the fragile ones
in the blocker list with the test that would catch them.

Give a **go / no-go**, the blockers, and a mitigation for each blocker. For a
"yes", state the residual risk. If more than one class is defensible, say so and
lead with your recommendation. Then ask the user to accept or reject the verdict.

## Phase 3 - Approach selection (gate)

Present the viable methods for *this* game as a short **option table** (approach ·
what it costs · main risk · when it wins), then state your **best recommendation**
and why, and let the user choose:

1. **Unity WebGL export** from a reconstructed project (the usual answer for A/B).
2. **Native rebuild via Emscripten/WASM** (non-Unity, or Unity native plugins).
3. **Wrap an existing build** (rare; only if a WASM build already exists).
4. **Pixel streaming** (Phase 2 = E): the game runs on a server, the browser
   shows a video stream. Highest latency, highest cost, always works.
5. **Partial HTML rewrite** for UI/shell while the game runs in WASM.

State the chosen approach, why, its cost, and its main failure mode. Ask the user.

## Phase 4 - Execution plan (gate)

Only after approval. Before writing the plan, run a **dead-end pre-mortem**:
list the five most likely ways this port fails and the cheapest test that would
reveal each. Then build the plan from `references/10-plan-template.md`.

**Ground every workstream.** For each one, name the reference used and the known
failure it avoids, drawn from `references/05-hard-won-lessons.md` and
`references/06-worked-example-repo.md`. If you cannot name the failure mode, you
have not researched that workstream enough.

Cover at minimum: build pipeline, asset delivery + caching, networking transport,
authentication, input, audio/voice, saves, testing harnesses, and release. Add
the **environment**: exact tool versions and how each was verified.
Use:

- `references/03-unity-webgl-port-playbook.md` for the Unity build/port mechanics.
- `references/04-browser-platform-playbook.md` for networking, hosting, auth,
  audio, input, saves, and testing.
- `references/07-large-game-streaming.md` when the assets exceed the memory
  budget: chunked download, an OPFS cache, and eviction.
- `references/09-sources.md` for official docs behind any claim.
- `references/12-toolchain-setup.md` for the tools and their verified versions.
- `references/11-gameplay-parity-and-performance.md` for the **parity matrix**
  and the **performance budgets**, which are part of the plan, not an afterthought.

Present the plan, including the pre-mortem, the parity matrix and the definition
of done. If it
contains real alternatives (delivery, auth, transport), offer them as options
with a recommendation too. Then ask whether to start executing.

## Phase 5 - Parity and performance loop

A port is not finished when it boots. It is finished when the mechanics behave
like the original and the numbers stay within budget. Work the loop in
`references/11-gameplay-parity-and-performance.md`.

Ship mechanics:

1. Build (often **detached**; poll logs - engines build slowly).
2. Regenerate any deployable page artifact (some engines do **not** regenerate
   the shipped `index.html` from the template - see the Unity playbook).
3. Serve locally and drive the build with an automated browser (headless).
4. Deploy to staging/hosted and re-run the same tests there.

Then loop until the exit criteria hold:

5. Pick the highest-severity **unverified** row in the parity matrix.
6. Reproduce the same scenario in the original and in the port, same inputs and seed.
7. Compare behaviour and performance against the row's acceptance criteria.
8. Fix the smallest cause, then re-run that row and the regression set.
9. Update the matrix and the performance dashboard.
10. Repeat.

Exit criteria, all required:

- No blockers remain.
- Every high-severity mechanic is verified, or is an accepted gap with a reason.
- Performance is inside the budgets set in the plan.
- The regression suite is green on the final build.
- The definition of done in `references/10-plan-template.md` is satisfied.

Record every result in `STATE.md`, and keep a `HANDOFF-*.md` a successor can act
on without rediscovering anything. See `references/06-worked-example-repo.md`.

## Ask-the-user checkpoints (do not skip)

- After Phase 0: "Is this the ask?" 
- After Phase 1: "Here is the dossier; is anything wrong?"
- After Phase 2: "Accept this go/no-go?"
- After Phase 3: "Accept this approach, or pick another?"
- After Phase 4: "Start executing?"
- Before any deploy/release or anything that costs money or publishes content.
