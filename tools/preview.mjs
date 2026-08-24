/* ============================================================
 * tools/preview.mjs — CPU ray-marched preview of the SDF organ
 * and hero fields, with procedural palette sampling. No DOM,
 * no GPU: iterate shapes and colors locally, then verify in a
 * real browser via the codespace.
 *
 *   node tools/preview.mjs liver|stomach|heart|kidneys|pancreas|intestines|pomegranate [--size 700]
 *   → writes /tmp/preview-<organ>.png
 * ============================================================ */
import { SDF, op, makeNoise, fbm } from '../src/js/three/sculpt.js'
import { RECIPES } from '../src/js/three/tissue-recipes.js'
import { CONDITIONS } from '../src/js/data/conditions.js'
import { deflateSync } from 'node:zlib'
import { writeFileSync } from 'node:fs'

const arg = process.argv[2] || 'liver'
const _si = process.argv.indexOf('--size')
const SIZE = Number(_si >= 0 ? process.argv[_si + 1] : 700)

/* ---------------- PNG writer ---------------- */
const crcTable = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c >>> 0
  }
  return t
})()
function crc32(buf) {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length)
  const t = Buffer.from(type, 'ascii')
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([t, data])))
  return Buffer.concat([len, t, data, crc])
}
function writePNG(path, w, h, rgba) {
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4)
  ihdr[8] = 8; ihdr[9] = 6
  const raw = Buffer.alloc((w * 4 + 1) * h)
  for (let y = 0; y < h; y++) {
    raw[y * (w * 4 + 1)] = 0
    rgba.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4)
  }
  const idat = deflateSync(raw, { level: 6 })
  writeFileSync(path, Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))
  ]))
}

/* ---------------- fields (mirror organs.js / hero.js) ---------------- */
function fieldOf(fn) { return (x, y, z) => fn([x, y, z]) }
function organic(seed, amp, freq) {
  const n = makeNoise(seed, 6)
  return (p) => fbm(n, p[0] * freq + 0.5, p[1] * freq + 0.5, p[2] * freq + 0.5, 2) * amp
}

/* pomegranate — mirror of hero.js fields */
const pomRind = (p) => {
  const cutShape = (q) => op.at(q, SDF.roundBox([0.55, 0.45, 0.42], 0.03), { tx: 0.0, ty: 0.62, tz: 0.66, rx: -0.6 })
  const innerShape = (q) => op.at(q, SDF.sphere(0.78), { ty: -0.06 })
  const tipShape = (q) => op.at(q, SDF.sphere(0.3), { ty: 1.02 })
  const noise = organic(101, 0.02, 2.2)
  let d = SDF.ellipsoid([0.98, 0.92, 0.92])(p) + noise(p)
  d = op.smoothUnion(d, tipShape(p), 0.2)
  d = op.smoothSubtract(d, innerShape(p), 0.02)
  d = op.subtract(d, cutShape(p))
  return d
}
const pomFlesh = (p) => {
  const dome = (q) => op.at(q, SDF.sphere(0.84), { ty: -0.26 })
  return dome(p) + organic(103, 0.012, 2.6)(p)
}
const FIELDS = {
  pomegranate: (p) => op.smoothUnion(pomRind(p), pomFlesh(p), 0.001),
  liver: (p) => {
    const right = op.at(p, SDF.ellipsoid([0.64, 0.42, 0.52]), { tx: 0.36, ty: 0.06, tz: -0.02 })
    const left = op.at(p, SDF.ellipsoid([0.62, 0.16, 0.35]), { tx: -0.42, ty: 0.18, tz: -0.02 })
    const lower = op.at(p, SDF.ellipsoid([0.44, 0.3, 0.34]), { tx: 0.2, ty: -0.12, tz: 0.1 })
    let d = op.smoothUnion(right, left, 0.22)
    d = op.smoothUnion(d, lower, 0.18)
    const carve = op.at(p, SDF.sphere(1.28), { tx: 0.1, ty: -1.35, tz: 0.05 })
    d = op.smoothSubtract(d, carve, 0.1)
    const f = SDF.capsule([0.06, 0.62, -0.34], [0.06, 0.62, 0.42], 0.045)(p)
    d = op.smoothSubtract(d, f, 0.04)
    return d + organic(11, 0.012, 3.1)(p)
  },
  stomach: (p) => {
    const pts = [[0.02, 1.02, -0.02], [-0.3, 0.94, -0.03], [-0.5, 0.66, 0.0], [-0.48, 0.3, 0.05], [-0.3, -0.06, 0.09], [0.02, -0.3, 0.12], [0.34, -0.3, 0.1], [0.5, -0.12, 0.04], [0.56, 0.12, -0.04]]
    const radii = [0.14, 0.26, 0.31, 0.33, 0.31, 0.27, 0.22, 0.16, 0.12]
    const sweep = capsuleSweepOf(pts, radii)
    const fundus = op.at(p, SDF.sphere(0.26), { tx: -0.34, ty: 0.86, tz: 0.0 })
    let d = op.smoothUnion(sweep(p), fundus, 0.06)
    return d + organic(23, 0.01, 2.8)(p)
  }
}
// local reimplementation to avoid pulling organs.js (DOM)
function capsuleSweepOf(points, radii) {
  const segs = []
  for (let i = 0; i < points.length - 1; i++) segs.push({ a: points[i], b: points[i + 1], ra: radii[i], rb: radii[i + 1] })
  return (p) => {
    let d = SDF.cone(segs[0].a, segs[0].b, segs[0].ra, segs[0].rb)(p)
    for (let i = 1; i < segs.length; i++) d = op.smoothUnion(d, SDF.cone(segs[i].a, segs[i].b, segs[i].ra, segs[i].rb)(p), 0.05)
    return d
  }
}

