'use strict';
// Shared Puppeteer launcher for every harness in webtest\.
//
// WHY: each harness used to mint its own %TEMP%\repo-* userDataDir and only call
// browser.close(), so every run leaked a full Chrome profile (Unity's 425 MB
// IndexedDB data cache + component caches + blob_storage).
//
// Layout:
//   throwaway (fresh)  -> %TEMP%\repo-webtest\<runId>\<tag>   deleted on close
//   host/guest/feat    -> C:\repo-webport\webtest\profiles\<name>   persistent
//   cache              -> C:\repo-webport\webtest\profiles\cache    persistent
//   {persist:true,name}-> C:\repo-webport\webtest\profiles\<name>   persistent
//
// Deletion is always confined to %TEMP%\repo-webtest, %TEMP%\repo-* (legacy
// loose profiles) and C:\repo-webport\webtest\profiles (asserted by path prefix).
const puppeteer = require('puppeteer-core');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

// Override for other machines/repos: REPO_CHROME and REPO_PROFILES_ROOT.
const CHROME = process.env.REPO_CHROME || (process.platform === 'win32' ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' : process.platform === 'darwin' ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' : '/usr/bin/google-chrome');
const TEMP = path.resolve(os.tmpdir());
const RUN_ROOT = path.join(TEMP, 'repo-webtest');
const PROFILES = path.resolve(process.env.REPO_PROFILES_ROOT || path.join(TEMP, 'repo-webtest-profiles'));
const RUN_ID = `${Date.now()}-${process.pid}`;
const RUN_DIR = path.join(RUN_ROOT, RUN_ID);

const HOUR = 60 * 60 * 1000;
const STALE_MS = 12 * HOUR;          // never touch anything younger than this
const CAP_BYTES = 10 * 1024 ** 3;    // hard cap for the whole profile pool
const CAP_COUNT = 20;
const NEVER_DELETE = new Set(['repo-save-multi-profile', 'repo-webtest']);

// SwiftShader args the harnesses already used, plus cache/component hygiene.
const SWIFT_ARGS = [
  '--no-sandbox', '--disable-setuid-sandbox',
  '--use-gl=angle', '--use-angle=swiftshader',
  '--enable-unsafe-swiftshader', '--enable-webgl',
  '--ignore-gpu-blocklist', '--window-size=1280,720',
  '--autoplay-policy=no-user-gesture-required',
  '--disable-component-update',
  '--disable-features=OptimizationHints,OptimizationGuideModelDownloading',
  '--disk-cache-size=268435456',
];

const liveDirs = new Set();
const liveBrowsers = new Map();
let handlersRegistered = false;

function say(msg) { try { console.log(msg); } catch (_) {} }

function buildArgs(extra = []) {
  const args = [];
  const features = new Set();
  const push = a => {
    if (typeof a !== 'string' || !a) return;
    if (/^--user-data-dir=/i.test(a)) return;          // puppeteer owns this
    const m = /^--disable-features=(.*)$/i.exec(a);
    if (m) { m[1].split(',').filter(Boolean).forEach(f => features.add(f)); return; }
    if (!args.includes(a)) args.push(a);
  };
  SWIFT_ARGS.forEach(push);
  extra.forEach(push);
  if (features.size) args.push('--disable-features=' + [...features].join(','));
  return args;
}

function isLegacyTempProfile(p) {
  const rp = path.resolve(p);
  return path.dirname(rp) === TEMP && /^repo-/i.test(path.basename(rp)) && path.basename(rp).toLowerCase() !== 'repo-webtest';
}

function assertSafe(p) {
  const rp = path.resolve(p);
  const roots = [RUN_ROOT, PROFILES].map(r => path.resolve(r));
  if (roots.includes(rp) || rp === TEMP) throw new Error('refusing to delete a root: ' + rp);
  const inside = roots.some(r => rp.startsWith(r + path.sep));
  if (!inside && !isLegacyTempProfile(rp)) {
    throw new Error('refusing to delete outside allowed roots: ' + rp);
  }
  const base = path.basename(rp).toLowerCase();
  if (NEVER_DELETE.has(base)) throw new Error('refusing to delete protected profile: ' + rp);
  return rp;
}

