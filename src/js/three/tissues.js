import * as THREE from 'three'
import { makeNoise, fbm, mulberry32 } from './sculpt.js'
import { RECIPES } from './tissue-recipes.js'

/* ============================================================
 * tissues.js — seamless procedural PBR textures for the organs.
 * color (sRGB) + bump height + roughness, all tiling perfectly
 * (periodic noise + 3x3-wrapped strokes) for the box-projected
 * UVs from sculpt.js. Generated once per organ and cached.
 * ============================================================ */

const wrap3x3 = (size, painter) => {
  for (let ox = -1; ox <= 1; ox++) {
    for (let oy = -1; oy <= 1; oy++) painter(ox * size, oy * size)
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
  tex.anisotropy = 8
  if (srgb) tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

/* per-pixel render with the three shared noise layers */
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
      const l = fbm(ln, u, v, 0.37)
      const m = fbm(hn, u * 1.9, v * 1.9, 0.71)
      const c2 = fbm(cn, u * 4.1, v * 4.1, 0.9)
      const o = fn(u, v, l, m, c2)
      const p = (y * size + x) * 4
      data[p] = o[0]; data[p + 1] = o[1]; data[p + 2] = o[2]; data[p + 3] = 255
    }
  }
  ctx.putImageData(img, 0, 0)
  return c
}

