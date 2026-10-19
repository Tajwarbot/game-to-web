# Browser platform playbook: networking, hosting, audio, input, saves, testing

## Networking

- **WebGL has no raw sockets.** Transports are **WebSocket (TCP)**, **WebRTC data
  channels**, and **WebTransport** over HTTP/3. WebSocket has head-of-line
  blocking and jitter. WebRTC only avoids that when the channel is configured
  unordered and unreliable (`ordered: false, maxRetransmits: 0`); the default is
  ordered and reliable. WebTransport gives unreliable datagrams where supported.
  Prefer the lowest-jitter option the SDK supports, and plan STUN/TURN/relay for
  WebRTC.
- **Photon/PUN specifics** (verified on a real port):
  - On WebGL the client uses `WebSocketSecure`; name server is
    `wss://ns.photonengine.io:443/`; the room connects to a game server like
    `wss://GC<CODE><n>.exitgames.com:443/game`.
  - **Photon's built-in region pinger is broken on WebGL** - every region returns
    the `4000` "failed" sentinel. Any "show region pings" UI must measure RTT in
    JS instead. **But do not trust a `new WebSocket()` open-time as a ping**: it
    includes DNS+TCP+TLS+upgrade (~4 RTT) and inflates every number several-fold.
    Prefer measuring over the connected client, or count only successful opens and
    label the rest "unknown".
  - **Voice**: the voice client authenticates with `AppSettings.AppIdVoice`. If
    the build ships the retail app's own Voice id, Voice silently fails
    (`ReturnCode 32755 Authentication type 'None' not supported`). Resolve the
    Voice id from your Realtime id at runtime, or set it explicitly.
  - **Scene-load stalls / late-join bugs**: when level changes are scene reloads,
    the swap must go through the engine's networked level load, which pauses the
    message queue during the load. A bare scene load bypasses it and breaks RPC
    replay to late joiners. The pause-on-join watchdog is one project's patch,
    not a general rule: verify it with a deadlock test, and prefer a late-join
    snapshot where the engine supports one.
- **"Best region"** depends on the same pinger - if it is broken, compute the best
  region yourself and set it explicitly rather than leaving it to auto.
- One room = one region. A geographically spread group cannot all have good ping;
  choose the region best for the group, not the host.

## Hosting & asset delivery

- Serve the (large) build from object storage behind a CDN (e.g. **Cloudflare
  Worker + R2**). The game loader **revalidates** its IndexedDB copy with a
  conditional GET and only reuses it on **`304`** - so the server must honour
  `If-None-Match`/`If-Modified-Since` and send `Last-Modified` + `Content-Length`
  (also on `HEAD`). Use `Cache-Control: no-store` for the big data file (one copy,
  in IndexedDB), `no-cache` otherwise. Breaking the `304` path forces a full
  re-download every visit.
- Content types matter: `.unityweb` as `application/octet-stream`; `index.html`
  `text/html; charset=utf-8`; js `text/javascript; charset=utf-8`.
- Uploading a multi-hundred-MB file: a single multipart PUT can drop; use
  chunked multipart with per-part retries.
- **Auth for a private build**: a password **form** that sets a signed cookie
  beats a Basic-Auth dialog. Set the cookie `HttpOnly; Secure; SameSite=Lax`,
  add rate limiting, and make logout revoke it. Do not keep a second auth path
  (Basic) that bypasses the form. For automation use a test token or signed URL,
  not a shared password. Verify with `curl` (form, wrong password, cookie,
  protected sub-resource, conditional GET).
- **Releases**: package a versioned zip; ship `config.js` **empty**. Publish via
  the host's release mechanism and keep the "Latest" pointer correct.

## Audio & voice

- Mic permission must be requested from a **user gesture** (`getUserMedia`).
  Headless browsers have no real audio device, so **audible** output cannot be
  verified headlessly - say so rather than claiming it works.
- Replace native TTS with `speechSynthesis`; wire a mute/cancel path.
- Voice over WebSocket adds traffic and jitter; budget for it in CCU/bandwidth.

## Input

- Desktop GLFW/Input may not fire in the browser; forward DOM events and browser
  **paste** into the engine. Text fields that read `Input.inputString` will never
  see a Ctrl+V - forward the page `paste` event explicitly.
- Provide touch/pointer handling if mobile is in scope.

## Saves

- No filesystem. Use `IndexedDB`/`localStorage` through the bridge.
- Write atomically: temp key or file, then commit, with a checksum and a schema
  version. Test a corrupt save and an old save.
- Provide export/import, and keep saves away from the asset cache (see `07`).
- Namespace saves per tab or lock them so two tabs do not clobber each other.

## Testing (automate; do not eyeball)

- Drive the build with **puppeteer-core/Playwright** against a local server.
- Use software rendering flags (e.g. `--use-angle=swiftshader`,
  `--enable-unsafe-swiftshader`) for headless determinism, plus
  `--autoplay-policy=no-user-gesture-required`.
- **Multi-client** tests need a **threaded** local server - a single-threaded
  server starves the second client.
- Stub devices: a **fake mic** entry point lets voice run headlessly.
- Boot and engine level-loads take tens of seconds to minutes - **launch long
  runs detached and poll output**; never rely on a short shell timeout.
- Assert real outcomes (both clients see `players=2`, `pageErrors=0`), not just
  "no crash".
- Headless on one machine is not a netcode test: clients share origin, GPU and
  loopback. Run a release test with separate profiles or machines and inject
  latency and loss (for example `tc netem` or a proxy).
- SwiftShader is for determinism, not performance. Measure on a real GPU or the
  number is meaningless.

## Performance

- WebGL is single-threaded and may run on SwiftShader. Benchmark FPS under load
  on a real GPU before promising anything; keep a first-load budget and show a
  progress/`MB/s` indicator for the big download.
