# Worked example: a Unity IL2CPP co-op game → browser

A real port used as a reference for the whole workflow. Names are generic; the
shape is what matters. Do **not** copy identifiers — a real port carries a billable
AppId and a site password that must never be committed.

## Shape

- **Game**: Unity IL2CPP co-op horror; multiplayer via **Photon PUN** + **Photon
  Voice**; Steam used for auth/invites/TTS.
- **Reconstruction**: AssetRipper → `ExportedProject/`, scripts filled in until
  it compiled for the agreed scope.
- **Class**: **B** — direct WebGL port with middleware replacements (Steam →
  own room-code flow; native TTS → `speechSynthesis`; native voice → Photon Voice
  over WebSocket).
- **Hosting**: Cloudflare **Worker + R2**, password-form + signed 90-day cookie,
  conditional-GET `304` so the 425 MB build loads from IndexedDB after the first
  visit. Release zips ship `config.js` with an **empty** AppId.
- **Testing**: puppeteer-core + SwiftShader; a threaded local server on one port
  for 2-client runs; a fake-mic mode; long runs launched detached and polled.

## Defects the port hit and fixed (all generalisable)

1. **Lobby late-join + "mic + START GAME" stall — one root cause.** Every level is
   the same scene reloaded, so the swap must go through `PhotonNetwork.LoadLevel`
   (pauses the message queue) instead of a bare scene load. Added
   `PauseNetworkQueue()` on room-join + a watchdog.
2. **Photon Voice never transported audio.** The voice client authenticated with
   the retail app's own Voice id → `32755`. Fix: resolve `AppSettings.AppIdVoice`
   at runtime from the Realtime id; blank the exported retail ids.
3. **425 MB re-downloaded every visit.** Worker always returned `200`; the engine
   only reuses its IndexedDB copy on `304`. Fix: honour conditional GETs.
4. **Sign-in forgotten after closing the browser.** Basic-Auth dialog → password
   form + signed cookie.
5. **Couldn't paste a room code.** uGUI reads `Input.inputString`; forward the
   page `paste` event through the bridge.
6. **No MB/s on the loading page.** Counter matched the wrong URL prefix and
   `HEAD` had no `Content-Length`.

## What "verified" looked like

- Local 2-client: host+join+START+leave+re-host+rejoin, both clients
  `players=2`, `pageErrors=0`.
- Voice: transport connects, both clients join `<room>_voice_`, frames flow
  (audible still unverified — headless has no audio device).
- Hosted: automated 2-client run over the CDN passes; a second load reuses the
  IndexedDB cache (load 2 ≈ 38 s vs ≈ 391 s first load).
- Worker: form 200, wrong pw 401, right pw 303 + cookie, conditional GET 304.

## What stayed open (be honest about this)

- **Audible** voice needs a real browser + real mic.
- Region **pings are fake** (Photon pinger broken on WebGL; the fallback measures a
  TLS handshake). Real fix: measure honestly and pick the region yourself.
- Real-GPU manual pass (colour, FPS under load, TTS audio).

Use this shape to structure your own `STATE.md` / `HANDOFF-NEXT.md`: current
state table, root causes fixed, files changed, exact build/serve/test commands,
verification numbers, infrastructure identifiers + how to deploy, gotchas, and
open items.