function rmDir(dir, why = '') {
  try { assertSafe(dir); } catch (e) { say('[profile] SKIP ' + e.message); return false; }
  try {
    fs.rmSync(dir, { recursive: true, force: true, maxRetries: 8, retryDelay: 250 });
    return true;
  } catch (e) {
    say(`[profile] rm failed ${dir}${why ? ' (' + why + ')' : ''}: ${e.code || e.message}`);
    return false;
  }
}

function pruneRunDir() {
  try { fs.rmdirSync(RUN_DIR); } catch (_) {}     // only succeeds when empty
  try { fs.rmdirSync(RUN_ROOT); } catch (_) {}
}

function dirSize(dir) {
  let total = 0;
  const stack = [dir];
  while (stack.length) {
    const d = stack.pop();
    let dh;
    try { dh = fs.opendirSync(d); } catch (_) { continue; }
    try {
      let e;
      while ((e = dh.readSync())) {
        const p = path.join(d, e.name);
        try {
          if (e.isDirectory()) stack.push(p);
          else if (e.isFile()) total += fs.statSync(p).size;
        } catch (_) {}
      }
    } catch (_) {
    } finally { try { dh.closeSync(); } catch (_) {} }
  }
  return total;
}

function pidAlive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try { process.kill(pid, 0); return true; } catch (_) { return false; }
}

function lockPid(dir) {
  for (const name of ['SingletonLock', 'SingletonCookie']) {
    const p = path.join(dir, name);
    let target = '';
    try { target = fs.readlinkSync(p); } catch (_) { }
    if (!target) { try { target = fs.readFileSync(p, 'utf8'); } catch (_) {} }
    const m = /(\d+)\s*$/.exec(String(target || '').trim());
    if (m) return Number(m[1]);
  }
  return null;
}

function profileInUse(dir, chromeDirs) {
  if (chromeDirs && chromeDirs.has(path.resolve(dir))) return true;
  const pid = lockPid(dir);
  if (pid && pidAlive(pid)) return true;
  const lockfile = path.join(dir, 'lockfile');
  try {
    const st = fs.statSync(lockfile);
    if (Date.now() - st.mtimeMs < 2 * 60 * 1000) return true;   // freshly touched
  } catch (_) {}
  try {
    const st = fs.statSync(path.join(dir, 'DevToolsActivePort'));
    if (Date.now() - st.mtimeMs < 60 * 1000) return true;
  } catch (_) {}
  return false;
}

function chromeProfileDirs() {
  const out = new Set();
  try {
    const ps = execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command',
      "Get-CimInstance Win32_Process -Filter \"Name='chrome.exe'\" | Select-Object -ExpandProperty CommandLine"],
      { encoding: 'utf8', timeout: 20000, windowsHide: true, maxBuffer: 8 * 1024 * 1024 });
    for (const line of String(ps).split(/\r?\n/)) {
      const m = /--user-data-dir=(?:"([^"]+)"|(\S+))/i.exec(line);
      if (m) out.add(path.resolve(String(m[1] || m[2]).replace(/^"|"$/g, '')));
    }
  } catch (_) {}
  return out;
}

let sweepPromise = null;
let sweepReport = null;

