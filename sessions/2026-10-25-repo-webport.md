# Session summary: R.E.P.O. WebGL controller + latency (2026-10-25)

This is a sanitized summary of the final build session. It intentionally contains
no AppId, site password, cookie secret, API token or private audience data.

## Starting point

- Existing Unity IL2CPP -> WebGL port with Photon Realtime multiplayer and
  Photon Voice; live on a private Cloudflare Worker + R2 site.
- The host build already used legacy Input Manager, a custom page bridge, and
  local save modifications.
- Requested scope: **desktop controller only**. Mobile was explicitly out of
  scope after the memory ceiling was measured.

## Delivered

- DualShock 4 support through a virtual `RepoWebGamepad`, a WebGL `.jslib`
  poller, and runtime-appended Input Manager bindings.
- A separate exclusive R1 layer device (inventory 1-3, emotes 1-6) and a
  menu-only confirm/back device, so menu and gameplay actions cannot leak into
  each other.
- Right-stick aim through the game's dormant 150 deg/s gamepad path; L2 + right
  stick rotates held objects; push/pull, sprint, crouch, PTT, map, mute and
  spectate mapped.
- Menu cursor/click/drag, sliders and scroll boxes supported.
- DS4 prompt icons appended to the **existing EmojiOne TMP sprite asset** at
  build time; emoji fallback preserved. Do not replace the atlas.
- Fullscreen crash/alert fixed by keeping the WebGL player windowed and using the
  browser fullscreen API from a real click.
- Region page switched to HTTPS `/photon/m/?ping` with warm-up, 5 samples,
  limited concurrency, median/p95, failures as `?`, and a measured-best AUTO row.
  Lobby now shows the actual region and `GetPing()`.
- Serialization/send 30 Hz, `ObjectsInOneUpdate` 20, per-frame socket polling,
  remote-avatar smoothing, and `[RWN]` net/FPS diagnostics.

## Verification that actually ran

- `e2e-play.js`: PASS. Host + guest, level load, next level, mic pipeline,
  zero page errors.
- `e2e-mp.js`: PASS 12/12.
- `paste-check.js`: PASS.
- `s24-regions.js`: PASS; 17 region rows with plausible HTTPS RTT values.
- Fake-pad tests: connection, no drift, bindings, exclusive layer, menu cursor /
  click, slider/scroll box, prompt sprites, glyph asset, fullscreen dialog gone.
- `fpscap-check.js`: PASS; cap intact.
- Hosted `mp-hosted.js`: PASS; both clients booted the deployed build, host
  created a real room, guest joined.
- Conditional GET on the large data file returned 304.

## Not verified / caveats

- A real physical DS4 gameplay/feel pass was not possible in the harness. Fake
  pads prove the bridge and bindings, not the feel of the look curve or trigger
  travel.
- The two-client fake-pad gameplay harness timed out under headless SwiftShader;
  do not treat that as proof controller gameplay fails in a real browser.
- Region list **values** and AUTO are correct, but the scroll container still
  displays rows in creation order. Treat AUTO as the ranking.
- Headless RTT is dominated by software rendering; judge gameplay latency on a
  real GPU.
- Mobile remains gated by the ~1 GB uncompressed build and the iPhone process
  limit; the input bridge itself is mobile-ready.

## Reusable lessons

1. Add controller support through the game's existing Input Manager actions, not
   by synthesising keyboard events. Gate modes on menu/run state, never on
   pointer lock.
2. Give the controller layer its own InputUser/device and suppress the base
   actions while it is held. Do not try to make one action both "jump" and
   "inventory slot 1".
3. Append glyphs to the project's existing TMP sprite asset; replacing it loses
   every emoji. Verify `<sprite name=...>` resolves after the build.
4. Never call a fullscreen `Screen.SetResolution` from a timer on WebGL. It is
   outside the user gesture and triggers browser permission/security alerts.
5. On WebGL, measure region RTT with the provider's HTTP ping endpoint, warm up
   first, and report median/p95. A WebSocket open measures TLS, not game RTT.
6. Keep the local build artifact set internally consistent before a hosted test:
   data, wasm, framework and page must come from the same build. Copying only
   two of them creates a confusing mismatched local test.
7. The live deployment is a separate asset. Cleanup of local build/test files
   must never touch the Worker, R2 bucket, DNS, custom domain or zone.
8. Store credentials outside git. If an owner asks for a portable credential
   bundle, use an encrypted archive with header encryption and a passphrase that
   is never committed.

## Final build identity (for reproducibility)

- Data: 445,881,708 bytes, SHA-256 prefix `2773A59900C84D59`.
- WASM: 13,933,433 bytes, prefix `25A43F3D48D06B29`.
- Framework: 95,134 bytes, prefix `7D09E08B4FE8795C`.
- Page: 27,539 bytes, prefix `37B759036A9D64E1`.
