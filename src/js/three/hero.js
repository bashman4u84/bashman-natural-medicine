import * as THREE from 'three'
import { initStage, studioLights, driftPoints, glowTexture, IS_TOUCH, REDUCED } from './core.js'
import { loadGeometry } from './models.js'
import { makeTile } from './tissues.js'
import { pomegranateTextures } from './tissues.js'

/* ============================================================
 * hero.js — "The Garden of the Sunnah"
 *
 * A slow procession of sculpted remedies drifts across the
 * hero: the pomegranate (the fruit the tradition calls the
 * remedy of the heart), olive-green leaves, dates and their
 * seeds, two bees, a honeycomb, ginger, garlic and turmeric —
 * each loading from its tiny baked chunk, on its own lane,
 * depth and drift. Gold motes and a soft ember keep the
 * forest-green stage warm: the garden flows, the copy breathes.
 * ============================================================ */

const TAU = Math.PI * 2

/* tiny deterministic PRNG for stable layouts */
function rng(seed) {
  let s = seed
  return () => {
    s = (s * 16807) % 2147483647
    return s / 2147483647
  }
}

/* ---------- small procedural maps (fast canvas tiles) ---------- */
function speckleMap({ base, seed = 5, streak = null, darkDots = 90 }) {
  const rand = rng(seed)
  return makeTile(128, (ctx, size) => {
    ctx.fillStyle = base
    ctx.fillRect(0, 0, size, size)
    ctx.fillStyle = 'rgba(0,0,0,0.16)'
    for (let i = 0; i < darkDots; i++) {
      ctx.fillRect(rand() * size, rand() * size, 1 + rand() * 2.6, 1 + rand() * 2.6)
    }
    ctx.fillStyle = 'rgba(255,255,255,0.10)'
    for (let i = 0; i < 55; i++) {
      ctx.fillRect(rand() * size, rand() * size, 1 + rand() * 2, 1 + rand() * 2)
    }
    if (streak) {
      ctx.strokeStyle = streak
      ctx.lineWidth = 1.6
      for (let i = 0; i < 12; i++) {
        const x = rand() * size
        const y = rand() * size
        const l = 8 + rand() * 18
        ctx.beginPath()
        ctx.moveTo(x, y)
        ctx.lineTo(x + l * 0.3, y + l)
        ctx.stroke()
      }
    }
  })
}

function hexMap() {
  return makeTile(128, (ctx, size) => {
    ctx.fillStyle = '#b57617'
    ctx.fillRect(0, 0, size, size)
    const R = 15
    for (let qy = -1; qy <= 3; qy++) {
      for (let qx = -1; qx <= 3; qx++) {
        const x = qx * R * 1.73 + (qy % 2 ? R * 0.86 : 0)
        const y = qy * R * 1.5
        ctx.strokeStyle = 'rgba(80,40,6,0.85)'
        ctx.lineWidth = 3
        ctx.beginPath()
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * TAU + Math.PI / 6
          const px = x + Math.cos(a) * (R - 2.2)
          const py = y + Math.sin(a) * (R - 2.2)
          i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py)
        }
        ctx.closePath()
        ctx.stroke()
        ctx.fillStyle = 'rgba(224,158,44,0.85)'
        ctx.fill()
      }
    }
  })
}

function leafMap(tone = '#4d8a5c') {
  return makeTile(160, (ctx, size) => {
    const g = ctx.createLinearGradient(0, 0, size, size)
    g.addColorStop(0, tone)
    g.addColorStop(1, '#2e5f3b')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, size, size)
    ctx.strokeStyle = 'rgba(235,245,225,0.45)'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(0, size / 2)
    ctx.lineTo(size, size / 2)
    ctx.stroke()
    ctx.lineWidth = 1
    ctx.strokeStyle = 'rgba(235,245,225,0.2)'
    for (let i = 1; i < 7; i++) {
      const x = (i / 7) * size
      ctx.beginPath()
      ctx.moveTo(x, size / 2)
      ctx.lineTo(x + 14, size / 2 - 26 - (i % 2) * 12)
      ctx.moveTo(x, size / 2)
      ctx.lineTo(x + 14, size / 2 + 26 + (i % 2) * 12)
      ctx.stroke()
    }
  })
}