async function sweepProfiles(opts = {}) {
  if (sweepReport && !opts.force) return sweepReport;
  if (sweepPromise) return sweepPromise;
  sweepPromise = (async () => {
    const t0 = Date.now();
    const now = Date.now();
    const skip = [];
    const candidates = [];
    let youngCount = 0;

    const consider = (dir, label) => {
      const base = path.basename(dir).toLowerCase();
      if (NEVER_DELETE.has(base)) { skip.push({ dir, why: 'protected' }); return; }
      if (path.resolve(dir) === path.resolve(RUN_DIR)) { skip.push({ dir, why: 'current run' }); return; }
      let st;
      try { st = fs.statSync(dir); } catch (_) { return; }
      if (!st.isDirectory()) return;
      const ageMs = now - st.mtimeMs;
      if (ageMs < STALE_MS) { youngCount++; skip.push({ dir, why: 'younger than 12h' }); return; }
      candidates.push({ dir, label, mtime: st.mtimeMs, ageMs, size: 0 });
    };

    try {
      for (const e of fs.readdirSync(TEMP, { withFileTypes: true })) {
        if (e.isDirectory() && /^repo-/i.test(e.name) && e.name.toLowerCase() !== 'repo-webtest') {
          consider(path.join(TEMP, e.name), 'legacy');
        }
      }
    } catch (_) {}
    try {
      for (const e of fs.readdirSync(RUN_ROOT, { withFileTypes: true })) {
        if (!e.isDirectory()) continue;
        const p = path.join(RUN_ROOT, e.name);
        if (path.resolve(p) !== path.resolve(RUN_DIR)) {
          const pm = /-(\d+)$/.exec(e.name);
          const runPid = pm ? Number(pm[1]) : 0;
          // A run dir whose owning node process is gone is dead weight: remove it
          // regardless of age (it is inside our own root, never a user profile).
          if (runPid && !pidAlive(runPid)) {
            if (rmDir(p, 'dead run')) { say('[sweep] removed abandoned run dir ' + e.name); continue; }
          }
          try { if (fs.readdirSync(p).length === 0) { fs.rmdirSync(p); continue; } } catch (_) {}
        }
        consider(p, 'run');
      }
    } catch (_) {}

    if (!candidates.length) {
      sweepReport = { deleted: [], freedBytes: 0, skipped: skip, remainingBytes: 0, remainingCount: youngCount, elapsedMs: Date.now() - t0 };
      try { fs.rmdirSync(RUN_ROOT); } catch (_) {}     // empty run root: tidy, ignore if non-empty
      sweepPromise = null;
      return sweepReport;
    }

    const chromeDirs = chromeProfileDirs();
    const eligible = candidates.filter(c => {
      if (profileInUse(c.dir, chromeDirs)) { skip.push({ dir: c.dir, why: 'in use' }); return false; }
      return true;
    });
    eligible.sort((a, b) => a.mtime - b.mtime);

    for (const c of eligible) c.size = dirSize(c.dir);

    // Everything older than 12 h goes (oldest first). The cap is the ceiling the
    // pool must end up under; the 12 h floor always wins over the cap.
    const deleted = [];
    let freed = 0;
    let keptBytes = 0;
    for (const c of eligible) {
      if (rmDir(c.dir, 'sweep')) {
        deleted.push({ dir: c.dir, bytes: c.size, ageH: +(c.ageMs / HOUR).toFixed(1) });
        freed += c.size;
        say(`[sweep] deleted ${path.basename(c.dir)} (${(c.size / 1024 ** 3).toFixed(2)} GB, ${(c.ageMs / HOUR).toFixed(1)}h old)`);
      } else {
        keptBytes += c.size;
      }
    }
    const keptCount = candidates.length - deleted.length + youngCount;
    if (!deleted.length && (keptBytes > CAP_BYTES || keptCount > CAP_COUNT)) {
      say(`[sweep] WARNING pool is over the ${CAP_COUNT}-profile / 10 GB cap but everything left is younger than 12h; leaving it alone.`);
    }
    try { fs.rmdirSync(RUN_ROOT); } catch (_) {}

    sweepReport = {
      deleted, freedBytes: freed, skipped: skip,
      remainingBytes: keptBytes, remainingCount: keptCount,
      elapsedMs: Date.now() - t0,
    };
    if (deleted.length) {
      say(`[sweep] freed ${(freed / 1024 ** 3).toFixed(2)} GB in ${deleted.length} dir(s); ${keptCount} profile(s) remain (${sweepReport.elapsedMs} ms)`);
    } else {
      say(`[sweep] nothing to delete (${skip.length} skipped, ${sweepReport.elapsedMs} ms)`);
    }
    sweepPromise = null;
    return sweepReport;
  })();
  return sweepPromise;
}

