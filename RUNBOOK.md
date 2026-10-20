# RUNBOOK: end to end, from a game to a web build

`SKILL.md` is the canonical workflow. This file is a short index of the same
steps; if the two disagree, follow `SKILL.md`. Each step produces an artifact and
ends at a checkpoint where you stop and ask the user.

## 0. Check the toolchain

```powershell
pwsh -File scripts/check-tools.ps1     # Windows
bash scripts/check-tools.sh            # macOS / Linux
```

Install what is missing with consent. Read `references/12-toolchain-setup.md`.
Do not continue until the core tools are present and their versions recorded.

## 1. Intake (checkpoint)

Ask the five questions in `SKILL.md` Phase 0. Restate the scope in three lines and
get agreement. Artifact: a scope note.

## 2. Recon and mechanics inventory (checkpoint)

Produce the Research Dossier (`references/01-recon-and-research.md`) and the
mechanics inventory (`references/11-gameplay-parity-and-performance.md`).
Artifact: dossier plus a first-pass list of player-visible systems.

## 3. Feasibility and approach (checkpoints)

Classify the game (`references/02-feasibility-and-approach.md`), give a go or
no-go with blockers and mitigations, then present the approach options with a
recommendation. Get the user's choice.

## 4. Plan (checkpoint)

Run the dead-end pre-mortem. Fill `references/10-plan-template.md`: workstreams
grounded in a reference and a known failure, the parity matrix, and the
performance budgets. Get approval to start.

## 5. Build and ship mechanics

1. Build detached and poll the logs.
2. Regenerate the served page if the engine does not.
3. Serve locally with a threaded server for multi-client tests.
4. Drive the build with a headless browser. Give every harness the shared launcher in
   [`scripts/profile-hygiene/profile.js`](scripts/profile-hygiene/profile.js): throwaway profiles are
   deleted after `browser.close()`, persistent ones are reused, and a sweep clears stale `%TEMP%`
   profiles. A per-run `userDataDir` that only gets `browser.close()` leaks ~0.5 GB per run for a
   WebGL build (seen: 55 GB in four days).

## 6. Parity and performance loop

Work the matrix from `references/11-gameplay-parity-and-performance.md` until:

- no blockers remain,
- every high-severity mechanic is verified or an accepted gap,
- performance is inside the agreed budgets,
- the regression suite is green.

## 7. Hosting and access

Follow `references/04-browser-platform-playbook.md` and
`references/07-large-game-streaming.md`. Verify auth, caching (including a second
load that reuses the cache), and range requests for a streamed install.

## 8. Release and handoff

Package a versioned, reproducible artifact. Write `STATE.md` and a `HANDOFF` file.
Walk the definition of done in `references/10-plan-template.md` line by line.

## The one rule

If a step cannot name the reference and the failure it prevents, stop and research
that step before writing code. That is how a port avoids hitting a dead end at
the end.