function phys(opts) {
  return new THREE.MeshPhysicalMaterial({
    roughness: 0.4, clearcoat: 0.4, clearcoatRoughness: 0.55,
    sheen: 0.4, envMapIntensity: 0.85, ...opts
  })
}

let _pomTex = null
function pomegranateTex() {
  if (!_pomTex) _pomTex = pomegranateTextures()
  return _pomTex
}

/* ---------- part builders: each returns a THREE.Group ---------- */
const BUILDERS = {
  pomegranate: async () => {
    const g = new THREE.Group()
    const t = pomegranateTex()
    const rind = new THREE.Mesh(await loadGeometry('pomegranate', 'rind'), phys({
      map: t.map, bumpMap: t.bump, bumpScale: 0.3, color: '#ffffff',
      roughness: 0.42, clearcoat: 0.3, sheen: 0.15, sheenColor: new THREE.Color('#ff8a7a')
    }))
    const flesh = new THREE.Mesh(await loadGeometry('pomegranate', 'flesh'), phys({
      color: '#e9d3a4', roughness: 0.62, clearcoat: 0.15,
      sheen: 0.4, sheenColor: new THREE.Color('#fff3d0'), envMapIntensity: 0.5
    }))
    const arils = new THREE.Mesh(await loadGeometry('pomegranate', 'arils'), phys({
      color: '#c2154c', roughness: 0.16, clearcoat: 1, clearcoatRoughness: 0.12,
      sheen: 0.7, sheenColor: new THREE.Color('#ff8ab0'),
      emissive: new THREE.Color('#7a0d2c'), emissiveIntensity: 0.45, envMapIntensity: 1.2
    }))
    g.add(rind, flesh, arils)
    return g
  },

  leaf: async () => {
    const g = new THREE.Group()
    const map = leafMap()
    const mesh = new THREE.Mesh(await loadGeometry('leaf'), phys({
      map, bumpMap: map, bumpScale: 0.12, roughness: 0.55, clearcoat: 0.2,
      sheen: 0.5, sheenColor: new THREE.Color('#e2eccb')
    }))
    g.add(mesh)
    return g
  },

  date: async () => {
    const g = new THREE.Group()
    const map = speckleMap({ base: '#5f3117', seed: 7, streak: 'rgba(38,18,7,0.5)' })
    const mesh = new THREE.Mesh(await loadGeometry('date'), phys({
      map, bumpMap: map, bumpScale: 0.16, roughness: 0.36, clearcoat: 0.55,
      sheen: 0.3, sheenColor: new THREE.Color('#d8a060')
    }))
    g.add(mesh)
    return g
  },

  'date-seed': async () => {
    const g = new THREE.Group()
    const mesh = new THREE.Mesh(await loadGeometry('date-seed'), phys({
      color: '#6a4326', roughness: 0.3, clearcoat: 0.65,
      sheen: 0.2, sheenColor: new THREE.Color('#ffdfae')
    }))
    g.add(mesh)
    return g
  },

  bee: async () => {
    const g = new THREE.Group()
    const body = new THREE.Mesh(await loadGeometry('bee', 'body'), phys({
      color: '#d9930f', roughness: 0.34, clearcoat: 0.5,
      sheen: 0.4, sheenColor: new THREE.Color('#ffc966')
    }))
    const wings = new THREE.Mesh(
      await loadGeometry('bee', 'wings'),
      new THREE.MeshPhysicalMaterial({
        color: '#eef4ff', roughness: 0.15, transparent: true, opacity: 0.3,
        side: THREE.DoubleSide, depthWrite: false, envMapIntensity: 1.0
      })
    )
    wings.rotation.x = 0.25
    g.add(body, wings)
    g.userData.wings = wings
    return g
  },

  honey: async () => {
    const g = new THREE.Group()
    const mesh = new THREE.Mesh(await loadGeometry('honey'), phys({
      map: hexMap(), bumpMap: hexMap(), bumpScale: 0.05,
      color: '#ffc95e', roughness: 0.3, clearcoat: 0.6,
      sheen: 0.2, sheenColor: new THREE.Color('#ffefb0'),
      emissive: new THREE.Color('#7a4d0a'), emissiveIntensity: 0.22
    }))
    g.add(mesh)
    return g
  },

  ginger: async () => {
    const g = new THREE.Group()
    const map = speckleMap({ base: '#c8a06a', seed: 11, darkDots: 140 })
    const mesh = new THREE.Mesh(await loadGeometry('ginger'), phys({
      map, bumpMap: map, bumpScale: 0.14, roughness: 0.6, clearcoat: 0.15,
      sheen: 0.2, sheenColor: new THREE.Color('#ffe9c9')
    }))
    g.add(mesh)
    return g
  },

  garlic: async () => {
    const g = new THREE.Group()
    const map = speckleMap({ base: '#e8dcc8', seed: 13, darkDots: 40, streak: 'rgba(160,140,110,0.35)' })
    const bulb = new THREE.Mesh(await loadGeometry('garlic', 'bulb'), phys({
      map, bumpMap: map, bumpScale: 0.1, roughness: 0.55, clearcoat: 0.25,
      sheen: 0.3, sheenColor: new THREE.Color('#fff6e5')
    }))
    const sprout = new THREE.Mesh(await loadGeometry('garlic', 'sprout'), phys({
      color: '#4f7a3d', roughness: 0.6, clearcoat: 0.1,
      sheen: 0.3, sheenColor: new THREE.Color('#c9e2b7')
    }))
    g.add(bulb, sprout)
    return g
  },

  turmeric: async () => {
    const g = new THREE.Group()
    const map = speckleMap({ base: '#c97b28', seed: 17, streak: 'rgba(120,60,12,0.5)' })
    const mesh = new THREE.Mesh(await loadGeometry('turmeric'), phys({
      map, bumpMap: map, bumpScale: 0.12, roughness: 0.5, clearcoat: 0.3,
      sheen: 0.25, sheenColor: new THREE.Color('#ffd9a8'),
      emissive: new THREE.Color('#4a2506'), emissiveIntensity: 0.18
    }))
    g.add(mesh)
    return g
  }
}

