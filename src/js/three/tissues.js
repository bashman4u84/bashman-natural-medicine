import * as THREE from 'three'
import { makeNoise, fbm, mulberry32 } from './sculpt.js'

/* ============================================================
 * tissues.js — seamless procedural PBR textures for the organs.
 * Every texture tiles perfectly (periodic noise + 3x3 wrapped
 * strokes), so the box-projected UVs from sculpt.js produce no
 * visible seams. One canvas texture per organ: color (sRGB) and
 * bump height (linear).
 * ============================================================ */

const wrap3x3 = (size, painter) => {
  for (let ox = -1; ox <= 1; ox++) {
    for (let oy = -1; oy <= 1; oy++) {
      painter(ox * size, oy * size)
    }
  }
}

export function makeTile(size, painter, { srgb = true, repeat = [1, 1] } = {}) {
  const c = document.createElement('canvas')
  c.width = c.height = size
  const ctx = c.getContext('2d')
  painter(ctx, size)
  const tex = new THREE.CanvasTexture(c)
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.repeat.set(repeat[0], repeat[1])
  tex.anisotropy = 4
  if (srgb) tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

/* per-pixel noise blend: fn(x, y) -> [r,g,b]  (x,y in 0..1) */
function noiseCanvas(size, seed, fn) {
  const c = document.createElement('canvas')
  c.width = c.height = size
  const ctx = c.getContext('2d')
  const img = ctx.createImageData(size, size)
  const data = img.data
  const ln = makeNoise(seed, 8)
  const hn = makeNoise(seed + 7919, 8)
  const cn = makeNoise(seed + 104729, 8)
  for (let y = 0; y < size; y++) {
    const v = y / size
    for (let x = 0; x < size; x++) {
      const u = x / size
      const l = fbm(ln, u, v, 0.37)          // large mottling
      const m = fbm(hn, u * 1.9, v * 1.9, 0.71) // medium grain
      const c2 = fbm(cn, u * 4.1, v * 4.1, 0.9) // fine speckle
      const o = fn(u, v, l, m, c2, x, y)
      const p = (y * size + x) * 4
      data[p] = o[0]; data[p + 1] = o[1]; data[p + 2] = o[2]; data[p + 3] = 255
    }
  }
  ctx.putImageData(img, 0, 0)
  return c
}

/* lerp helper for rgb tuples */
function mix(a, b, t) {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]
}

/* ---------- generic anatomical painter: mottled flesh ---------- */
function fleshMap(size, { base, dark, light, grain = 0.25, speckle = 0.12, seed = 7 }) {
  return noiseCanvas(size, seed, (u, v, l, m, c2) => {
    let col = mix(base, dark, Math.max(0, l) * grain + Math.max(0, m) * 0.3)
    col = mix(col, light, Math.max(0, -l) * grain + Math.max(0, -m) * 0.18)
    const sp = Math.max(0, c2 - 0.35) * speckle * 3
    col = mix(col, light, Math.min(1, sp))
    return [col[0] * 255, col[1] * 255, col[2] * 255]
  })
}

/* paint organic branching vessels — drawn 3x3-wrapped so tiles seam-free */
function paintVeins(ctx, size, { color = 'rgba(70,20,18,0.5)', count = 7, seed = 3, width = 2.2, len = 0.26 } = {}) {
  const rand = mulberry32(seed)
  ctx.strokeStyle = color
  ctx.lineCap = 'round'
  const branch = (x, y, a, l, w, depth) => {
    if (depth <= 0 || l < 7) return
    const nx = x + Math.cos(a) * l
    const ny = y + Math.sin(a) * l
    ctx.lineWidth = w
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineTo(nx, ny)
    ctx.stroke()
    branch(nx, ny, a + (rand() - 0.5) * 0.8, l * 0.72, w * 0.62, depth - 1)
    branch(nx, ny, a - (rand() - 0.5) * 0.8, l * 0.66, w * 0.62, depth - 1)
  }
  wrap3x3(size, (ox, oy) => {
    ctx.save()
    ctx.translate(ox, oy)
    for (let i = 0; i < count; i++) {
      branch(rand() * size, rand() * size, rand() * Math.PI * 2, size * len, width, 4)
    }
    ctx.restore()
  })
}

