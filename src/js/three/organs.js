import * as THREE from 'three'
import { loadGeometry } from './models.js'
import { organTextures, organMaterial } from './tissues.js'
import { IS_TOUCH } from './core.js'

/* flesh recipe: wet, translucent, glistening — transmission gives
 * the subsurface "fresh organ" look on desktop; touch devices get
 * the same gloss without the transmission pass. */
const SSS = !IS_TOUCH
const FLESH = {
  liver: { bumpScale: 0.55, roughness: 0.6, clearcoat: 0.62, clearcoatRoughness: 0.14, sheen: 0.8, sheenColor: '#ff8a6e', envMapIntensity: 1.15, transmission: 0.18, thickness: 2.6, attenuationColor: '#7a2410', attenuationDistance: 0.85 },
  stomach: { bumpScale: 0.62, roughness: 0.62, clearcoat: 0.55, clearcoatRoughness: 0.18, sheen: 0.72, sheenColor: '#ffb59c', envMapIntensity: 1.05, transmission: 0.2, thickness: 2.2, attenuationColor: '#a8402a', attenuationDistance: 0.7 },
  kidneys: { bumpScale: 0.5, roughness: 0.62, clearcoat: 0.6, clearcoatRoughness: 0.16, sheen: 0.68, sheenColor: '#ffa48a', envMapIntensity: 1.1, transmission: 0.12, thickness: 1.8, attenuationColor: '#7d2f1a', attenuationDistance: 0.8 },
  heart: { bumpScale: 0.45, roughness: 0.58, clearcoat: 0.65, clearcoatRoughness: 0.12, sheen: 0.75, sheenColor: '#ff9a8e', envMapIntensity: 1.2, transmission: 0.14, thickness: 2.4, attenuationColor: '#8a1a12', attenuationDistance: 0.75 },
  pancreas: { bumpScale: 0.7, roughness: 0.66, clearcoat: 0.35, clearcoatRoughness: 0.3, sheen: 0.5, sheenColor: '#ffdfa8', envMapIntensity: 0.95, transmission: 0.06, thickness: 1.4, attenuationColor: '#c9924f', attenuationDistance: 0.6 },
  intestines: { bumpScale: 0.6, roughness: 0.6, clearcoat: 0.55, clearcoatRoughness: 0.18, sheen: 0.7, sheenColor: '#ffd2b8', envMapIntensity: 1.05, transmission: 0.16, thickness: 2.0, attenuationColor: '#a4603a', attenuationDistance: 0.8 }
}
function fleshMat(key, t) {
  const cfg = FLESH[key]
  return organMaterial({
    map: t.map, bump: t.bump, roughnessMap: t.roughness,
    bumpScale: cfg.bumpScale, roughness: cfg.roughness,
    clearcoat: cfg.clearcoat, clearcoatRoughness: cfg.clearcoatRoughness,
    sheen: cfg.sheen, sheenColor: cfg.sheenColor, envMapIntensity: cfg.envMapIntensity,
    transmission: SSS ? cfg.transmission : 0,
    thickness: cfg.thickness, attenuationColor: cfg.attenuationColor, attenuationDistance: cfg.attenuationDistance
  })
}

/* ============================================================
 * organs.js — the fine organ models. Geometry is baked at build
 * time (tools/bake.mjs → ./organ-data/*.js) and loaded lazily;
 * this file keeps the material recipes and the anatomical
 * attachments (gallbladder, vessels, ureters, bladder…).
 * ============================================================ */

export function fitGroup(group, targetRadius = 1.28) {
  group.updateWorldMatrix(true, true)
  const box = new THREE.Box3().setFromObject(group)
  const c = box.getCenter(new THREE.Vector3())
  const size = box.getSize(new THREE.Vector3()).length()
  const s = (targetRadius * 2) / Math.max(size, 0.01)
  group.position.set(-c.x, -c.y, -c.z)
  group.scale.setScalar(s)
  return s
}