/* ---------- the drift parade ---------- */
const PARADE = [
  { key: 'pomegranate', n: 1, scale: 0.46 },
  { key: 'leaf', n: 4, scale: 0.3 },
  { key: 'date', n: 2, scale: 0.2 },
  { key: 'date-seed', n: 2, scale: 0.15 },
  { key: 'bee', n: 2, scale: 0.2 },
  { key: 'honey', n: 1, scale: 0.3 },
  { key: 'ginger', n: 1, scale: 0.26 },
  { key: 'garlic', n: 1, scale: 0.22 },
  { key: 'turmeric', n: 1, scale: 0.26 }
]

export function initHero(canvas) {
  const stage = initStage(canvas, { fov: 42, camPos: [0, 0.1, 5.4], shadows: false, exposure: 0.98 })
  const { scene, camera } = stage
  studioLights(scene)
  const frontKey = new THREE.DirectionalLight('#ffdcae', 1.1)
  frontKey.position.set(-1.6, 1.4, 3.4)
  scene.add(frontKey)

  /* soft ember far behind the garden */
  const halo = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: glowTexture('rgba(232,201,106,0.55)'),
      transparent: true, opacity: 0.13, depthWrite: false, blending: THREE.AdditiveBlending
    })
  )
  halo.scale.setScalar(5.4)
  halo.position.set(0, 0, -2.6)
  scene.add(halo)

  const dust = driftPoints({ count: IS_TOUCH ? 36 : 70, colors: ['#e8c96a', '#f4dc9a', '#ffd97a'], size: 0.045, rMin: 1.6, rMax: 3.4 })
  scene.add(dust)

  /* the flow */
  const flow = new THREE.Group()
  scene.add(flow)
  const drifters = []

  const rand = rng(4242)
  let slot = 0
  const lanes = {
    top: { y: 1.05, z: -0.4, s: 1.0, o: 0.85 },
    band: { y: 0.0, z: -1.5, s: 0.72, o: 0.5 },
    bottom: { y: -1.05, z: -0.2, s: 1.05, o: 0.9 },
    front: { y: -0.7, z: 0.9, s: 1.35, o: 1.0 }
  }

  for (const def of PARADE) {
    for (let i = 0; i < def.n; i++) {
      const laneName = ['bottom', 'top', 'band', 'front', 'bottom', 'top'][slot % 6]
      slot++
      const lane = lanes[laneName]
      drifters.push({
        key: def.key,
        builder: BUILDERS[def.key],
        scale: def.scale * lane.s * (0.85 + rand() * 0.3),
        lane,
        x: -3.6 + rand() * 7.2,
        speed: 0.028 + rand() * 0.05,
        bobA: 0.1 + rand() * 0.16,
        bobF: 0.14 + rand() * 0.2,
        phase: rand() * TAU,
        rotX: (rand() - 0.5) * 0.8,
        rotY: rand() * TAU,
        rotS: 0.05 + rand() * 0.12,
        spin: (rand() - 0.5) * 0.06
      })
    }
  }

  /* load part chunks one by one; each joins the flow as it arrives */
  if (!REDUCED) {
    for (const d of drifters) {
      d.builder()
        .then((obj) => {
          const wrap = new THREE.Group()
          obj.scale.setScalar(d.scale)
          wrap.add(obj)
          wrap.position.set(d.x, d.lane.y, d.lane.z)
          flow.add(wrap)
          d.wrap = wrap
          d.obj = obj
          if (!window.__hero3dAt) window.__hero3dAt = performance.now()
        })
        .catch((e) => console.error('[hero:ingredient ' + d.key + ']', e))
    }
  }

  let scrollP = 0
  let mx = 0, my = 0, tmx = 0, tmy = 0
  if (!REDUCED && matchMedia('(pointer: fine)').matches) {
    window.addEventListener('pointermove', (e) => {
      tmx = (e.clientX / window.innerWidth - 0.5) * 2
      tmy = (e.clientY / window.innerHeight - 0.5) * 2
    })
  }

  stage.setRender((dt, t) => {
    mx += (tmx - mx) * 0.045
    my += (tmy - my) * 0.045

    flow.position.x = mx * 0.3
    flow.position.y = -my * 0.18 - scrollP * 0.9
    flow.rotation.z = mx * 0.012

    for (const d of drifters) {
      if (!d.wrap) continue
      const x = ((d.x + t * d.speed + 3.8) % 7.6) - 3.8
      d.wrap.position.x = x
      d.wrap.position.y = d.lane.y + Math.sin(t * d.bobF * TAU + d.phase) * d.bobA
      d.wrap.rotation.x = d.rotX + Math.sin(t * d.spin * TAU + d.phase) * 0.3
      d.wrap.rotation.y = d.rotY + t * d.rotS
      d.wrap.rotation.z = Math.sin(t * 0.1 + d.phase) * 0.2
      if (d.key === 'bee' && d.obj?.userData?.wings) {
        d.obj.userData.wings.rotation.y = Math.sin(t * 9 + d.phase) * 0.55
      }
    }

    dust.userData.tick(dt)
    dust.position.y = -scrollP * 0.5
    halo.material.opacity = 0.13 * (1 - scrollP * 0.6)

    camera.position.x = mx * 0.2
    camera.position.y = 0.1 - my * 0.14 + scrollP * 0.3
    camera.lookAt(0, 0.24 + scrollP * 0.9, 0)
  })

  return {
    setScroll(p) { scrollP = p },
    dispose: stage.dispose
  }
}