/* ---------- stroke painters (wrapped, seamless) ---------- */
export function paintVeins(ctx, size, { color = 'rgba(70,20,18,0.5)', count = 7, seed = 3, width = 2.2, len = 0.26 } = {}) {
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
    branch(nx, ny, a + (rand() - 0.5) * 0.8, l * 0.72, w * 0.6, depth - 1)
    branch(nx, ny, a - (rand() - 0.5) * 0.8, l * 0.66, w * 0.6, depth - 1)
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

export function paintRidges(ctx, size, { color = 'rgba(255,255,255,0.14)', color2 = 'rgba(60,20,16,0.16)', spacing = 30, waviness = 8, seed = 5 } = {}) {
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

/* ---------- per-organ detail strokes applied to map + roughness ---------- */
const STROKES = {
  liver: (mc, rc, size) => {
    paintVeins(mc, size, { color: 'rgba(48,10,8,0.55)', count: 9, seed: 11, width: 3, len: 0.22 })
    paintVeins(mc, size, { color: 'rgba(66,14,10,0.4)', count: 6, seed: 37, width: 1.8, len: 0.16 })
    paintVeins(mc, size, { color: 'rgba(255,170,140,0.12)', count: 5, seed: 63, width: 1.3, len: 0.14 })
    paintVeins(rc, size, { color: 'rgba(255,255,255,0.8)', count: 9, seed: 11, width: 3, len: 0.22 })
  },
  heart: (mc, rc, size) => {
    paintVeins(mc, size, { color: 'rgba(120,84,40,0.5)', count: 8, seed: 52, width: 2.4, len: 0.22 })
    paintVeins(mc, size, { color: 'rgba(40,6,8,0.4)', count: 7, seed: 53, width: 1.6, len: 0.18 })
    paintVeins(rc, size, { color: 'rgba(255,255,255,0.7)', count: 8, seed: 52, width: 2.2, len: 0.22 })
  },
  kidney: (mc, rc, size) => {
    paintVeins(mc, size, { color: 'rgba(46,16,12,0.35)', count: 6, seed: 7, width: 2, len: 0.16 })
    paintVeins(rc, size, { color: 'rgba(255,255,255,0.5)', count: 6, seed: 7, width: 1.8, len: 0.16 })
  },
  stomach: (mc, rc, size) => {
    paintRidges(mc, size, { color: 'rgba(255,235,220,0.12)', color2: 'rgba(70,26,20,0.1)', spacing: 36, waviness: 9, seed: 5 })
    paintRidges(rc, size, { color: 'rgba(255,255,255,0.28)', color2: 'rgba(0,0,0,0.14)', spacing: 34, waviness: 9, seed: 5 })
  },
  intestines: (mc, rc, size) => {
    paintRidges(mc, size, { color: 'rgba(255,240,225,0.24)', color2: 'rgba(105,60,45,0.18)', spacing: 26, waviness: 6, seed: 9 })
    paintRidges(rc, size, { color: 'rgba(255,255,255,0.5)', color2: 'rgba(0,0,0,0.22)', spacing: 26, waviness: 6, seed: 9 })
  }
}

/* ---------- full organ PBR texture set (cached) ---------- */
const _texCache = new Map()
export function organTextures(key, { size = 1024, bumpSize = 512 } = {}) {
  if (_texCache.has(key)) return _texCache.get(key)
  const r = RECIPES[key] || RECIPES[key.replace(/s$/, '')]
  const seed = 100 + (key.length * 37) % 900

  const mapCanvas = noiseCanvas(size, seed, (u, v, l, m, c2) => {
    const col = r.color(u, v, l, m, c2)
    return [col[0] * 255, col[1] * 255, col[2] * 255]
  })
  const bumpCanvas = noiseCanvas(bumpSize, seed + 7, (u, v, l, m, c2) => {
    const h = r.bump(u, v, l, m, c2)
    return [h * 255, h * 255, h * 255]
  })
  const roughCanvas = noiseCanvas(bumpSize, seed + 13, (u, v, l, m, c2) => {
    const h = r.roughness ? r.roughness(u, v, l, m, c2) : 0.5
    return [h * 255, h * 255, h * 255]
  })

  const mctx = mapCanvas.getContext('2d')
  const rctx = roughCanvas.getContext('2d')
  STROKES[key]?.(mctx, rctx, size)

  const map = makeTile(size, (ctx) => ctx.drawImage(mapCanvas, 0, 0), { srgb: true })
  const bump = makeTile(bumpSize, (ctx) => ctx.drawImage(bumpCanvas, 0, 0), { srgb: false })
  const roughness = makeTile(bumpSize, (ctx) => ctx.drawImage(roughCanvas, 0, 0), { srgb: false })
  const set = { map, bump, roughness }
  _texCache.set(key, set)
  return set
}

/* keep the old per-organ names for any existing callers */
export const liverTextures = (s = 512) => organTextures('liver', { size: s })
export const stomachTextures = (s = 512) => organTextures('stomach', { size: s })
export const kidneyTextures = (s = 512) => organTextures('kidneys', { size: s })
export const heartTextures = (s = 512) => organTextures('heart', { size: s })
export const pancreasTextures = (s = 512) => organTextures('pancreas', { size: s })
export const intestineTextures = (s = 512) => organTextures('intestines', { size: s })

export function pomegranateTextures(size = 512) {
  const key = 'pomegranate'
  if (_texCache.has(key)) return _texCache.get(key)
  const r = RECIPES.pomegranate
  const mapCanvas = noiseCanvas(size, 91, (u, v, l, m, c2) => {
    const col = r.color(u, v, l, m, c2)
    return [col[0] * 255, col[1] * 255, col[2] * 255]
  })
  const bumpCanvas = noiseCanvas(size, 92, (u, v, l, m, c2) => {
    const h = r.bump(u, v, l, m, c2)
    return [h * 255, h * 255, h * 255]
  })
  const ctx = mapCanvas.getContext('2d')
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
  const set = {
    map: makeTile(size, (c) => c.drawImage(mapCanvas, 0, 0), { srgb: true }),
    bump: makeTile(size, (c) => c.drawImage(bumpCanvas, 0, 0), { srgb: false })
  }
  _texCache.set(key, set)
  return set
}

/* ---------- organic-flesh material factory ---------- */
export function organMaterial({
  map, bump, roughnessMap = null, bumpScale = 0.5,
  roughness = 0.32, clearcoat = 0.55, clearcoatRoughness = 0.28,
  sheen = 0.65, sheenColor = '#ffffff', envMapIntensity = 1.05,
  color = '#ffffff', transmission = 0, thickness = 1.5,
  attenuationColor = '#6e1210', attenuationDistance = 1.1,
  ior = 1.36, specularIntensity = 1.0
} = {}) {
  const mat = new THREE.MeshPhysicalMaterial({
    color,
    map,
    roughness,
    metalness: 0,
    clearcoat,
    clearcoatRoughness,
    sheen,
    sheenColor: new THREE.Color(sheenColor),
    envMapIntensity,
    transmission,
    thickness,
    attenuationColor: new THREE.Color(attenuationColor),
    attenuationDistance,
    ior,
    specularIntensity
  })
  if (bump) {
    mat.bumpMap = bump
    mat.bumpScale = bumpScale
  }
  if (roughnessMap) {
    mat.roughnessMap = roughnessMap
    mat.roughness = 1.0 // multiplied by map
  }
  return mat
}