function sleepSync(ms) {
  try { Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms); }
  catch (_) { const end = Date.now() + ms; while (Date.now() < end) { /* busy */ } }
}

// On an interrupt the browser is still running and holds its profile files, so a
// plain rm would fail with EPERM. Kill the whole Chrome tree first (sync), then rm.
function forceKill(browser) {
  let pid = null;
  try { const proc = browser && browser.process && browser.process(); if (proc) pid = proc.pid; } catch (_) {}
  if (!pid) return;
  try { execFileSync('taskkill', ['/PID', String(pid), '/T', '/F'], { stdio: 'ignore', timeout: 10000, windowsHide: true }); } catch (_) {}
  try { browser.process().kill('SIGKILL'); } catch (_) {}
}

function registerHandlers() {
  if (handlersRegistered) return;
  handlersRegistered = true;
  const cleanNow = () => {
    for (const b of liveBrowsers.values()) forceKill(b);
    if (liveBrowsers.size) sleepSync(400);
    for (const d of liveDirs) rmDir(d, 'signal');
    liveDirs.clear();
    liveBrowsers.clear();
    pruneRunDir();
  };
  process.on('exit', cleanNow);
  process.once('SIGINT', () => { say('\n[profile] SIGINT - removing current run dir'); cleanNow(); process.exit(130); });
  process.once('SIGTERM', () => { say('[profile] SIGTERM - removing current run dir'); cleanNow(); process.exit(143); });
  // Only take over crash handling when nobody else has; a harness may want to
  // log an uncaught exception itself (its own listener still fires either way
  // because 'exit' cleans up).
  if (process.listenerCount('uncaughtException') === 0) {
    process.on('uncaughtException', e => { say('[profile] uncaughtException: ' + (e && e.stack || e)); cleanNow(); process.exit(1); });
  }
  if (process.listenerCount('unhandledRejection') === 0) {
    process.on('unhandledRejection', e => { say('[profile] unhandledRejection: ' + (e && e.stack || e)); cleanNow(); process.exit(1); });
  }
}

function resolveProfile(profile, tag) {
  if (profile === undefined || profile === null || profile === 'fresh') {
    return { dir: path.join(RUN_DIR, String(tag || 'main')), throwaway: true };
  }
  if (profile === 'cache' || profile === 'host' || profile === 'guest' || profile === 'feat') {
    return { dir: path.join(PROFILES, profile), throwaway: false };
  }
  if (typeof profile === 'object' && profile.persist && profile.name) {
    return { dir: path.join(PROFILES, String(profile.name)), throwaway: false };
  }
  if (typeof profile === 'string' && profile.trim()) {
    return { dir: path.join(PROFILES, profile.trim()), throwaway: false };
  }
  throw new Error('bad profile spec: ' + JSON.stringify(profile));
}

