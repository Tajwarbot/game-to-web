# Hard-won lessons (traps that cost real time)

Generalised from a completed Unity IL2CPP → WebGL port. Each line was a real
failure; treat them as pre-emptive checks.

## Engine / build
- The deployable `index.html` is **not** always regenerated from the WebGL
  template by the build. Edit the template **and** regenerate the shipped page.
- Delete build logs before building; a killed build leaves `error CS` that sends
  you chasing ghosts.
- A code-only change usually only changes the small `wasm`/`framework` files -
  check hashes so you don't over-promise a "no re-download".

## Input / controller
- Add gamepad support through the game's existing input actions; do not
  synthesise keyboard events from buttons. Gate modes on menu/run state, never on
  `Cursor.lockState` or pointer lock.
- Put an exclusive controller layer on its own device/InputUser and suppress the
  base actions while it is held. One action must not mean both "jump" and
  "inventory slot 1".
- Append controller glyphs to the project's existing TMP sprite asset; replacing
  the atlas loses every emoji. Verify `<sprite name=...>` resolves after build.
- On WebGL, never call a fullscreen `Screen.SetResolution` from a timer. It runs
  outside the user gesture and triggers browser fullscreen/permission alerts; stay
  windowed and use the browser API from a click.

## Networking
- On WebGL everything is WebSocket/TCP → inherent jitter. Don't claim low,
  stable pings from a fake measurement.
- **Photon's region pinger returns 4000 on WebGL**; any in-page substitute that
  times a WebSocket `onopen` measures a full TLS handshake (~4 RTT) and reports
  every region as bad and unstable. Fix the measurement before trusting it.
- The provider's **HTTP `/photon/m/?ping` endpoint is the usable WebGL region
  measurement**. Warm up, take 5 samples, cap concurrency, report median/p95 and
  use the measured best for "Auto". A failed sample is `?`, not 0.
- The region rows can stay in creation order even after a sibling/position
  re-sort. Treat the measured-best row as authoritative; do not imply the list
  order is a ranking.
- The Voice client uses a **separate AppId field**; a stale/retail Voice id makes
  Voice fail with `32755` while the UI still shows "talking".
- When a level change reloads a scene, use the engine's **networked** load
  (it pauses the message queue) or late joiners get orphaned RPCs and lose
  objects; add a watchdog so the queue can never stay paused.
- "Best region" can be broken on WebGL for the same pinger reason - set the
  region explicitly.

## Hosting / delivery
- If the server always returns `200`, the engine re-downloads the whole data file
  every visit. Honour conditional GETs → `304`. Do not remove that path.
- Send `Content-Length` on `HEAD` or any progress bar reads "0.0 MB".
- A Basic-Auth dialog reappears after closing the browser; use a signed cookie
  from a password form for a remembered sign-in.
- Large single-shot multipart uploads drop - chunk with per-part retries.

## Browser platform
- Text fields that read `Input.inputString` never see Ctrl+V; forward the page
  `paste` event.
- Mic permission needs a user gesture; there is **no audio device in headless**,
  so "audible" cannot be verified headlessly - say so.
- A single-threaded local server starves the second client in 2-client tests.

## Secrets & repo hygiene
- Blank and document any middleware id baked into exported assets; keep real ids
  only in the served `config.js`.
- Keep the auth Worker/server source **out of git** (it holds the password +
  cookie secret).
- Scan for AppId/UUID patterns and forbidden files before every commit.

## Process
- Maintain a `STATE.md` (per-session history) and a short `HANDOFF-NEXT.md`
  (current state, exact commands, identifiers, open items, gotchas). A successor
  agent should not have to rediscover anything.
- Gate with the user; do not silently start a multi-hour build.