function paintRidges(ctx, size, { color = 'rgba(255,255,255,0.14)', color2 = 'rgba(60,20,16,0.16)', spacing = 30, waviness = 8, seed = 5 }) {
  const rand = mulberry32(seed)
  const offs = rand() * spacing
  wrap3x3(size, (ox, oy) => {
    ctx.save()
    ctx.translate(ox, oy)
    for (let y = -spacing; y < size + spacing; y += spacing) {
      ctx.strokeStyle = color
      ctx.lineWidth = 5
      ctx.beginPath()
      for (let x = -4; x <= size + 4; x += 8) {
        const yy = y + offs + Math.sin((x / size) * Math.PI * 2 + y * 0.05) * waviness
        x === -4 ? ctx.moveTo(x, yy) : ctx.lineTo(x, yy)
      }
      ctx.stroke()
      ctx.strokeStyle = color2
      ctx.lineWidth = 2
      ctx.beginPath()
      for (let x = -4; x <= size + 4; x += 8) {
        const yy = y + offs + spacing * 0.5 + Math.sin((x / size) * Math.PI * 2 + y * 0.05 + 1.2) * waviness
        x === -4 ? ctx.moveTo(x, yy) : ctx.lineTo(x, yy)
      }
      ctx.stroke()
    }
    ctx.restore()
  })
}

const T = (v) => [v * 255, v * 255, v * 255]

/* Per-organ texture recipes below. */
export function liverTextures(size = 512) {
  const map = fleshMap(size, {
    base: [0.46, 0.17, 0.12], dark: [0.3, 0.09, 0.07], light: [0.56, 0.27, 0.19],
    grain: 0.34, speckle: 0.1, seed: 21
  })
  const ctx = map.getContext('2d')
  paintVeins(ctx, size, { color: 'rgba(52,12,10,0.5)', count: 7, seed: 11, width: 2.6, len: 0.2 })
  paintVeins(ctx, size, { color: 'rgba(255,175,150,0.12)', count: 4, seed: 37, width: 1.4, len: 0.15 })

  const bump = noiseCanvas(size, 22, (u, v, l, m, c2) => {
    const h = 0.55 + m * 0.16 + c2 * 0.14 + Math.max(0, l) * 0.1
    return T(Math.min(1, Math.max(0.15, h)))
  })
  const bctx = bump.getContext('2d')
  paintVeins(bctx, size, { color: 'rgba(255,255,255,0.20)', count: 7, seed: 11, width: 2.2, len: 0.2 })
  paintRidges(bctx, size, { color: 'rgba(255,255,255,0.05)', color2: 'rgba(0,0,0,0.06)', spacing: 46, seed: 12 })

  return { map: makeTile(size, (ctx) => ctx.drawImage(map, 0, 0)), bump: makeTile(size, (ctx) => ctx.drawImage(bump, 0, 0), { srgb: false }) }
}

export function stomachTextures(size = 512) {
  const map = fleshMap(size, {
    base: [0.66, 0.3, 0.23], dark: [0.5, 0.2, 0.16], light: [0.78, 0.42, 0.3],
    grain: 0.3, speckle: 0.08, seed: 31
  })
  const ctx = map.getContext('2d')
  paintRidges(ctx, size, { color: 'rgba(255,235,220,0.16)', color2: 'rgba(70,26,20,0.14)', spacing: 34, waviness: 10, seed: 5 })

  const bump = noiseCanvas(size, 32, (u, v, l, m, c2) => {
    let h = 0.6 + m * 0.12 + c2 * 0.1
    const fold = Math.sin(u * Math.PI * 2 * 7 + Math.sin(v * Math.PI * 2) * 1.6 + l * 1.5) * 0.5 + 0.5
    h += fold * 0.28
    return T(Math.min(1, Math.max(0.1, h)))
  })
  const bctx = bump.getContext('2d')
  paintRidges(bctx, size, { color: 'rgba(255,255,255,0.16)', color2: 'rgba(0,0,0,0.12)', spacing: 32, waviness: 10, seed: 5 })

  return { map: makeTile(size, (ctx) => ctx.drawImage(map, 0, 0)), bump: makeTile(size, (ctx) => ctx.drawImage(bump, 0, 0), { srgb: false }) }
}

