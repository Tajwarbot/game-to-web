# webport-unity-game

An agent skill for making the call most ports get wrong: *can this game actually run in a browser?* — and only then building it.

Combining a desktop game with a web page is not a build flag. It is a series of judgement calls about engines, middleware, transports, and the hard limits of a browser tab. Most webports fail at the first call, not at the last compile. This skill keeps an AI coding agent honest about that order: establish the facts, decide, then build.

---

## What it does

The skill installs a workflow, not a script. It drives the agent through six phases, and every phase ends at a checkpoint where the agent states what it found and waits for you to agree before spending hours building.

**Intake.** Establish what you actually have — an installer, a Steam copy, a reconstructed project, or real source — and what must survive the port: multiplayer, voice, controller input, saves, mods. Nothing is assumed.

**Reconnaissance.** Identify the engine and scripting backend, then the middleware that decides the whole job: the networking SDK, voice, audio codecs, input system, DRM, anti-cheat, native plugins, and the UI and save systems. Each finding is backed by where it was seen, so the next phase rests on evidence rather than a guess.

**Feasibility.** Classify the game — direct port, direct port with substitutions, hybrid, rewrite, or not client-side at all — and produce a go/no-go with a named blocker and a mitigation for each. A wrong call here is the most expensive mistake in the process, so the skill refuses to skip it.

**Approach.** Lay out every viable method as a short option table — rebuild to WebGL, compile to WebAssembly, wrap an existing build, stream pixels from a server, or reimplement the shell in HTML — then give a clear **best recommendation** with its reasoning, and let you choose. The right answer depends on this game, not the last one, and you always keep the choice.

**Plan.** A concrete execution plan covering the build pipeline, asset delivery and caching, networking, authentication, input, audio and voice, saves, testing, and release. For an asset-heavy game it plans a **streamed install** — a small bootstrap plus chunked, range-fetched content in an OPFS cache with LRU eviction — instead of a full download.

**Build, test, ship.** A loop, not a big bang: build, regenerate the served page, serve locally, drive it with an automated browser, test with two clients, deploy, and re-test hosted — with the traps that already cost time documented up front.

---

## Install

```bash
npx skills add Tajwarbot/webport-unity-game
```

Or drop the folder into any agent that reads the Agent Skills format:

```
~/.agents/skills/webport-unity-game/
~/.claude/skills/webport-unity-game/
.opencode/skills/webport-unity-game/
```

Then ask, in plain language:

> Can this game run in a browser? Here's the install folder — research it and tell me what porting it would take.

---

## Contents

| File | Purpose |
| --- | --- |
| `SKILL.md` | The six-phase workflow and its checkpoints. |
| `references/01-recon-and-research.md` | Where to look to identify the engine and middleware; the dossier template. |
| `references/02-feasibility-and-approach.md` | Decision classes, a scoring checklist, red flags, and the five approaches. |
| `references/03-unity-webgl-port-playbook.md` | The concrete Unity pipeline: reconstruction, export, the served-page trap, and the JS bridge. |
| `references/04-browser-platform-playbook.md` | Networking, hosting, auth, audio, input, saves, and test automation. |
| `references/05-hard-won-lessons.md` | Failures that cost real time on a real port, stated as checks. |
| `references/06-worked-example-repo.md` | A completed port used as a reference shape. No identifiers. |
| `references/07-large-game-streaming.md` | Streamed installs: chunked download, OPFS cache, eviction, and wasm memory limits. Includes a playgta5.net case study. |
| `references/08-native-wasm-port-playbook.md` | The non-Unity path: Emscripten, WASMFS, the streaming filesystem, emulator targets, and the C&C Generals / LEGO Racers case studies. |

---

## What it will not do

It will not make an unportable game port, and it will not pretend otherwise. Browsers have real ceilings: no raw sockets, software rendering, a memory cap, and no access to Steam or the operating system. Kernel-level anti-cheat and always-online DRM frequently rule a client-side port out entirely, leaving only a streamed remote build.

It also assumes you own or are licensed to the game. The skill does not defeat DRM and does not ship proprietary assets.

---

## Provenance

The checklists, the traps, and the playbooks come from a completed port of a Unity IL2CPP co-op game to a live, password-gated web build — including the multiplayer, voice, and delivery work that made it playable. The worked example is written without any real AppIds, endpoints, or credentials.