function vesselMat(color) {
  return new THREE.MeshPhysicalMaterial({ color, roughness: 0.36, clearcoat: 0.5, sheen: 0.4, sheenColor: '#ffffff' })
}

async function buildLiver() {
  const group = new THREE.Group()
  const t = organTextures('liver')
  const mat = fleshMat('liver', t)
  const mesh = new THREE.Mesh(await loadGeometry('liver'), mat)
  mesh.castShadow = true
  group.add(mesh)

  const gbMat = new THREE.MeshPhysicalMaterial({
    color: '#4f9e57', roughness: 0.18, transmission: 0.35, thickness: 0.5,
    clearcoat: 0.8, transparent: true, opacity: 0.95
  })
  const gb = new THREE.Mesh(new THREE.CapsuleGeometry(0.115, 0.1, 6, 18), gbMat)
  gb.position.set(0.26, -0.6, 0.26)
  gb.rotation.set(0.35, 0, -0.5)
  gb.castShadow = true
  group.add(gb)
  const duct = new THREE.Mesh(
    new THREE.TubeGeometry(
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(0.24, -0.52, 0.24),
        new THREE.Vector3(0.18, -0.36, 0.2),
        new THREE.Vector3(0.12, -0.2, 0.14)
      ]), 14, 0.032, 8),
    new THREE.MeshStandardMaterial({ color: '#7fae6a', roughness: 0.5 })
  )
  group.add(duct)

  /* hepatic veins rising from the diaphragmatic surface */
  const hvMat = new THREE.MeshPhysicalMaterial({ color: '#6e3a5e', roughness: 0.32, clearcoat: 0.4 })
  const hepatVein = (pts, r) =>
    new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p))), 24, r, 8), hvMat)
  group.add(
    hepatVein([[0.32, 0.38, -0.05], [0.3, 0.58, -0.08], [0.27, 0.68, -0.1]], 0.032),
    hepatVein([[0.06, 0.32, 0.18], [0.02, 0.5, 0.16], [-0.01, 0.62, 0.13]], 0.026),
    hepatVein([[-0.2, 0.28, -0.1], [-0.23, 0.47, -0.12], [-0.26, 0.58, -0.13]], 0.024)
  )
  /* portal triad at the porta hepatis */
  const portalMat = new THREE.MeshPhysicalMaterial({ color: '#8e5a3a', roughness: 0.4 })
  const bileMat = new THREE.MeshPhysicalMaterial({ color: '#5f8f4c', roughness: 0.45 })
  const triad = new THREE.Mesh(new THREE.CapsuleGeometry(0.042, 0.14, 6, 10), portalMat)
  triad.position.set(0.06, -0.34, 0.24)
  triad.rotation.z = -0.5
  const bileDuct = new THREE.Mesh(new THREE.CapsuleGeometry(0.03, 0.16, 6, 10), bileMat)
  bileDuct.position.set(-0.02, -0.36, 0.3)
  bileDuct.rotation.z = 0.35
  group.add(triad, bileDuct)
  group.rotation.set(-0.06, 0.35, 0.05)
  return group
}

async function buildStomach() {
  const group = new THREE.Group()
  const t = organTextures('stomach')
  const mat = fleshMat('stomach', t)
  const mesh = new THREE.Mesh(await loadGeometry('stomach'), mat)
  mesh.castShadow = true
  group.add(mesh)

  const stubMat = organMaterial({
    bump: t.bump, bumpScale: 0.5, roughness: 0.45,
    color: '#a85a42', clearcoat: 0.3, sheen: 0.4, sheenColor: '#ffc7ae'
  })
  const eso = new THREE.Mesh(new THREE.CapsuleGeometry(0.1, 0.16, 6, 14), stubMat)
  eso.position.set(0.02, 1.1, -0.02)
  group.add(eso)
  const duo = new THREE.Mesh(new THREE.CapsuleGeometry(0.1, 0.14, 6, 14), stubMat)
  duo.position.set(0.6, 0.3, -0.05)
  duo.rotation.z = -0.7
  group.add(duo)
  group.rotation.set(0.04, -0.4, 0)
  return group
}

