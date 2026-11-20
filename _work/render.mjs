/**
 * render.mjs — deterministic frame capture of the ad composition via CDP.
 *
 * Usage:
 *   node render.mjs --url http://127.0.0.1:8123/ad.html --out frames/ --fps 30
 *                   [--start 0] [--end 59.5] [--shot t1,t2,...] [--dir shots/]
 *
 * Pipes PNG frames straight into a raw image2pipe of the given output dir
 * (files named f000001.png) unless --shot is given, in which case single
 * preview frames are written instead.
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const args = {};
for (let i = 2; i < process.argv.length; i += 2) {
  const k = process.argv[i].replace(/^--/, '');
  args[k] = process.argv[i + 1];
}
const URL_ = args.url || 'http://127.0.0.1:8123/ad.html';
const FPS = Number(args.fps || 30);
const START = Number(args.start ?? 0);
const END = args.end !== undefined ? Number(args.end) : null;
const OUT = args.out || 'frames';
const SHOTS = args.shot ? args.shot.split(',').map(Number) : null;
const SHOTDIR = args.dir || 'shots';
const CHROME = args.chrome || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const FFMPEG = args.ffmpeg || './bin/ffmpeg';
const W = 1080, H = 1920;

const sleep = ms => new Promise(r => setTimeout(r, ms));

/* ---------- minimal CDP client ---------- */
class CDP {
  constructor(ws) { this.ws = ws; this.id = 0; this.pending = new Map(); this.handlers = new Map();
    ws.addEventListener('message', ev => {
      const msg = JSON.parse(ev.data);
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        msg.error ? reject(new Error(JSON.stringify(msg.error))) : resolve(msg.result);
      } else if (msg.method) {
        (this.handlers.get(msg.method) || []).forEach(fn => fn(msg.params));
      }
    });
  }
  on(method, fn) { if (!this.handlers.has(method)) this.handlers.set(method, []); this.handlers.get(method).push(fn); }
  send(method, params = {}) {
    const id = ++this.id;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
      setTimeout(() => { if (this.pending.has(id)) { this.pending.delete(id); reject(new Error('CDP timeout: ' + method)); } }, 120000);
    });
  }
}

async function fetchJson(url) {
  const r = await fetch(url);
  return r.json();
}