export function kidneyTextures(size = 512) {
  const map = fleshMap(size, {
    base: [0.55, 0.24, 0.19], dark: [0.4, 0.14, 0.12], light: [0.64, 0.34, 0.26],
    grain: 0.28, speckle: 0.1, seed: 41
  })
  const ctx = map.getContext('2d')
  // capsule striations
  const rand = mulberry32(7)
  wrap3x3(size, (ox, oy) => {
    ctx.save()
    ctx.translate(ox, oy)
    ctx.strokeStyle = 'rgba(40,12,10,0.12)'
    ctx.lineWidth = 1.6
    for (let i = 0; i < 190; i++) {
      const x = rand() * size
      const y = rand() * size
      const l = 6 + rand() * 16
      ctx.beginPath()
      ctx.moveTo(x, y)
      ctx.lineTo(x + l * 0.2, y + l)
      ctx.stroke()
    }
    ctx.restore()
  })

  const bump = noiseCanvas(size, 42, (u, v, l, m, c2) => {
    const stripe = Math.sin(u * Math.PI * 2 * 5 + l * 2) * 0.5 + 0.5
    const h = 0.55 + m * 0.12 + c2 * 0.1 + stripe * 0.12
    return T(Math.min(1, Math.max(0.12, h)))
  })
  const bctx = bump.getContext('2d')
  const r2 = mulberry32(17)
  wrap3x3(size, (ox, oy) => {
    bctx.save()
    bctx.translate(ox, oy)
    bctx.strokeStyle = 'rgba(255,255,255,0.10)'
    bctx.lineWidth = 1.4
    for (let i = 0; i < 190; i++) {
      const x = r2() * size
      const y = r2() * size
      bctx.beginPath()
      bctx.moveTo(x, y)
      bctx.lineTo(x + 2, y + 8 + r2() * 10)
      bctx.stroke()
    }
    bctx.restore()
  })

  return { map: makeTile(size, (ctx) => ctx.drawImage(map, 0, 0)), bump: makeTile(size, (ctx) => ctx.drawImage(bump, 0, 0), { srgb: false }) }
}

export function heartTextures(size = 512) {
  const map = fleshMap(size, {
    base: [0.52, 0.13, 0.15], dark: [0.34, 0.07, 0.09], light: [0.66, 0.22, 0.2],
    grain: 0.3, speckle: 0.12, seed: 51
  })
  const ctx = map.getContext('2d')
  // fat streak near the top (epicardial fat)
  const grad = ctx.createLinearGradient(0, 0, 0, size * 0.45)
  grad.addColorStop(0, 'rgba(233,200,148,0.55)')
  grad.addColorStop(1, 'rgba(233,200,148,0)')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, size, size * 0.45)
  paintVeins(ctx, size, { color: 'rgba(255,120,100,0.14)', count: 6, seed: 52, width: 2, len: 0.18 })

  const bump = noiseCanvas(size, 62, (u, v, l, m, c2) => {
    // running muscle striations
    const s1 = Math.sin((u * 1.5 + v * 0.21) * Math.PI * 2 * 9 + l * 2)
    const s2 = Math.sin((u * 1.5 - v * 0.21 + 0.5) * Math.PI * 2 * 9) 
    const h = 0.55 + m * 0.1 + c2 * 0.08 + (s1 + s2) * 0.1
    return T(Math.min(1, Math.max(0.12, h)))
  })

  return { map: makeTile(size, (ctx) => ctx.drawImage(map, 0, 0)), bump: makeTile(size, (ctx) => ctx.drawImage(bump, 0, 0), { srgb: false }) }
}

export function pancreasTextures(size = 512) {
  const map = noiseCanvas(size, 71, (u, v, l, m, c2) => {
    // lobulated: thresholded large blobs
    const lob = fbm(makeNoise(72, 6), u * 2.2, v * 2.2, 0.5)
    let col = mix([0.82, 0.62, 0.38], [0.72, 0.5, 0.3], Math.max(0, lob) * 0.8 + Math.max(0, m) * 0.2)
    col = mix(col, [0.9, 0.72, 0.48], Math.max(0, -lob) * 0.55)
    return [col[0] * 255, col[1] * 255, col[2] * 255]
  })
  const bump = noiseCanvas(size, 73, (u, v, l, m, c2) => {
    const lob = fbm(makeNoise(74, 6), u * 2.4, v * 2.4, 0.55)
    const h = 0.55 + lob * 0.2 + c2 * 0.08
    return T(Math.min(1, Math.max(0.1, h)))
  })
  return { map: makeTile(size, (ctx) => ctx.drawImage(map, 0, 0)), bump: makeTile(size, (ctx) => ctx.drawImage(bump, 0, 0), { srgb: false }) }
}