async function launch(opts = {}) {
  registerHandlers();
  if (!process.env.REPO_NO_SWEEP) { try { await sweepProfiles(); } catch (_) {} }
  const {
    tag = 'main', profile = 'fresh', args = [], headless = 'new',
    viewport = { width: 1280, height: 720 }, newPage = true,
    protocolTimeout, keep = false,
  } = opts;

  const { dir, throwaway } = resolveProfile(profile, tag);
  if (throwaway) { fs.mkdirSync(dir, { recursive: true }); liveDirs.add(path.resolve(dir)); }
  else { fs.mkdirSync(dir, { recursive: true }); }

  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless,
    userDataDir: dir,
    args: buildArgs(args),
    defaultViewport: viewport,
    ...(protocolTimeout ? { protocolTimeout } : {}),
  });

  const page = newPage ? await browser.newPage() : null;
  if (throwaway) liveBrowsers.set(path.resolve(dir), browser);
  let closed = false;
  const close = async () => {
    if (closed) return;
    closed = true;
    try { await browser.close(); } catch (_) {}
    if (throwaway && !keep) {
      rmDir(dir, 'throwaway');
      liveDirs.delete(path.resolve(dir));
      pruneRunDir();
    }
    liveBrowsers.delete(path.resolve(dir));
  };

  return { browser, page, dir, close, throwaway, runDir: RUN_DIR };
}

async function withProfile(opts, fn) {
  const ctx = await launch(opts);
  try {
    return await fn(ctx);
  } finally {
    await ctx.close();
  }
}

// Drop ONLY the game saves from Unity's persistentDataPath IndexedDB storage:
//   * normal layout: ONE database named "/idbfs" whose FILE_DATA keys are absolute
//     FS paths, saves live under "/idbfs/<hash>/saves/...". We delete just those keys.
//   * alternate layout: a database literally named "/idbfs/<hash>" -> delete the DB.
// UnityCache_* (the 425 MB .data cache) is never touched.
async function clearSaveDbs(page, url, log = say) {
  const origin = new URL(url).origin;
  const probe = origin + '/__repo_clear_saves__';
  await page.goto(probe, { waitUntil: 'domcontentloaded', timeout: 90000 });
  const res = await page.evaluate(async () => {
    const openDb = name => new Promise((res, rej) => {
      const r = indexedDB.open(name);
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
      r.onblocked = () => rej(new Error('blocked'));
    });
    const allDbs = (await indexedDB.databases()).map(d => d.name).filter(n => typeof n === 'string');
    const removedDbs = [];
    const removedKeys = [];
    const kept = [];
    for (const name of allDbs) {
      if (!name.startsWith('/idbfs')) { kept.push(name); continue; }
      if (name !== '/idbfs') {
        await new Promise(res => {
          const r = indexedDB.deleteDatabase(name);
          r.onsuccess = r.onerror = r.onblocked = () => res();
        });
        removedDbs.push(name);
        continue;
      }
      const db = await openDb(name);
      try {
        const stores = [...db.objectStoreNames];
        const keys = [];
        for (const s of stores) {
          const st = db.transaction(s, 'readonly').objectStore(s);
          keys.push(...await new Promise(res => {
            const r = st.getAllKeys();
            r.onsuccess = () => res(r.result);
            r.onerror = () => res([]);
          }));
        }
        const targets = keys.filter(k => typeof k === 'string' && /^\/idbfs\/[^/]+\/saves(\/|$)/.test(k));
        if (targets.length) {
          await new Promise((res, rej) => {
            const tx = db.transaction(stores, 'readwrite');
            tx.oncomplete = () => res();
            tx.onerror = () => rej(tx.error);
            tx.onabort = () => rej(tx.error);
            for (const s of stores) {
              const st = tx.objectStore(s);
              for (const k of targets) st.delete(k);
            }
          });
          removedKeys.push(...targets);
        }
      } finally { db.close(); }
    }
    return { removedDbs, removedKeys, kept };
  });
  log(`[saves] cleared ${res.removedDbs.length} idbfs db(s) + ${res.removedKeys.length} save key(s)` +
    (res.removedKeys.length ? ' (' + res.removedKeys.slice(0, 6).join(', ') + ')' : '') +
    (res.kept.length ? ' | kept: ' + res.kept.join(', ') : ''));
  return res;
}

module.exports = {
  CHROME, TEMP, RUN_ROOT, RUN_DIR, PROFILES, SWIFT_ARGS,
  launch, withProfile, sweepProfiles, clearSaveDbs,
  assertSafe, rmDir, dirSize,
};
