# Unity → WebGL port playbook (mechanics)

Concrete pipeline that worked on a real Unity IL2CPP game port. Adapt names to
the project.

## 1. Reconstruct → export → build

1. Reconstruct a project (e.g. AssetRipper) into `ExportedProject/`.
2. Fill in the stubbed C# until it **compiles** for the agreed scope; strip or
   replace desktop-only code guarded by `#if UNITY_STANDALONE`, `Registry`,
   `Application.Quit`, absolute paths, Steam.
3. Set the platform to WebGL and build (often a project-specific
   `*.cmd`/batch file). Engine builds are slow — **run detached and poll logs**.
   - Success markers vary; define them up front, e.g. an exit code and a
     `BUILD RESULT: Succeeded errors=0` line. Count real `error CS` lines only
     after the last licensing/launch line — some engines emit benign lines.
4. Delete logs before each build so stale errors do not mislead you.

## 2. The build outputs (what actually ships)

- `Build/<name>.loader.js` — loader.
- `Build/<name>.framework.js.unityweb` — engine + jslib bridges.
- `Build/<name>.wasm.unityweb` — IL2CPP code (C# lands here).
- `Build/<name>.data.unityweb` — assets/resources (usually the huge one).
- An **`index.html`** page + a small `config.js`.

Implication: a **code-only** change (C# or a `.jslib`) usually alters the small
`wasm`/`framework` files, **not** the multi-hundred-MB `data` file — so players
re-download little. Verify by hashing the four files before/after a build.

## 3. WebGL template & the page gotcha

- The page is generated from `Assets/WebGLTemplates/<Name>/index.html`, which
  contains engine placeholders: `{{{ PRODUCT_NAME }}}`, `{{{ WIDTH }}}`,
  `{{{ HEIGHT }}}`, `{{{ LOADER_FILENAME }}}`, `{{{ DATA_FILENAME }}}`,
  `{{{ FRAMEWORK_FILENAME }}}`, `{{{ CODE_FILENAME }}}`,
  `{{{ JSON.stringify(COMPANY_NAME) }}}`, and `#if USE_WASM`/`#endif` blocks.
- **Some engines do NOT regenerate the deployable `index.html` from the template
  on a normal build.** After editing the template, regenerate the shipped page
  yourself: substitute the placeholders, strip the `#if`/`#endif` lines, then
  copy it to wherever it is served. Forgetting this ships a stale page.

## 4. The JS ⇄ C# bridge (.jslib)

- Put page-callable functions in `Assets/Plugins/WebGL/<Name>.jslib`:
  ```js
  mergeInto(LibraryManager.library, {
    MyThing: function (ptr) { var s = UTF8ToString(ptr); /* ... */
      SendMessage('BridgeObject', 'OnResult', 'value'); }
  });
  ```
- Declare on the C# side: `[DllImport("__Internal")] private static extern void MyThing(string s);`
  guarded by `#if UNITY_WEBGL && !UNITY_EDITOR`, with a no-op fallback.
- Incoming: the page calls `unityInstance.SendMessage(gameObject, method, arg)`.
- Use `.jslib` for anything the browser must do that C# cannot: permissions,
  clipboard, TTS, WebSocket probing, prompts.

## 5. Secrets & config

- Keep the AppId/keys in a `config.js` that is **served separately** and **not**
  in the repo. Ship the release with an **empty** AppId so downloaders supply
  their own.
- Blank any exported middleware ids baked into assets (e.g. a
  `PhotonServerSettings.asset`) and document the change in a `MANUAL-PATCHES.md`.
- Re-run a secret scan (AppId/UUID patterns, forbidden files) before every commit.

## 6. Common substitutions the port needs

| Desktop | Browser replacement |
|---|---|
| Steam auth/invites/overlay | own accounts + room-code share UI |
| Native TTS synth | `window.speechSynthesis` |
| Native voice capture | `navigator.mediaDevices.getUserMedia` (gesture-gated) |
| File saves | `IndexedDB`/`localStorage` via a jslib bridge |
| Clipboard | `navigator.clipboard` + `execCommand` fallback |
| Raw input (ctrl) | DOM events forwarded into the engine |

See `04-browser-platform-playbook.md` for networking/hosting and
`05-hard-won-lessons.md` for the traps.
