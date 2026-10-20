# Multiplayer and voice playbook

Use this for any port with online play, and especially for Photon/PUN plus Voice
on WebGL. It covers the decisions to make before code, the specific failures that
cost real time on a shipped port, and how to prove each one is fixed.

## 0. Decide the model before writing code

| Question | Options | Default |
| --- | --- | --- |
| Authority | host (master client), dedicated, relay | keep the original model; if host-authoritative, decide what happens when the host leaves |
| Transport | WebSocket (TCP), WebRTC data channel, WebTransport | WebSocket for simplicity, WebRTC unordered for action, WebTransport where supported |
| Room region | host picks, fixed, auto best | host picks, because auto-best depends on a pinger that is often broken on WebGL |
| Late join | full snapshot, event replay, networked scene load | the engine's networked load if it has one, otherwise a snapshot |
| Master migration | supported, or explicitly not | if not supported, say so in the UI |
| Reconnect | backoff and resume, or return to menu | define it; silent failure is worse than a clear error |
| Clock | server time, master time, local | server or master time for timers, never local wall clock |

Write these down. Most "multiplayer bugs" are an unstated model, not a code defect.

## 1. Transport and region

- **No raw sockets in the browser.** WebSocket is TCP: ordered, reliable, and it
  blocks on loss, which shows up as jitter. WebRTC data channels avoid that only
  when configured unordered and unreliable (`ordered: false,
  maxRetransmits: 0`); the default is ordered and reliable. WebTransport (HTTP/3)
  gives unreliable datagrams where supported.
- **One room is one region.** Every player in the room connects to the same
  region. For a spread group, choose the region best for the group, not the host.
- **Do not trust a browser "ping" that times a socket open.** It measures DNS,
  TCP, TLS and the WebSocket upgrade (about four round trips). It is not latency.
  Measure on the connected client, or label the number unknown.
- **Photon's region pinger fails on WebGL** (every region returns the `4000`
  sentinel). Any region UI must measure RTT in JS, and "pick best region" must be
  computed from real measurements and set explicitly.

## 2. Photon and PUN specifics (verified on a real port)

- **Protocol on WebGL is `WebSocketSecure`.** The name server is
  `wss://ns.photonengine.io:443/`; a room connects to a game server such as
  `wss://GC<CODE><n>.exitgames.com:443/game`.
- **Two AppIds matter.** Realtime uses `AppSettings.AppIdRealtime`; Voice uses
  `AppSettings.AppIdVoice`. The voice client copies PUN's settings, so a stale
  retail Voice id makes Voice authenticate as another app and fail with
  `ReturnCode 32755 (Authentication type 'None' not supported)`, which sets
  `AutoConnectAndJoin = false`. Resolve the Voice id at runtime from your
  Realtime id, or set it explicitly.
- **Blank exported ids.** If `PhotonServerSettings.asset` ships a retail id, it
  will leak into the runtime settings. Blank it and set ids in code or served
  config.
- **CSP and CORS.** Allow `*.photonengine.io` and `*.exitgames.com` in
  `connect-src`, and serve any cross-origin bundles with CORS.
- **Room traffic is metered.** CCU and message volume are billed. Budget them and
  cap abuse server-side.

## 3. Level changes and late join (the failure that matters most)

The pattern that broke a real port: every level is built inside one scene, and
"changing level" means reloading that scene.

- A **bare scene load** (`SceneManager.LoadSceneAsync`) does not pause the
  network message queue. Objects PUN replays to a late joiner are created in the
  scene the joiner came from, then destroyed by the swap. Result: the lobby shows
  one player, and `Received RPC but this PhotonView does not exist`.
- The engine's **networked level load** (`PhotonNetwork.LoadLevel`) pauses the
  message queue while the scene loads and resumes it on `sceneLoaded`. That is
  what keeps replay and late join consistent.
- Fix pattern:
  - pause the queue on room join, with a watchdog that always resumes it (a
    client must never be left deaf);
  - route every in-room level swap through the networked load;
  - set `AutomaticallySyncScene` so the master drives the load;
  - give master and non-master the same target (for example "Reload" for the
    master, "Main" for clients).
- This is one project's architecture, not a universal rule. If your engine has a
  late-join snapshot or an authoritative server, prefer that. If you use a pause
  watchdog, prove it with a deadlock test and a forced-resume test.

**Verification:** a late joiner must see the full world after several minutes of
play, not just at the lobby, and must not receive RPCs for missing views.

## 4. Voice