/* ---------------- grid-based ray march ---------------- */
function buildGrid(field, res = 84) {
  const n = res + 1
  const min = -1.7, max = 1.7
  const step = (max - min) / res
  const g = new Float32Array(n * n * n)
  for (let k = 0; k < n; k++) {
    const z = min + k * step
    for (let j = 0; j < n; j++) {
      const y = min + j * step
      const o = (k * n + j) * n
      for (let i = 0; i < n; i++) g[o + i] = field(min + i * step, y, z)
    }
  }
  return { g, n, min, max, step }
}
function sampleG(G, x, y, z) {
  const { g, n, min, step } = G
  let fx = (x - min) / step, fy = (y - min) / step, fz = (z - min) / step
  const clamp = (v) => Math.min(n - 1.001, Math.max(0, v))
  fx = clamp(fx); fy = clamp(fy); fz = clamp(fz)
  const x0 = fx | 0, y0 = fy | 0, z0 = fz | 0
  const tx = fx - x0, ty = fy - y0, tz = fz - z0
  const at = (i, j, k) => g[k * n * n + j * n + i]
  const c000 = at(x0, y0, z0), c100 = at(x0 + 1, y0, z0)
  const c010 = at(x0, y0 + 1, z0), c110 = at(x0 + 1, y0 + 1, z0)
  const c001 = at(x0, y0, z0 + 1), c101 = at(x0 + 1, y0, z0 + 1)
  const c011 = at(x0, y0 + 1, z0 + 1), c111 = at(x0 + 1, y0 + 1, z0 + 1)
  const x00 = c000 + (c100 - c000) * tx
  const x10 = c010 + (c110 - c010) * tx
  const x01 = c001 + (c101 - c001) * tx
  const x11 = c011 + (c111 - c011) * tx
  return (x00 + (x10 - x00) * ty) * (1 - tz) + (x01 + (x11 - x01) * ty) * tz
}
function gradG(G, p) {
  const { step } = G
  const e = step * 0.6
  const g = [
    sampleG(G, p[0] + e, p[1], p[2]) - sampleG(G, p[0] - e, p[1], p[2]),
    sampleG(G, p[0], p[1] + e, p[2]) - sampleG(G, p[0], p[1] - e, p[2]),
    sampleG(G, p[0], p[1], p[2] + e) - sampleG(G, p[0], p[1], p[2] - e)
  ]
  return normalize(g)
}

