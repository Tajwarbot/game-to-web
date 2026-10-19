# Plan template and definition of done

Fill this in after the approach is approved. Delete sections that do not apply.
Every workstream must name the reference it uses and the known failure it avoids.
If you cannot name the failure, you have not researched that workstream enough.

## 1. Recap

- Game and version:
- What we have (source / decompiled / installer):
- Feasibility class:
- Chosen approach:
- Options considered, and why each was rejected:

## 2. Dead-end pre-mortem

Before planning, write down the five most likely ways this port dies, and the
cheapest test that would reveal each one early. Do the cheap tests first.

| Risk | Why it would kill the port | Cheapest early test | Result |
| --- | --- | --- | --- |
| | | | |
| | | | |
| | | | |
| | | | |
| | | | |

## 3. Workstreams

For each workstream, fill the four fields. Cite the reference and the failure it
prevents. This is what stops the plan from hitting a wall later.

### Build and toolchain

- Goal:
- Reference:
- Known failure:
- Verification:
- Tool versions:
- Checker output:

### Assets and delivery

- Goal:
- Reference:
- Known failure:
- Verification:
- Streamed install needed? (yes / no):
- Chunk size, cache budget, eviction rule:

### Networking

- Goal:
- Reference:
- Known failure:
- Verification:

### Auth and hosting

- Goal:
- Reference:
- Known failure:
- Verification:

### Input

- Goal:
- Reference:
- Known failure:
- Verification:

### Audio, voice and TTS

- Goal:
- Reference:
- Known failure:
- Verification:

### Saves

- Goal:
- Reference:
- Known failure:
- Verification:

### UI and shell

- Goal:
- Reference:
- Known failure:
- Verification:

### Testing

- Goal:
- Reference:
- Known failure:
- Verification:
- Harnesses:
- Two-client plan:
- Hosted plan:

### Release

- Goal:
- Reference:
- Known failure:
- Verification:
- Artifact and version:

## 4. Parity matrix and performance budgets

Copy the matrix from `11-gameplay-parity-and-performance.md` and fill it in. Set
the performance budgets now, before any optimization, so "fast enough" has a
number.

| Mechanic | Expected behaviour | Verified by | Status | Severity | Notes |
| --- | --- | --- | --- | --- | --- |
| | | | | | |

| Budget | Target | Measured | Pass |
| --- | --- | --- | --- |
| Time to first gameplay | | | |
| FPS / p95 frame time | | | |
| Memory (wasm plus JS) | | | |
| Network RTT / jitter | | | |
| Cache size / hit rate | | | |

## 5. Definition of done

A port is finished when every line is true or explicitly marked as an accepted
gap. Do not call it done because it boots.

- [ ] Builds reproducibly from a clean checkout with a documented command.
- [ ] Reaches the menu and completes a full single-player loop.
- [ ] The parity matrix has no blockers, and every high-severity row is verified
      or an accepted gap with a stated reason.
- [ ] Performance matches the budgets in section 4.
- [ ] Two clients can host, join, start, leave, re-host and rejoin.
- [ ] Voice transport connects, or the gap is stated plainly (headless cannot hear).
- [ ] Hosted load works, and a second load reuses the cache instead of re-downloading.
- [ ] Auth works: form, wrong password, cookie, and protected sub-resources.
- [ ] No secrets in the repository; the AppId lives only in the served config.
- [ ] Performance measured on a real GPU, not only software rendering.
- [ ] Mobile tested, or explicitly out of scope.
- [ ] Release artifact versioned and reproducible.
- [ ] `STATE.md` and `HANDOFF` written for the next agent.
- [ ] Open items listed honestly, with the reason each is open.

## 6. Open questions

List what is still unknown and how you will close it. Never hide an unknown
inside a plan.