async function main() {
  const userDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dsh-chrome-'));
  const port = 9333 + Math.floor(Math.random() * 400);
  const chrome = spawn(CHROME, [
    '--headless=new',
    '--no-sandbox',
    '--disable-gpu-sandbox',
    '--disable-setuid-sandbox',
    '--disable-crash-reporter',
    '--disable-breakpad',
    '--disable-dev-shm-usage',
    `--crash-dumps-dir=${userDir}/crash`,
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${userDir}`,
    `--window-size=${W},${H}`,
    '--force-device-scale-factor=1',
    '--hide-scrollbars',
    '--mute-audio',
    '--no-first-run', '--no-default-browser-check', '--disable-extensions',
    '--disable-background-timer-throttling', '--disable-renderer-backgrounding',
    '--disable-backgrounding-occluded-windows',
    '--autoplay-policy=no-user-gesture-required',
    '--disable-features=CalculateNativeWinOcclusion',
    '--font-render-hinting=none',
    '--disable-font-subpixel-positioning',
    'about:blank',
  ], { stdio: ['ignore', 'pipe', 'pipe'] });
  let chromeErr = '';
  chrome.stderr.on('data', d => { chromeErr += d.toString(); });

  let target = null;
  for (let i = 0; i < 80; i++) {
    try {
      const list = await fetchJson(`http://127.0.0.1:${port}/json/list`);
      target = list.find(t => t.type === 'page');
      if (target) break;
    } catch { /* not up yet */ }
    await sleep(250);
  }
  if (!target) { console.error('Chrome did not start.\n' + chromeErr); process.exit(1); }

  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.addEventListener('open', res); ws.addEventListener('error', rej); });
  const cdp = new CDP(ws);

  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: W, height: H, deviceScaleFactor: 1, mobile: false,
    screenWidth: W, screenHeight: H,
  });

  // capture console errors
  cdp.on('Runtime.consoleAPICalled', p => {
    if (p.type === 'error') console.error('[page error]', p.args.map(a => a.value ?? a.description).join(' '));
  });
  cdp.on('Runtime.exceptionThrown', p => console.error('[page exception]', JSON.stringify(p.exceptionDetails?.exception?.description || p.exceptionDetails)));

  await cdp.send('Page.navigate', { url: URL_ });
  await new Promise(r => cdp.on('Page.loadEventFired', r));

  // wait for readiness + fonts + video metadata
  const t0 = Date.now();
  for (;;) {
    const { result } = await cdp.send('Runtime.evaluate', {
      expression: `(async()=>{
        if(!window.__ready) return 'notready';
        await document.fonts.ready;
        const v=window.__vid;
        if(v && v.readyState<1) return 'video';
        if(v && !v.duration) return 'vidmeta';
        return 'ok';
      })()`, awaitPromise: true, returnByValue: true,
    });
    if (result.value === 'ok') break;
    if (Date.now() - t0 > 30000) { console.error('readiness timeout, last=' + result.value); break; }
    await sleep(150);
  }

  const duration = (await cdp.send('Runtime.evaluate', { expression: 'window.__DURATION', returnByValue: true })).result.value;
  const end = END ?? duration;
  const total = Math.max(1, Math.round((end - START) * FPS));

  const grab = async (t) => {
    await cdp.send('Runtime.evaluate', {
      expression: `window.__seek(${t})`, awaitPromise: true, returnByValue: true,
    });
    const { data } = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false, fromSurface: true });
    return Buffer.from(data, 'base64');
  };

  if (SHOTS) {
    fs.mkdirSync(SHOTDIR, { recursive: true });
    for (const t of SHOTS) {
      const buf = await grab(t);
      const f = path.join(SHOTDIR, `t${String(t).replace('.', '_')}.png`);
      fs.writeFileSync(f, buf);
      console.log('wrote', f, (buf.length / 1024).toFixed(0) + 'KB');
    }
  } else if (args.pipe) {
    // stream PNG frames straight into ffmpeg — no intermediate frames on disk
    const ff = spawn(FFMPEG, [
      '-hide_banner', '-loglevel', 'error', '-y',
      '-f', 'image2pipe', '-vcodec', 'png', '-framerate', String(FPS), '-i', '-',
      '-c:v', 'libx264', '-preset', 'slow', '-crf', String(args.crf || 12),
      '-pix_fmt', 'yuv420p', '-r', String(FPS), args.pipe,
    ], { stdio: ['pipe', 'inherit', 'inherit'] });
    const started = Date.now();
    for (let i = 0; i < total; i++) {
      const t = START + i / FPS;
      const buf = await grab(Math.min(t, duration - 1 / FPS));
      if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
      if (i % 30 === 0 || i === total - 1) {
        const el = (Date.now() - started) / 1000;
        const eta = el / (i + 1) * (total - i - 1);
        process.stdout.write(`\r  frame ${i + 1}/${total}  t=${t.toFixed(2)}s  elapsed ${el.toFixed(0)}s  eta ${eta.toFixed(0)}s   `);
      }
    }
    process.stdout.write('\n');
    ff.stdin.end();
    await new Promise((res, rej) => { ff.on('close', c => c === 0 ? res() : rej(new Error('ffmpeg exit ' + c))); });
    console.log('wrote', args.pipe);
  } else {
    fs.mkdirSync(OUT, { recursive: true });
    const started = Date.now();
    for (let i = 0; i < total; i++) {
      const t = START + i / FPS;
      const buf = await grab(Math.min(t, duration - 1 / FPS));
      fs.writeFileSync(path.join(OUT, `f${String(i + 1).padStart(6, '0')}.png`), buf);
      if (i % 30 === 0 || i === total - 1) {
        const el = (Date.now() - started) / 1000;
        const eta = el / (i + 1) * (total - i - 1);
        process.stdout.write(`\r  frame ${i + 1}/${total}  t=${t.toFixed(2)}s  elapsed ${el.toFixed(0)}s  eta ${eta.toFixed(0)}s   `);
      }
    }
    process.stdout.write('\n');
  }

  ws.close();
  chrome.kill('SIGKILL');
  try { fs.rmSync(userDir, { recursive: true, force: true }); } catch {}
}

main().catch(e => { console.error(e); process.exit(1); });