- **Frames flowing is not audio.** Opus frames can carry silence or garbage.
  Verify with a known tone and a remote analyser, not by watching a log line.
- **AppId and authentication** are the usual failure: see section 2. Confirm the
  voice client actually joins `<room>_voice_` and stays joined.
- **Autoplay and permissions.** `AudioContext` needs a user gesture. Request the
  mic from a click, handle denial, and handle device changes.
- **Background tabs** throttle audio and timers. Test switching tabs.
- **Browser voice pipeline** (WebAudio worklet in, 2D player out) can connect
  while muted, so assert energy, not connection.
- **Audible quality is a manual pass.** A headless browser has no audio device.

**Verification:** fake mic emits a 440 Hz tone, a remote client measures it with
an analyser or records it, and the level changes when the sender mutes. Then do
one real-mic, real-browser pass.

## 5. Ownership, RPCs and serialization

- Keep PhotonView IDs and prefab registration stable across builds.
- Buffered RPCs and `PhotonNetwork.Instantiate` are how late joiners get state;
  understand which of your objects rely on them.
- Guard `DontDestroyOnLoad` objects: a persistent voice object can hold a stale
  `playerAvatar` after a scene change. Null-guard it.
- Use `ObjectsInOneUpdate` and send rates deliberately. Fewer, steadier updates
  beat bursts.
- Do not depend on scene load order or local time for gameplay state.
- On leave, release spawned objects and voice handles; otherwise the next join
  inherits stale state.

## 6. Browser realities

- **Tab throttling:** pause or resync on `visibilitychange`; do not let timers
  drift silently.
- **Network changes:** reconnect on `online`/`offline` and on failure, with
  backoff. A dropped WebSocket does not heal itself.
- **Proxies and VPNs:** corporate proxies buffer WebSocket frames and inflate
  jitter. Ask affected players to test without one.
- **Secure context:** `getUserMedia` and many storage APIs require HTTPS (or
  localhost).
- **Mixed content:** never load the game over HTTP while the socket is WSS.

## 7. What "working" means

Run these scenarios, in this order, on two separate profiles at minimum, and on
two machines before release:

1. Host creates a room; guest joins from the lobby list or code.
2. Both start a run; both see the same players and world.
3. A third client joins **after several minutes of play** and sees the full world.
4. A client leaves mid-run; the others continue.
5. The host leaves; the room either migrates or shows a clear error.
6. Re-host and rejoin; no stale state from the previous session.
7. Voice connects, a tone is audible, mute/unmute works, denial is handled.
8. Inject 100 ms latency, jitter and 2 percent loss; the game stays playable and
   the UI does not lie about the connection.

Two headless clients on one machine share origin, GPU and loopback. They prove
the protocol, not the network. Use separate profiles or machines, and a proxy or
`tc netem`, for the release test.

Log the facts you assert: room name, region, player count on both sides, voice
room name, joined state, and any RPC errors. A green test that only checks "no
crash" proves nothing.

## 8. Symptom, cause, fix

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| Late joiner sees one player in the lobby | bare scene load bypassed the networked load | route swaps through `PhotonNetwork.LoadLevel`, pause the queue with a watchdog |
| `Received RPC but this PhotonView does not exist` | replayed objects destroyed by the scene swap | same as above; verify view IDs |
| Mic plus START never finishes | scene load and level gates out of step | same as above; log the gates |
| Voice joins but is silent | wrong Voice AppId, `32755`, auto-join off | resolve the Voice id, confirm the voice room join |
| Every region ping looks bad and unstable | Photon pinger returns 4000; JS times a handshake | measure on the client, or set the region explicitly |
| Best region picks a distant server | best-region depends on the broken pinger | compute from real RTTs, set the region |
| Room dies when the host leaves | no master migration | implement migration, or state it is unsupported |
| Rejoin shows stale players | objects not released on leave | clean up spawns and voice handles |

## 9. Checklist

- [ ] Authority, transport, region, late join, migration and reconnect are written down.
- [ ] WebSocket or WebRTC configured deliberately; WebRTC unordered if used.
- [ ] Region chosen from real measurements, not the broken pinger.
- [ ] Level changes use the networked load, and the queue pause is watchdogged.
- [ ] A late joiner after several minutes sees the full world.
- [ ] Voice authenticates with the right AppId and a tone is audible.
- [ ] Mute, deny, device change and tab switch behave.
- [ ] Master departure is handled or explicitly unsupported.
- [ ] Tested on separate profiles, then separate machines, with latency and loss.
- [ ] CCU and traffic budgets set, with server-side abuse limits.
