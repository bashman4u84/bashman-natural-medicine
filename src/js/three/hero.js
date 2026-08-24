import * as THREE from 'three'
import { initStage, studioLights, driftPoints, glowTexture, IS_TOUCH } from './core.js'
import { SDF, op, sculptField, makeNoise, fbm } from './sculpt.js'
import { pomegranateTextures } from './tissues.js'
import { RECIPES } from './tissue-recipes.js'

/* ============================================================
 * hero.js — "The Healing Seed"
 *
 * A half-open pomegranate — the Sunna fruit the tradition calls
 * the remedy of the heart — with a warm golden light glowing
 * from its interior and ruby arils visible along the rim. Rich
 * leathery rind, jewel-like seeds, thin orbit rings on the
 * forest-green stage, and drifting gold motes. Reads crafted,
 * not procedural, and matches the brand: nature, the Sunnah,
 * healing from the root.
 * ============================================================ */

function fieldNoise(seed, amp, freq) {
  const n = makeNoise(seed, 6)
  return (p) => fbm(n, p[0] * freq + 0.3, p[1] * freq + 0.3, p[2] * freq + 0.3, 2) * amp
}

/* The rind: body sphere, hollowed, with a tilted opening cut */
function rindField() {
  const bodyNoise = fieldNoise(101, 0.02, 2.2)
  const cutShape = (q) => op.at(q, SDF.roundBox([0.55, 0.45, 0.42], 0.03), {
    tx: 0.0, ty: 0.62, tz: 0.66, rx: -0.6
  })
  const innerShape = (q) => op.at(q, SDF.sphere(0.78), { ty: -0.06 })
  const tipShape = (q) => op.at(q, SDF.sphere(0.3), { ty: 1.02 }) // calyx base bulge
  return (p) => {
    // lumpy body
    let d = SDF.ellipsoid([0.98, 0.92, 0.92])(p) + bodyNoise(p)
    d = op.smoothUnion(d, tipShape(p), 0.2)
    // hollow interior
    d = op.smoothSubtract(d, innerShape(p), 0.02)
    // the opening (crisp chisel cut)
    d = op.subtract(d, cutShape(p))
    return d
  }
}

/* interior flesh dome the arils sit on */
function fleshField() {
  const dome = (q) => op.at(q, SDF.sphere(0.84), { ty: -0.26 })
  return (p) => {
    const n = fieldNoise(103, 0.012, 2.6)(p)
    return dome(p) + n
  }
}

const _v = new THREE.Vector3()