export function intestineTextures(size = 512) {
  const map = fleshMap(size, {
    base: [0.78, 0.53, 0.42], dark: [0.62, 0.38, 0.3], light: [0.87, 0.65, 0.52],
    grain: 0.26, speckle: 0.09, seed: 81
  })
  const ctx = map.getContext('2d')
  paintRidges(ctx, size, { color: 'rgba(255,240,225,0.2)', color2: 'rgba(105,60,45,0.14)', spacing: 26, waviness: 6, seed: 9 })
  const bump = noiseCanvas(size, 82, (u, v, l, m, c2) => {
    const fold = Math.sin(u * Math.PI * 2 * 11 + l * 1.2) * 0.5 + 0.5
    const h = 0.55 + m * 0.1 + c2 * 0.09 + fold * 0.22
    return T(Math.min(1, Math.max(0.1, h)))
  })
  return { map: makeTile(size, (ctx) => ctx.drawImage(map, 0, 0)), bump: makeTile(size, (ctx) => ctx.drawImage(bump, 0, 0), { srgb: false }) }
}

export function pomegranateTextures(size = 512) {
  const map = noiseCanvas(size, 91, (u, v, l, m, c2) => {
    let col = mix([0.55, 0.06, 0.12], [0.4, 0.03, 0.08], Math.max(0, l) * 0.6 + Math.max(0, m) * 0.25)
    col = mix(col, [0.72, 0.16, 0.22], Math.max(0, -l) * 0.5)
    // blush toward the top (u = v small?) keep isotropic: add rosy patches
    col = mix(col, [0.78, 0.32, 0.3], Math.max(0, -m - c2 * 0.5) * 0.4)
    const sp = Math.max(0, c2 - 0.4) * 0.8
    col = mix(col, [0.82, 0.5, 0.4], Math.min(0.35, sp))
    return [col[0] * 255, col[1] * 255, col[2] * 255]
  })
  const ctx = map.getContext('2d')
  const rand = mulberry32(93)
  wrap3x3(size, (ox, oy) => {
    ctx.save()
    ctx.translate(ox, oy)
    ctx.strokeStyle = 'rgba(30,2,6,0.28)'
    ctx.lineWidth = 1.3
    for (let i = 0; i < 130; i++) {
      const x = rand() * size
      const y = rand() * size
      const a = rand() * Math.PI
      ctx.beginPath()
      ctx.moveTo(x, y)
      ctx.lineTo(x + Math.cos(a) * 5, y + Math.sin(a) * 5)
      ctx.stroke()
    }
    ctx.restore()
  })
  const bump = noiseCanvas(size, 92, (u, v, l, m, c2) => {
    // leathery pebbled rind
    const cell = fbm(makeNoise(95, 10), u * 3.1, v * 3.1, 0.4)
    const h = 0.55 + m * 0.1 + cell * 0.16 + Math.max(0, -c2) * 0.06
    return T(Math.min(1, Math.max(0.1, h)))
  })
  return { map: makeTile(size, (ctx) => ctx.drawImage(map, 0, 0)), bump: makeTile(size, (ctx) => ctx.drawImage(bump, 0, 0), { srgb: false }) }
}

/* ---------- material factory ---------- */
export function organMaterial({ map, bump, bumpScale = 0.55, roughness = 0.42, clearcoat = 0.35, clearcoatRoughness = 0.45, sheen = 0.55, sheenColor = '#ffffff', envMapIntensity = 0.95, color = '#ffffff' } = {}) {
  const mat = new THREE.MeshPhysicalMaterial({
    color,
    map,
    roughness,
    metalness: 0,
    clearcoat,
    clearcoatRoughness,
    sheen,
    sheenColor: new THREE.Color(sheenColor),
    envMapIntensity
  })
  if (bump) {
    mat.bumpMap = bump
    mat.bumpScale = bumpScale
  }
  return mat
}