function render(G, opts) {
  const { w: W, h: H, fov = 40, cam, look, recipe = null, markers = [], bg = [11, 31, 22] } = opts
  const out = Buffer.alloc(W * H * 4)
  const { brightFront = false, camScale = 1 } = opts
  const camDir = normalize(sub(look, cam))
  const right = normalize(cross(camDir, [0, 1, 0]))
  const up = cross(right, camDir)
  const focal = (H / 2) / Math.tan((fov * Math.PI) / 360) / camScale
  const key = { dir: normalize([0.55, 0.75, 0.5]), color: [1.0, 0.95, 0.85], power: 1.45 }
  const rim = { dir: normalize([-0.5, 0.35, -0.75]), color: brightFront ? [1.0, 0.75, 0.5] : [0.49, 0.89, 0.72], power: 0.85 }
  const goldL = { dir: normalize([-0.45, -0.35, 0.6]), color: [0.91, 0.79, 0.42], power: 0.7 }
  const frontK = { dir: normalize([-0.45, 0.3, 0.85]), color: [1.0, 0.9, 0.72], power: brightFront ? 1.05 : 0 }
  const hemi = { color: [0.25, 0.35, 0.28], power: 0.45 }

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const nx = (x - W / 2) / focal
      const ny = -(y - H / 2) / focal
      const dir = normalize(add(add(camDir, scale(right, nx)), scale(up, ny)))
      let tHit = Infinity
      let mAlbedo = [0, 0, 0]
      for (const mk of markers) {
        const oc = sub(cam, mk.pos)
        const b = dot(oc, dir)
        const c = dot(oc, oc) - mk.r * mk.r
        const disc = b * b - c
        if (disc > 0) {
          const t = -b - Math.sqrt(disc)
          if (t > 0 && t < tHit) { tHit = t; mAlbedo = mk.color }
        }
      }
      let t = 0
      let hit = null
      for (let i = 0; i < 200; i++) {
        const p = add(cam, scale(dir, t))
        const d = sampleG(G, p[0], p[1], p[2])
        if (d < 0.001) { hit = p; break }
        t += Math.max(d * 0.7, 0.0025)
        if (t > 26) break
      }
      let col
      if (hit) {
        const n = gradG(G, hit)
        let base = [0.5, 0.3, 0.2]
        if (recipe && recipe.color) {
          const uv = boxUV(hit, n)
          const [l, m, c2] = noiseVals(uv)
          base = recipe.color(uv[0], uv[1], l, m, c2)
        }
        const v = scale(sub(cam, hit), -1)
        let c = [0, 0, 0]
        const light = (L, col3, pw) => {
          const nl = Math.max(0, dot(n, L.dir))
          const h = normalize(add(L.dir, v))
          const sp = Math.pow(Math.max(0, dot(n, h)), 42) * 0.35
          return add(scale(col3, nl * pw), scale([1, 1, 1], sp * pw * 0.5))
        }
        c = light(key, key.color, key.power)
        c = add(c, light(rim, rim.color, rim.power))
        c = add(c, light(goldL, goldL.color, goldL.power))
        if (frontK.power > 0) c = add(c, light(frontK, frontK.color, frontK.power))
        c = add(c, scale(hemi.color, hemi.power * (dot(n, [0, 1, 0]) * 0.5 + 0.5)))
        col = [c[0] * base[0], c[1] * base[1], c[2] * base[2]]
        const fr = Math.pow(1 - Math.max(0, dot(n, v)), 3)
        col = add(col, scale([0.85, 0.75, 0.55], fr * 0.35))
        col = col.map((v2) => Math.pow(v2 / (v2 + 1), 0.85) * 255)
      } else {
        col = [bg[0], bg[1], bg[2]]
      }
      if (tHit < t) col = [mAlbedo[0] * 255, mAlbedo[1] * 255, mAlbedo[2] * 255]
      const o = (y * W + x) * 4
      out[o] = col[0]; out[o + 1] = col[1]; out[o + 2] = col[2]; out[o + 3] = 255
    }
  }
  return out
}

