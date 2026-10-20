# profile-hygiene: stop Puppeteer from leaking browser profiles

Puppeteer suites for heavy WebGL builds leak hundreds of megabytes per run if every test mints a
throwaway `userDataDir` and only calls `browser.close()`. Chrome keeps the profile: IndexedDB
(Unity/WebGL data cache and saves), component caches, and `blob_storage`. On the R.E.P.O. port this
reached **125 profiles / 55.95 GB in `%TEMP%`** from ~4 days of testing.

This directory contains the drop-in launcher that fixed it (`profile.js`), extracted from a real
project and made portable:

- `REPO_CHROME` - Chrome/Chromium executable (auto-detects the Windows/macOS/Linux default).
- `REPO_PROFILES_ROOT` - where persistent profiles live (default `%TEMP%/repo-webtest-profiles`).
- `REPO_NO_SWEEP=1` - skip the lazy sweep.

## What it guarantees

| Concern | Behaviour |
|---|---|
| Throwaway isolation | profile at `%TEMP%/repo-webtest/<runId>/<tag>`, deleted after `browser.close()` |
| Interrupts | `exit`, SIGINT, SIGTERM, `uncaughtException`, `unhandledRejection` handlers kill the Chrome tree, then delete the run dir |
| Persistent profiles | `profile: 'host' | 'guest' | 'cache' | {persist:true,name}` reuse one profile (keeps a warm Unity cache) |
| Sweep | `%TEMP%/repo-*` older than 12 h, skipping locked/in-use dirs and dead-owner run dirs; 10 GB / 20 profile cap, oldest first |
| Safe deletion | path assertions confine deletes to the run root, the profiles root, or legacy `%TEMP%/repo-*`; a protected-name set is refused |
| Save-test isolation | `clearSaveDbs(page, url)` drops only the game-save keys (the `/idbfs` IndexedDB DB) and keeps the WebGL payload cache |
| Chrome overhead | `--disable-component-update`, `--disable-features=OptimizationHints,OptimizationGuideModelDownloading`, `--disk-cache-size=256MB` |

## Use

```js
const { launch, withProfile, sweepProfiles, clearSaveDbs } = require('./profile');

await withProfile({ tag: 'GUEST' }, async ({ page }) => {
  await page.goto(url);
  // assertions...
});

const cached = await launch({ tag: 'CACHE', profile: 'cache' });   // warm Unity cache
const saves  = await launch({ tag: 'SAVES', profile: { persist: true, name: 'saves' } });
await clearSaveDbs(saves.page, url);                                // keep the 425 MB cache

await sweepProfiles();                                              // suite start; idempotent
```

## Playbook

1. Before writing a harness, decide: isolated (`fresh`) or persistent (`profiles/`).
2. Use `withProfile()` (never bare `launch` + `browser.close`) so a failed assertion still cleans up.
3. For save/persistence tests, reuse the profile and clear only the saved-data keys.
4. At suite start call `sweepProfiles()`; never bulk-delete while a test is running.
5. After the suite, assert: no new `%TEMP%/repo-*`, `%TEMP%` delta < 100 MB.

Measured on the source project: 125 dirs / 55.95 GB → 17 pre-existing dirs / 7.90 GB
(≈48 GB freed), `TEMP_DELTA_MB=0` after a full suite run.