export function initHero(canvas, _opts = {}) {
  const fx = new URLSearchParams(location.search).get('fx') || 'full'
  const S = (flag) => fx === 'full' || fx === flag
  const stage = initStage(canvas, { fov: 42, camPos: [0, 0.12, 4.7], shadows: false, exposure: 0.98 })
  const { scene, camera } = stage
  studioLights(scene)

  /* ---------- pomegranate ---------- */
  const tex = pomegranateTextures()
  const rindMat = new THREE.MeshPhysicalMaterial({
    map: tex.map, bumpMap: tex.bump, bumpScale: 0.5,
    color: '#ffffff', roughness: 0.38, clearcoat: 0.5, clearcoatRoughness: 0.5,
    sheen: 0.35, sheenColor: new THREE.Color('#ffb0a0'), envMapIntensity: 0.9
  })
  const rind = new THREE.Mesh(sculptField(rindField(), { min: [-1.4, -1.4, -1.4], max: [1.4, 1.4, 1.4], res: IS_TOUCH ? 84 : 104 }), rindMat)
  // widen UV fold (box projection scale) — keep default; scale object instead
  scene.add(rind)

  /* calyx crown — six curved sepals rising from the tip */
  const calyxMat = rindMat.clone()
  const crown = new THREE.Group()
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.3
    const base = new THREE.Vector3(Math.cos(a) * 0.13, 0.92, Math.sin(a) * 0.13)
    const tipPos = new THREE.Vector3(Math.cos(a) * 0.3, 1.24, Math.sin(a) * 0.3)
    const spike = new THREE.Mesh(
      new THREE.TubeGeometry(
        new THREE.QuadraticBezierCurve3(
          base,
          base.clone().add(new THREE.Vector3(Math.cos(a) * 0.06, 0.14, Math.sin(a) * 0.06)),
          tipPos
        ),
        8,
        0.045,
        8
      ),
      calyxMat
    )
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.02, 8, 6), calyxMat)
    cap.position.copy(tipPos)
    crown.add(spike, cap)
  }
  scene.add(crown)

  const fleshMat = new THREE.MeshPhysicalMaterial({
    color: '#e9d3a4', roughness: 0.62, clearcoat: 0.18,
    sheen: 0.4, sheenColor: new THREE.Color('#fff3d0'), envMapIntensity: 0.6
  })
  const flesh = new THREE.Mesh(sculptField(fleshField(), { min: [-1.2, -1.2, -1.2], max: [1.2, 1.2, 1.2], res: IS_TOUCH ? 64 : 76 }), fleshMat)
  scene.add(flesh)

  /* ---------- arils: ruby gems clustered in the opening ---------- */
  const arilMat = new THREE.MeshPhysicalMaterial({
    color: '#c2154c', roughness: 0.16, clearcoat: 1, clearcoatRoughness: 0.12,
    sheen: 0.7, sheenColor: new THREE.Color('#ff8ab0'),
    emissive: new THREE.Color('#7a0d2c'), emissiveIntensity: 0.55,
    envMapIntensity: 1.3
  })
  const arilGeo = new THREE.SphereGeometry(0.052, 10, 8)
  const arils = new THREE.InstancedMesh(arilGeo, arilMat, 74)
  const m4 = new THREE.Matrix4()
  const q = new THREE.Quaternion()
  const e = new THREE.Euler()
  const s3 = new THREE.Vector3()
  // dome cap around the opening axis (rotated -0.62 about x, centered near the cut)
  const cutAxis = new THREE.Vector3(0, Math.cos(0.75), Math.sin(0.75)).normalize() // opening normal
  const right = new THREE.Vector3(1, 0, 0)
  const up = new THREE.Vector3().crossVectors(cutAxis, right).normalize()
  const domeC = new THREE.Vector3(0, -0.26, 0)
  const domeR = 0.84
  let seedI = 0
  const rand = () => {
    seedI = (seedI * 16807) % 2147483647
    return seedI / 2147483647
  }
  for (let i = 0; i < 74; i++) {
    // arils hug the exposed dome cap, angled toward the opening
    const a = rand() * Math.PI * 2
    const capAng = Math.acos(1 - rand() * 0.66) // up to ~62° off the opening axis
    const dir = cutAxis
      .clone()
      .multiplyScalar(Math.cos(capAng))
      .addScaledVector(right, Math.sin(capAng) * Math.cos(a))
      .addScaledVector(up, Math.sin(capAng) * Math.sin(a))
      .normalize()
    const p = domeC.clone().addScaledVector(dir, domeR + 0.015)
    const sc = 0.75 + rand() * 0.7
    e.set(rand() * 3.1, rand() * 3.1, rand() * 3.1)
    q.setFromEuler(e)
    s3.set(sc * 0.92, sc, sc * 0.92)
    m4.compose(p, q, s3)
    arils.setMatrixAt(i, m4)
  }
  arils.instanceMatrix.needsUpdate = true
  scene.add(arils)

  /* ---------- the glowing heart of the fruit ----------
   * No point light inside: it would pass through the shell and
   * wash the exterior. The glow is an additive disc set in the
   * interior, plus emissive arils. */
  const innerLight = new THREE.PointLight('#ffb14e', 2.5, 6, 2)
  innerLight.position.set(0, 0.35, 0.55)
  scene.add(innerLight)
  const ember = new THREE.Mesh(
    new THREE.CircleGeometry(0.3, 32),
    new THREE.MeshBasicMaterial({
      map: glowTexture('rgba(255,180,90,1)', 'rgba(255,120,60,0)'),
      transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending,
      depthWrite: false, side: THREE.DoubleSide
    })
  )
  ember.position.set(0, 0.28, 0.46)
  ember.rotation.x = -0.6
  ember.visible = S('sprites')
  scene.add(ember)
  const glowSpark = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: glowTexture('rgba(255,190,110,0.9)'),
      transparent: true, opacity: 0.3, depthWrite: false, blending: THREE.AdditiveBlending
    })
  )
  glowSpark.scale.setScalar(0.9)
  glowSpark.position.set(0, 0.42, 0.5)
  glowSpark.visible = S('sprites')
  scene.add(glowSpark)

  /* ---------- orbit rings + gold dust ---------- */
  const rings = []
  ;[1.62, 1.98].forEach((r, i) => {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(r, 0.006 + i * 0.002, 8, 160),
      new THREE.MeshBasicMaterial({ color: i === 0 ? '#e8c96a' : '#8fae8c', transparent: true, opacity: i === 0 ? 0.34 : 0.2 })
    )
    ring.rotation.x = Math.PI / 2 - 0.34 - i * 0.26
    ring.rotation.y = i * 0.5
    scene.add(ring)
    rings.push(ring)
  })

  const halo = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: glowTexture('rgba(232,201,106,0.55)'),
      transparent: true, opacity: 0.2, depthWrite: false, blending: THREE.AdditiveBlending
    })
  )
  halo.scale.setScalar(3.4)
  halo.position.z = -1.4
  halo.material.opacity = 0.14
  halo.visible = S('sprites')
  scene.add(halo)

  /* dedicated front key: the studio key rakes from above-right and
   * leaves the camera-facing flank dark — this lifts the fruit's face */
  const frontKey = new THREE.DirectionalLight('#ffe6bd', 2.4)
  frontKey.position.set(-1.6, 1.4, 3.4)
  scene.add(frontKey)

  const dust = driftPoints({ count: IS_TOUCH ? 40 : 80, colors: ['#e8c96a', '#f4dc9a', '#ffd97a'], size: 0.05, rMin: 1.5, rMax: 3.2 })
  dust.visible = S('points')
  scene.add(dust)

  /* ---------- float animation ---------- */
  const pivot = new THREE.Group()
  pivot.add(rind, flesh, arils, crown, glowSprite(glowTexture('rgba(255,150,90,0.8)'), 0.5, 1.1))
  pivot.scale.setScalar(1.32)
  pivot.position.y = -0.1
  scene.add(pivot)

  let scrollP = 0
  let mx = 0, my = 0, tmx = 0, tmy = 0
  if (!matchMedia('(prefers-reduced-motion: reduce)').matches && matchMedia('(pointer: fine)').matches) {
    window.addEventListener('pointermove', (e) => {
      tmx = (e.clientX / window.innerWidth - 0.5) * 2
      tmy = (e.clientY / window.innerHeight - 0.5) * 2
    })
  }

  stage.setRender((dt, t) => {
    mx += (tmx - mx) * 0.045
    my += (tmy - my) * 0.045

    pivot.rotation.y += dt * 0.16
    pivot.rotation.x = Math.sin(t * 0.21) * 0.05
    pivot.position.y = Math.sin(t * 0.75) * 0.06 - scrollP * 0.5

    const breathe = 1 + Math.sin(t * 0.85) * 0.012
    rind.scale.setScalar(breathe)
    flesh.scale.setScalar(breathe)
    arils.scale.setScalar(breathe)

    innerLight.intensity = 2.2 + Math.sin(t * 1.6) * 0.8 + scrollP * 1.5
    ember.material.opacity = 0.32 + Math.sin(t * 1.3) * 0.07 + scrollP * 0.2
    glowSpark.material.opacity = 0.26 + Math.sin(t * 1.3) * 0.08 + scrollP * 0.3

    rings.forEach((r, i) => {
      r.rotation.z += dt * (i === 0 ? 0.09 : -0.055)
      r.position.y = -scrollP * 0.3
      r.material.opacity = (i === 0 ? 0.34 : 0.2) * (1 - scrollP * 0.7)
    })
    halo.material.opacity = 0.2 * (1 - scrollP * 0.6)

    dust.userData.tick(dt)
    dust.position.y = -scrollP * 0.6

    camera.position.x = mx * 0.5
    camera.position.y = 0.12 - my * 0.36 + scrollP * 0.3
    camera.lookAt(0, scrollP * 0.9, 0)
  })

  return {
    setScroll(p) { scrollP = p },
    dispose: stage.dispose
  }
}

function glowSprite(map, opacity, scale) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending }))
  s.scale.setScalar(scale)
  s.position.set(0, 0.05, -1.4)
  return s
}