function sub(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]] }
function add(a, b) { return [a[0] + b[0], a[1] + b[1], a[2] + b[2]] }
function scale(a, s) { return [a[0] * s, a[1] * s, a[2] * s] }
function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2] }
function cross(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]] }
function normalize(a) { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l] }
function grad(f, p) {
  const e = 0.003
  const g = [f(p[0] + e, p[1], p[2]) - f(p[0] - e, p[1], p[2]), f(p[0], p[1] + e, p[2]) - f(p[0], p[1] - e, p[2]), f(p[0], p[1], p[2] + e) - f(p[0], p[1], p[2] - e)]
  return normalize(g)
}
function boxUV(p, n) {
  const S = 1 / 2.4
  const ax = Math.abs(n[0]), ay = Math.abs(n[1]), az = Math.abs(n[2])
  if (ax >= ay && ax >= az) return [(p[1] * S % 1 + 1) % 1, (p[2] * S % 1 + 1) % 1]
  if (ay >= ax && ay >= az) return [(p[0] * S % 1 + 1) % 1, (p[2] * S % 1 + 1) % 1]
  return [(p[0] * S % 1 + 1) % 1, (p[1] * S % 1 + 1) % 1]
}
/* precomputed noise tile for fast sampling */
const NT = 320
const NTILES = (() => {
  const ln = makeNoise(42, 8), hn = makeNoise(43, 8), cn = makeNoise(44, 8)
  const L = new Float32Array(NT * NT), M = new Float32Array(NT * NT), C = new Float32Array(NT * NT)
  for (let y = 0; y < NT; y++) {
    for (let x = 0; x < NT; x++) {
      const u = x / NT, v = y / NT
      L[y * NT + x] = fbm(ln, u, v, 0.37)
      M[y * NT + x] = fbm(hn, u * 1.9, v * 1.9, 0.71)
      C[y * NT + x] = fbm(cn, u * 4.1, v * 4.1, 0.9)
    }
  }
  return [L, M, C]
})()
function noiseVals([u, v]) {
  const x = (u * NT | 0) % NT, y = (v * NT | 0) % NT
  const i = ((y + NT) % NT) * NT + ((x + NT) % NT)
  return [NTILES[0][i], NTILES[1][i], NTILES[2][i]]
}

const recipeMap = { liver: RECIPES.liver, stomach: RECIPES.stomach, heart: RECIPES.heart, kidneys: RECIPES.kidney, pancreas: RECIPES.pancreas, intestines: RECIPES.intestines, pomegranate: RECIPES.pomegranate }

if (FIELDS[arg]) {
  const field = FIELDS[arg]
  const cam = [0, 0.25, 4.7]
  const cond = Object.values(CONDITIONS).find((c) => c.organ === arg)
  const markers = (cond ? cond.hotspots : []).map((h) => ({ pos: h.pos, r: 0.045, color: [1, 0.78, 0.25] }))
  const G = buildGrid((x, y, z) => field([x, y, z]), 84)
  const t0 = performance.now()
  const buf = render(G, {
    w: SIZE, h: SIZE, cam, look: [0, 0.05, 0],
    recipe: recipeMap[arg], markers,
    brightFront: arg === 'pomegranate',
    camScale: arg === 'pomegranate' ? 1.4 : 1
  })
  writePNG('/tmp/preview-' + arg + '.png', SIZE, SIZE, buf)
  console.log('preview-' + arg + '.png', (performance.now() - t0).toFixed(0) + 'ms')
} else {
  console.log('unknown organ', arg)
}
