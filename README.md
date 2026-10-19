# webport-game

An agent skill for deciding whether a desktop game can run in a browser, and for doing the port if it can.

Porting a game to the web is a judgement problem before it is a build problem. The engine, the middleware, the network transport and the limits of a browser tab decide more than any build flag does, and most of that has to be settled before code is written. This skill makes an AI coding agent settle it in order, and stop at checkpoints where you decide.

## How it works

The skill is a workflow. It moves the agent through six phases, and at the end of each one the agent reports what it found and waits for your agreement before going further.

**Intake.** Work out what you actually have (an installer, a Steam copy, a reconstructed project, or real source) and what has to survive the port: multiplayer, voice, controller input, saves, mods.

**Reconnaissance.** Identify the engine and scripting backend, then the middleware that decides the job: networking SDK, voice, audio codecs, input, DRM, anti-cheat, native plugins, UI and saves. Each finding cites where it was seen, so the next phase rests on evidence.

**Feasibility.** Place the game in one of five classes: direct port, direct port with substitutions, hybrid, rewrite, or not client-side at all. Then give a go or no-go with each blocker and a mitigation. A wrong call here costs the most, so the skill does not skip it.

**Approach.** Present the viable methods as a short option table, give a clear recommendation with its reasoning, and let you choose. The methods are rebuild to WebGL, compile to WebAssembly, wrap an existing build, stream pixels from a server, or reimplement the shell in HTML.

**Plan.** Turn the choice into a concrete plan: build pipeline, asset delivery and caching, networking, authentication, input, audio and voice, saves, testing and release. For a large game the plan includes a streamed install: a small bootstrap, content fetched on demand into an OPFS cache, and eviction when space runs low.

**Build, test, ship.** Work in a loop. Build, regenerate the served page, serve locally, drive it with an automated browser, test with two clients, deploy, and test again hosted. Traps that already cost time are written down so they do not cost it twice.

## Install

```bash
npx skills add Tajwarbot/webport-game
```

Or copy the folder into an agent that reads the Agent Skills format:

```
~/.agents/skills/webport-game/
~/.claude/skills/webport-game/
.opencode/skills/webport-game/
```

Then ask:

> Can this game run in a browser? Here is the install folder. Research it and tell me what the port would take.

## Contents

| File | Purpose |
| --- | --- |
| `SKILL.md` | The six phase workflow and its checkpoints. |
| `references/01-recon-and-research.md` | Where to look to identify the engine and middleware, plus the dossier template. |
| `references/02-feasibility-and-approach.md` | Decision classes, a scoring checklist, red flags and the five approaches. |
| `references/03-unity-webgl-port-playbook.md` | The Unity pipeline: reconstruction, export, the served page trap and the JS bridge. |
| `references/04-browser-platform-playbook.md` | Networking, hosting, auth, audio, input, saves and test automation. |
| `references/05-hard-won-lessons.md` | Failures that cost real time on a real port, stated as checks. |
| `references/06-worked-example-repo.md` | A completed port used as a reference shape. No identifiers. |
| `references/07-large-game-streaming.md` | Streamed installs: chunked download, OPFS cache, eviction and wasm memory limits, with a playgta5.net case study. |
| `references/08-native-wasm-port-playbook.md` | The native path: Emscripten, WASMFS, the streaming filesystem, emulator targets, and the C&C Generals and LEGO Racers case studies. |

## Limits

It will not make an unportable game portable. Browsers have hard limits: no raw sockets, software rendering, a memory cap, and no access to Steam or the operating system. Kernel level anti-cheat and always online DRM often rule out a client side port, leaving only a streamed remote build.

It also assumes you own or are licensed to the game. The skill does not defeat DRM and does not ship proprietary assets.

## Provenance

The checklists, the traps and the playbooks come from a completed port of a co-op game to a live, password gated web build, including the multiplayer, voice and delivery work that made it playable. The worked example contains no real AppIds, endpoints or credentials.