async function buildKidneys() {
  const group = new THREE.Group()
  const t = organTextures('kidneys')
  const mat = fleshMat('kidneys', t)
  const mesh = new THREE.Mesh(await loadGeometry('kidneys'), mat)
  mesh.castShadow = true
  group.add(mesh)

  const adrMat = new THREE.MeshPhysicalMaterial({ color: '#d9a45e', roughness: 0.5, clearcoat: 0.2 })
  ;[-1, 1].forEach((s) => {
    const adr = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), adrMat)
    adr.scale.set(0.16, 0.1, 0.12)
    adr.position.set(s * 0.58, 0.92, -0.04)
    adr.rotation.z = s * 0.25
    group.add(adr)
  })

  /* renal pelvis bulges at each hilum */
  const pelvisMat = new THREE.MeshPhysicalMaterial({ color: '#b98a5e', roughness: 0.38, clearcoat: 0.3 })
  ;[-1, 1].forEach((s) => {
    const pelvis = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), pelvisMat)
    pelvis.scale.set(0.1, 0.16, 0.12)
    pelvis.position.set(s * 0.32, 0.0, 0.04)
    group.add(pelvis)
  })
  const ureterMat = new THREE.MeshStandardMaterial({ color: '#c9a06c', roughness: 0.5 })
  ;[-1, 1].forEach((s) => {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(s * 0.36, 0.02, 0.02),
      new THREE.Vector3(s * 0.3, -0.5, 0.1),
      new THREE.Vector3(s * 0.14, -0.9, 0.16),
      new THREE.Vector3(s * 0.06, -1.02, 0.2)
    ])
    const u = new THREE.Mesh(new THREE.TubeGeometry(curve, 36, 0.042, 10), ureterMat)
    group.add(u)
    const artery = new THREE.Mesh(
      new THREE.TubeGeometry(
        new THREE.CatmullRomCurve3([
          new THREE.Vector3(s * 0.1, 0.66, -0.42),
          new THREE.Vector3(s * 0.28, 0.5, -0.26),
          new THREE.Vector3(s * 0.42, 0.34, -0.12)
        ]), 24, 0.05, 10),
      new THREE.MeshStandardMaterial({ color: '#a63a3a', roughness: 0.42 })
    )
    group.add(artery)
  })
  const bladder = new THREE.Mesh(
    new THREE.SphereGeometry(1, 26, 20),
    new THREE.MeshPhysicalMaterial({ color: '#e3cf7d', roughness: 0.32, clearcoat: 0.55, transparent: true, opacity: 0.93 })
  )
  bladder.scale.set(0.42, 0.33, 0.36)
  bladder.position.set(0, -1.14, 0.22)
  group.add(bladder)
  group.rotation.set(0.05, 0, 0)
  return group
}

