# webport-unity-game

An Agent Skill for **porting a Unity-class desktop game to run in a web browser**
(a "webport").

It drives any coding agent (Claude Code, Codex, opencode, and others that read the
Agent Skills format) through a **research-first, gated** workflow:

1. **Intake** — collect what the user actually has and wants.
2. **Heavy research** — identify the engine, scripting backend, middleware,
   rendering, assets, UI, saves, and native-only systems → a Research Dossier.
3. **Feasibility verdict** — go / no-go with blockers and mitigations.
4. **Approach selection** — pick the best method for *that* game (Unity WebGL
   export, WASM rebuild, hybrid, pixel streaming, partial rewrite).
5. **Execution plan** — build pipeline, asset delivery, networking, auth, input,
   audio/voice, saves, testing, release.
6. **Build / test / ship loop** — with the traps already documented.

Every phase ends in a **checkpoint**: the agent shows an artifact and asks the
user before continuing.

## Install

Copy this folder into your agent's skills directory, or use the skills CLI:

```bash
npx skills add Tajwarbot/webport-unity-game
```

Common auto-loaded locations:

- `~/.agents/skills/webport-unity-game/`
- `~/.claude/skills/webport-unity-game/`
- `.opencode/skills/webport-unity-game/`

## Contents

- `SKILL.md` — the workflow and gates.
- `references/01-recon-and-research.md` — identify engine + middleware; dossier template.
- `references/02-feasibility-and-approach.md` — decision classes, scoring, red flags, approaches.
- `references/03-unity-webgl-port-playbook.md` — the concrete Unity build/port mechanics.
- `references/04-browser-platform-playbook.md` — networking, hosting, auth, audio, input, saves, testing.
- `references/05-hard-won-lessons.md` — traps that cost real time on a real port.
- `references/06-worked-example-repo.md` — a completed port as a reference (no identifiers).

## Scope and honesty

- This is guidance, not magic. It will not make an unportable game port.
- Browser limits are real: no raw sockets, software rendering, memory ceiling, no
  OS/Steam APIs.
- You must own or be licensed to the game you port; do not redistribute
  proprietary assets or defeat DRM.
- The worked example is deliberately free of any real AppIds, passwords, or
  endpoints.
