# Example session

A condensed example of what the skill drives an agent to produce. The game here
is fictional. The point is the shape of each checkpoint.

## 1. Intake

Agent asks, then stops:

1. What do you have: an installer, a store copy, a decompiled project, or source?
2. What must survive: multiplayer, voice, controller, saves, mods?
3. Desktop first, mobile, or both?
4. Public or gated? Any hosting preference?
5. What is the legal basis for the port?

User answers, and the agent restates the scope in three lines before continuing.

## 2. Recon (excerpt)

| Field | Finding | Evidence |
| --- | --- | --- |
| Engine | Unity 2021.3 | `globalgamemanagers`, `app.info` |
| Scripting | IL2CPP | `GameAssembly.dll`, no managed DLLs |
| Networking | Photon PUN + Voice | strings and plugins |
| Voice | Realtime AppId reused | `PhotonServerSettings.asset` |
| Input | legacy Input Manager | `Input.inputString` calls |
| Save system | local files | save path strings |
| Native-only | Steam auth, native TTS | `steam_api64.dll`, synth plugin |

Agent: "These two rows I could not confirm: the DRM wrapper, and whether voice
counts against the same CCU. I would confirm both with a 10 minute build attempt
and one connection."

## 3. Feasibility

Class B, direct port with substitutions. Go.

| Blocker | Mitigation |
| --- | --- |
| Steam auth and invites | Own accounts and a room code share flow |
| Native TTS | `speechSynthesis` through the JS bridge |
| Voice AppId | Resolve it at runtime from the Realtime AppId |
| Region pings | Measure in JS, set the region explicitly |

Residual risk: audible voice cannot be confirmed headlessly.

Agent: "Accept this verdict?"

## 4. Approach (options and recommendation)

| Option | Cost | Main risk | When it wins |
| --- | --- | --- | --- |
| Unity WebGL export | Medium | Middleware substitutions | Source or a clean reconstruction |
| Pixel streaming | High running cost | Latency and GPU per player | A game that cannot run client side |
| HTML shell rewrite | Medium | Two codebases | Menus and matchmaking are the hard part |

Recommendation: Unity WebGL export with Addressables for content. It keeps the
game client side and the substitution list is small.

Agent: "Pick one, or ask for a deeper comparison."

## 5. Plan

Covers build pipeline, asset and cache delivery, networking transport, auth,
input, audio and voice, saves, test harnesses, and release versioning. For a
large game it also covers the streamed install: chunk sizes, the OPFS cache,
the eviction budget, and the first playable set.

Agent: "Start executing?"

## 6. Ship

The loop: build detached and poll, regenerate the served page, serve locally,
drive it with a headless browser, run one and two client tests, deploy, and run
the same tests hosted. Each result goes into `STATE.md`, and a `HANDOFF` file
keeps the next agent from rediscovering anything.
