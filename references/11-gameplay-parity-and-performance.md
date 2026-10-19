# Gameplay parity and performance loop

A build that boots is not a port. Accuracy is whether the mechanics behave like
the original. Performance is whether it holds up under load. Both need a target
and a repeatable loop, or the port drifts into "looks fine" and ships broken.

## 1. Build the mechanics inventory (Phase 1)

Play the original and read the decompiled scripts. List every player-visible
system, not just the engine pieces:

- movement and camera
- combat and damage
- physics and object interactions
- AI and enemy behaviour
- inventory, economy and progression
- UI flow and menus
- audio cues and music triggers
- network semantics: what is synced, who owns what, late join, disconnect
- save and load
- edge cases: death, pause, alt-tab, reconnect, corrupt save

For each system record the inputs, the expected visible result, the state it
depends on, its timing, and whether it is networked. This inventory is the raw
material for the parity matrix.

## 2. Parity matrix (the single source of truth)

| Mechanic | Expected behaviour | Verified by | Status | Severity | Notes |
| --- | --- | --- | --- | --- | --- |
| | | | | | |

Status values:

- `blocked`: cannot proceed, needs a decision or a dependency.
- `unported`: not built yet.
- `ported-unverified`: it runs, but no test proves parity.
- `verified`: a named test proves the expected behaviour.
- `accepted-gap`: deliberately different, with a stated reason.

Rules:

- Every row needs a verification method. "Looks fine" is not one.
- Severity is by player impact, not by how hard the fix is.
- Work blockers and high severity first.
- Accepted gaps are explicit, with the reason and the residual risk.

## 3. Verification layers

Use more than one. Each catches what the others miss.

- Deterministic logic tests with a fixed seed and fixed inputs.
- Scripted playthroughs driven by a headless browser.
- Visual comparison at fixed states: screenshots or frames side by side.
- Audio presence and timing. Quality is a manual check.
- Multiplayer: host, join, start, leave, re-host, rejoin, late join, disconnect.
- Save and load round trips, including a corrupt or old save.
- Performance runs under stress, not just on an idle menu.
- A manual feel pass for timing, weight and input response, which automation
  cannot judge.

Record each row's verification type: automated headless, automated real GPU, or
manual device. Two headless clients on one machine share the origin, GPU and
loopback, so they do not test network conditions or feel.

## 4. Performance budgets (set before optimizing)

Put real numbers in the plan, then measure against them:

- time to menu and time to first gameplay
- FPS and p95 frame time in a representative scene
- first-run shader compilation and stutter, measured in a cold profile
- memory: wasm heap plus JS, and growth over a session
- network: RTT, jitter, and message rate where measurable
- cache: size and hit rate for a streamed install

Measure on a real GPU, not only software rendering. Profile with the browser's
Performance and Memory panels and the engine profiler. An uncapped or unknown
frame time is not a baseline.

## 5. The loop

1. Pick the highest-severity `unported` or `ported-unverified` row.
2. Reproduce the same scenario in the original and in the port: same inputs,
   same seed, same settings.
3. Compare behaviour and numbers against the row's acceptance criteria.
4. Fix the smallest cause.
5. Re-run that row plus the regression set.
6. Update the matrix and the performance dashboard.
7. Repeat.

Exit criteria, all required:

- No blockers remain.
- Every high-severity mechanic is `verified`, or `accepted-gap` with a reason.
- Performance is inside the budgets set in the plan.
- The regression suite is green on the final build.
- The definition of done in `10-plan-template.md` is satisfied.

## 6. Regression

- The suite grows with every fix. A fixed bug gets a test.
- Run it on every build. A returning bug is a failed build, not bad luck.
- Version the test harness with the game build so results are comparable.

## 7. Accuracy traps

- Frame-rate-dependent logic that was tuned at 60 fps on desktop.
- Floating point differences between platforms.
- Input timing, deadzones and repeat rates.
- Shader and colour differences from the browser's rendering path.
- Network ordering and timing that used to be reliable on a LAN.
- Save format drift after a serialization change.
- Behaviour that looks right but differs in timing or feel, which is usually the
  hardest to notice and the easiest for players to feel.

## 8. Reporting

Keep a parity dashboard: counts by status, the top remaining risks, and the
current performance numbers. State accepted gaps and open items plainly. A port
is trustworthy when its gaps are known, not when its list looks empty.