async function buildHeart() {
  const group = new THREE.Group()
  const t = organTextures('heart')
  const mat = fleshMat('heart', t)
  const body = new THREE.Mesh(await loadGeometry('heart'), mat)
  body.castShadow = true
  group.add(body)

  const aorta = new THREE.Mesh(
    new THREE.TubeGeometry(
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(0.0, 0.52, 0.08),
        new THREE.Vector3(0.05, 0.92, 0.08),
        new THREE.Vector3(0.3, 1.06, 0.0),
        new THREE.Vector3(0.5, 0.88, -0.08),
        new THREE.Vector3(0.5, 0.62, -0.12)
      ]), 50, 0.108, 16),
    vesselMat('#b0474e')
  )
  aorta.castShadow = true
  const pulm = new THREE.Mesh(
    new THREE.TubeGeometry(
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(0.08, 0.5, 0.2),
        new THREE.Vector3(-0.06, 0.74, 0.16),
        new THREE.Vector3(-0.26, 0.8, 0.08)
      ]), 36, 0.082, 14),
    vesselMat('#5a76a8')
  )
  const cav = new THREE.Mesh(
    new THREE.TubeGeometry(
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(0.33, 1.02, -0.08),
        new THREE.Vector3(0.36, 0.68, -0.12),
        new THREE.Vector3(0.3, 0.5, -0.05)
      ]), 24, 0.06, 12),
    vesselMat('#7a5a72')
  )
  const capA = new THREE.Mesh(new THREE.SphereGeometry(0.1, 14, 10), vesselMat('#b0474e'))
  capA.position.set(0.5, 0.62, -0.12)
  const capP = new THREE.Mesh(new THREE.SphereGeometry(0.078, 14, 10), vesselMat('#5a76a8'))
  capP.position.set(-0.26, 0.8, 0.08)
  const capC = new THREE.Mesh(new THREE.SphereGeometry(0.058, 14, 10), vesselMat('#7a5a72'))
  capC.position.set(0.33, 1.02, -0.08)
  group.add(aorta, pulm, cav, capA, capP, capC)

  /* coronary arteries — the heart's own blood supply */
  const corMat = new THREE.MeshPhysicalMaterial({
    color: '#b02826', roughness: 0.3, clearcoat: 0.45, clearcoatRoughness: 0.3,
    sheen: 0.4, sheenColor: '#ffb9a8'
  })
  const coronary = (pts, r = 0.028) =>
    new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p))), 36, r, 8), corMat)
  // left main → LAD down the interventricular groove
  group.add(coronary([[0.06, 0.5, 0.16], [0.0, 0.32, 0.4], [-0.02, 0.05, 0.46], [-0.12, -0.3, 0.4], [-0.24, -0.55, 0.26]], 0.03))
  // circumflex around the left AV groove
  group.add(coronary([[-0.02, 0.32, 0.4], [-0.28, 0.34, 0.32], [-0.44, 0.28, 0.1], [-0.5, 0.1, -0.05]], 0.024))
  // right coronary along the right AV groove to the apex
  group.add(coronary([[0.14, 0.48, 0.18], [0.34, 0.3, 0.34], [0.34, 0.02, 0.42], [0.18, -0.28, 0.38], [0.02, -0.48, 0.3]], 0.028))

  group.userData.tick = (t) => {
    const beat = 1 + Math.sin(t * 2.6) * 0.011 + Math.max(0, Math.sin(t * 2.6 - 0.55)) * 0.02
    body.scale.setScalar(beat)
    aorta.scale.setScalar(1 + (beat - 1) * 0.4)
  }
  group.rotation.set(0.05, 0.3, 0.25)
  return group
}

async function buildPancreas() {
  const group = new THREE.Group()
  const t = organTextures('pancreas')
  const mat = fleshMat('pancreas', t)
  const mesh = new THREE.Mesh(await loadGeometry('pancreas'), mat)
  mesh.castShadow = true
  group.add(mesh)
  group.rotation.set(0.05, -0.2, 0)
  return group
}

async function buildIntestines() {
  const group = new THREE.Group()
  const t = organTextures('intestines')
  const mat = fleshMat('intestines', t)
  const mesh = new THREE.Mesh(await loadGeometry('intestines'), mat)
  mesh.castShadow = true
  group.add(mesh)
  group.rotation.set(0.02, 0.4, 0)
  return group
}

export const ORGANS = {
  liver: { label: 'Liver', build: buildLiver },
  stomach: { label: 'Stomach', build: buildStomach },
  kidneys: { label: 'Kidneys', build: buildKidneys },
  heart: { label: 'Heart', build: buildHeart },
  pancreas: { label: 'Pancreas', build: buildPancreas },
  intestines: { label: 'Intestines', build: buildIntestines }
}

export async function makeOrgan(key) {
  const def = ORGANS[key]
  if (!def) return null
  const group = await def.build()
  fitGroup(group, 1.28)
  return group
}
