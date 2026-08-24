import * as THREE from 'three'
import { SDF, op, sculptField, capsuleSweep, makeNoise, fbm } from './sculpt.js'
import {
  liverTextures, stomachTextures, kidneyTextures, heartTextures,
  pancreasTextures, intestineTextures, organMaterial
} from './tissues.js'

/* ============================================================
 * organs.js — anatomically-informed procedural organs.
 *
 * Each organ is a smooth-blended distance field (defined in a
 * shared unit space, roughly within [-1.35, 1.35]) meshed with
 * the sculpting engine, wrapped in a Group with anatomical
 * attachments (gallbladder, vessels, ureters, bladder), and
 * fitted to a standard framing radius so every viewer can treat
 * organs uniformly.
 * ============================================================ */

const H = 0.012 // iso compensation for smoothing

/* organic surface irregularity — tiny fbm displacement added to a field */
function organic(seed, amp = 0.014, freq = 2.6) {
  const n = makeNoise(seed, 6)
  return (p) => fbm(n, p[0] * freq + 0.5, p[1] * freq + 0.5, p[2] * freq + 0.5, 2) * amp
}

function fieldOf(fn, res = 88) {
  return (x, y, z) => fn([x, y, z])
}

function toGeometry(fn, opts = {}) {
  return sculptField(fieldOf(fn), { min: [-1.6, -1.6, -1.6], max: [1.6, 1.6, 1.6], res: 88, iso: H, ...opts })
}

/* normalize a group so its contents sit centered and fit a framing radius */
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

/* ============================================================
 * LIVER
 * ============================================================ */
function liverField() {
  return (p) => {
    const right = op.at(p, SDF.ellipsoid([0.64, 0.42, 0.52]), { tx: 0.36, ty: 0.06, tz: -0.02 })
    const left = op.at(p, SDF.ellipsoid([0.62, 0.16, 0.35]), { tx: -0.42, ty: 0.18, tz: -0.02 })
    const lower = op.at(p, SDF.ellipsoid([0.44, 0.3, 0.34]), { tx: 0.2, ty: -0.12, tz: 0.1 })
    let d = op.smoothUnion(right, left, 0.22)
    d = op.smoothUnion(d, lower, 0.18)
    // concave underside (smooth carve gives the liver's wedge bottom)
    const carve = op.at(p, SDF.sphere(1.28), { tx: 0.1, ty: -1.35, tz: 0.05 })
    d = op.smoothSubtract(d, carve, 0.1)
    // subtle lobe fissure across the top
    const f = SDF.capsule([0.06, 0.62, -0.34], [0.06, 0.62, 0.42], 0.045)(p)
    d = op.smoothSubtract(d, f, 0.04)
    d += organic(11, 0.012, 3.1)(p)
    return d
  }
}

export function buildLiver() {
  const group = new THREE.Group()
  const t = liverTextures()
  const mat = organMaterial({
    map: t.map, bump: t.bump, bumpScale: 0.6,
    roughness: 0.4, clearcoat: 0.42, clearcoatRoughness: 0.5,
    sheen: 0.5, sheenColor: '#ff9a80', envMapIntensity: 0.9
  })
  const geo = toGeometry(liverField(), { res: 88 })
  const mesh = new THREE.Mesh(geo, mat)
  mesh.castShadow = true
  group.add(mesh)

  /* gallbladder + cystic duct */
  const gbMat = new THREE.MeshPhysicalMaterial({
    color: '#4f9e57', roughness: 0.18, transmission: 0.35, thickness: 0.5,
    clearcoat: 0.8, transparent: true, opacity: 0.95
  })
  const gb = new THREE.Mesh(new THREE.CapsuleGeometry(0.115, 0.13, 6, 18), gbMat)
  gb.position.set(0.24, -0.72, 0.3)
  gb.rotation.set(0.3, 0, -0.5)
  gb.castShadow = true
  group.add(gb)
  const duct = new THREE.Mesh(
    new THREE.TubeGeometry(
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(0.24, -0.62, 0.3),
        new THREE.Vector3(0.18, -0.3, 0.24),
        new THREE.Vector3(0.1, -0.12, 0.16)
      ]), 16, 0.035, 8),
    new THREE.MeshStandardMaterial({ color: '#7fae6a', roughness: 0.5 })
  )
  group.add(duct)

  group.rotation.set(-0.06, 0.35, 0.05)
  return group
}

/* ============================================================
 * STOMACH  (J-shaped: fundus, body, antrum, pylorus)
 * ============================================================ */
function stomachField() {
  const pts = [
    [0.02, 1.02, -0.02],
    [-0.3, 0.94, -0.03],
    [-0.5, 0.66, 0.0],
    [-0.48, 0.3, 0.05],
    [-0.3, -0.06, 0.09],
    [0.02, -0.3, 0.12],
    [0.34, -0.3, 0.1],
    [0.5, -0.12, 0.04],
    [0.56, 0.12, -0.04]
  ]
  const radii = [0.14, 0.26, 0.31, 0.33, 0.31, 0.27, 0.22, 0.16, 0.12]
  const sweep = capsuleSweep(pts, radii, 0.05)
  return (p) => {
    let d = sweep(p)
    // rounded fundus cap
    const fundus = op.at(p, SDF.sphere(0.26), { tx: -0.34, ty: 0.86, tz: 0.0 })
    d = op.smoothUnion(d, fundus, 0.06)
    d += organic(23, 0.01, 2.8)(p)
    return d
  }
}

export function buildStomach() {
  const group = new THREE.Group()
  const t = stomachTextures()
  const mat = organMaterial({
    map: t.map, bump: t.bump, bumpScale: 0.7,
    roughness: 0.42, clearcoat: 0.5, clearcoatRoughness: 0.45,
    sheen: 0.6, sheenColor: '#ffb59c', envMapIntensity: 0.9
  })
  const mesh = new THREE.Mesh(toGeometry(stomachField(), { res: 84 }), mat)
  mesh.castShadow = true
  group.add(mesh)

  /* esophagus stub + duodenal cap */
  const stubMat = organMaterial({
    map: null, bump: t.bump, bumpScale: 0.5, roughness: 0.45,
    color: '#a85a42', clearcoat: 0.3, sheen: 0.4, sheenColor: '#ffc7ae'
  })
  const eso = new THREE.Mesh(new THREE.CapsuleGeometry(0.1, 0.22, 6, 14), stubMat)
  eso.position.set(0.02, 1.16, -0.02)
  group.add(eso)
  const duo = new THREE.Mesh(new THREE.CapsuleGeometry(0.1, 0.14, 6, 14), stubMat)
  duo.position.set(0.6, 0.3, -0.05)
  duo.rotation.z = -0.7
  group.add(duo)

  group.rotation.set(0.04, -0.4, 0)
  return group
}

/* ============================================================
 * KIDNEYS + urinary tract
 * ============================================================ */
function beanField(cx, cy, cz, rotZ) {
  return (p) => {
    const q = op.at(p, SDF.ellipsoid([0.4, 0.66, 0.36]), { tx: cx, ty: cy, tz: cz, rz: rotZ })
    let d = q
    // hilum carve on the medial side
    const hilum = op.at(p, SDF.ellipsoid([0.2, 0.24, 0.28]), { tx: cx - Math.sign(cx) * 0.34, ty: cy + 0.04, tz: cz, rz: rotZ })
    d = op.smoothSubtract(d, hilum, 0.09)
    d += organic(cx > 0 ? 31 : 32, 0.01, 3.2)(p)
    return d
  }
}

export function buildKidneys() {
  const group = new THREE.Group()
  const t = kidneyTextures()
  const mat = organMaterial({
    map: t.map, bump: t.bump, bumpScale: 0.55,
    roughness: 0.4, clearcoat: 0.45, clearcoatRoughness: 0.5,
    sheen: 0.5, sheenColor: '#ffa48a', envMapIntensity: 0.95
  })

  const leftGeo = toGeometry(beanField(-0.6, 0.22, -0.04, 0.12), { res: 80 })
  const rightGeo = toGeometry(beanField(0.66, 0.16, -0.04, -0.12), { res: 80 })
  const left = new THREE.Mesh(leftGeo, mat)
  left.castShadow = true
  const right = new THREE.Mesh(rightGeo, mat)
  right.castShadow = true
  group.add(left, right)

  /* adrenal glands — small pale crescents on top */
  const adrMat = new THREE.MeshPhysicalMaterial({ color: '#d9a45e', roughness: 0.5, clearcoat: 0.2 })
  ;[-1, 1].forEach((s) => {
    const adr = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), adrMat)
    adr.scale.set(0.16, 0.1, 0.12)
    adr.position.set(s * 0.58, 0.92, -0.04)
    adr.rotation.z = s * 0.25
    group.add(adr)
  })

  /* ureters + bladder */
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
        ]),
        24, 0.05, 10
      ),
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

/* ============================================================
 * HEART  (ventricles, atria, great vessels; beats)
 * ============================================================ */
function heartField() {
  const lv = (p) => op.at(p, SDF.ellipsoid([0.42, 0.6, 0.46]), { tx: -0.12, ty: -0.16, tz: 0.02 })
  const rv = (p) => op.at(p, SDF.ellipsoid([0.36, 0.52, 0.42]), { tx: 0.2, ty: -0.1, tz: 0.06 })
  const apex = (p) => op.at(p, SDF.sphere(0.2), { tx: -0.28, ty: -0.58, tz: 0.0 })
  const la = (p) => op.at(p, SDF.ellipsoid([0.28, 0.2, 0.26]), { tx: -0.18, ty: 0.5, tz: -0.06 })
  const ra = (p) => op.at(p, SDF.ellipsoid([0.26, 0.2, 0.24]), { tx: 0.26, ty: 0.52, tz: 0.06 })
  return (p) => {
    let d = op.smoothUnion(lv(p), rv(p), 0.2)
    d = op.smoothUnion(d, apex(p), 0.16)
    d = op.smoothUnion(d, la(p), 0.12)
    d = op.smoothUnion(d, ra(p), 0.12)
    // interventricular groove on the front
    const groove = SDF.capsule([0.05, 0.3, 0.46], [-0.24, -0.52, 0.2], 0.05)(p)
    d = op.smoothSubtract(d, groove, 0.05)
    // coronary groove at the base
    const ring = op.at(p, SDF.torus(0.42, 0.045), { tx: 0.04, ty: 0.34, tz: 0.0, rx: 0.28 })
    d = op.smoothSubtract(d, ring, 0.05)
    d += organic(43, 0.012, 3.4)(p)
    return d
  }
}

function vesselMat(color) {
  return new THREE.MeshPhysicalMaterial({ color, roughness: 0.36, clearcoat: 0.5, sheen: 0.4, sheenColor: '#ffffff' })
}

export function buildHeart() {
  const group = new THREE.Group()
  const t = heartTextures()
  const mat = organMaterial({
    map: t.map, bump: t.bump, bumpScale: 0.5,
    roughness: 0.38, clearcoat: 0.48, clearcoatRoughness: 0.45,
    sheen: 0.55, sheenColor: '#ff9a8e', envMapIntensity: 0.9
  })
  const body = new THREE.Mesh(toGeometry(heartField(), { res: 84 }), mat)
  body.castShadow = true
  group.add(body)

  /* great vessels */
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
        new THREE.Vector3(0.1, 0.5, 0.18),
        new THREE.Vector3(-0.1, 0.86, 0.16),
        new THREE.Vector3(-0.42, 0.94, 0.08),
        new THREE.Vector3(-0.52, 0.72, 0.0)
      ]), 42, 0.085, 14),
    vesselMat('#5a76a8')
  )

  const cav = new THREE.Mesh(
    new THREE.TubeGeometry(
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(0.4, 1.1, -0.12),
        new THREE.Vector3(0.42, 0.76, -0.16),
        new THREE.Vector3(0.3, 0.52, -0.06)
      ]), 28, 0.07, 12),
    vesselMat('#7a5a72')
  )
  group.add(aorta, pulm, cav)

  group.userData.tick = (t) => {
    const beat = 1 + Math.sin(t * 2.6) * 0.011 + Math.max(0, Math.sin(t * 2.6 - 0.55)) * 0.02
    body.scale.setScalar(beat)
    aorta.scale.setScalar(1 + (beat - 1) * 0.4)
  }
  group.rotation.set(0.05, 0.3, 0.25)
  return group
}

/* ============================================================
 * PANCREAS
 * ============================================================ */
function pancreasField() {
  const pts = [
    [0.92, 0.14, 0.14],
    [0.86, -0.02, 0.1],
    [0.55, 0.0, 0.03],
    [0.2, -0.03, 0.0],
    [-0.1, -0.05, -0.02],
    [-0.45, -0.03, 0.0],
    [-0.7, 0.04, 0.04],
    [-0.9, 0.13, 0.1]
  ]
  const radii = [0.16, 0.2, 0.18, 0.15, 0.125, 0.1, 0.08, 0.05]
  const sweep = capsuleSweep(pts, radii, 0.05)
  return (p) => {
    let d = sweep(p)
    d += organic(51, 0.012, 4.2)(p)
    return d
  }
}

export function buildPancreas() {
  const group = new THREE.Group()
  const t = pancreasTextures()
  const mat = organMaterial({
    map: t.map, bump: t.bump, bumpScale: 0.8,
    roughness: 0.5, clearcoat: 0.25, clearcoatRoughness: 0.5,
    sheen: 0.4, sheenColor: '#ffdfa8', envMapIntensity: 0.85
  })
  const mesh = new THREE.Mesh(toGeometry(pancreasField(), { res: 80 }), mat)
  mesh.castShadow = true
  group.add(mesh)
  group.rotation.set(0.05, -0.2, 0)
  return group
}

/* ============================================================
 * INTESTINES  (colon frame + coiled small intestine)
 * ============================================================ */
function catmull(points, samples) {
  const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)), false, 'catmullrom', 0.5)
  const out = []
  for (let i = 0; i <= samples; i++) out.push(curve.getPointAt(i / samples))
  return out
}

function smallIntestinePts() {
  const out = []
  const turns = 2.1
  const N = 130
  for (let i = 0; i <= N; i++) {
    const t = i / N
    const a = t * Math.PI * 2 * turns
    const r = 0.42 - t * 0.2
    out.push([
      Math.cos(a) * r + Math.sin(a * 1.7) * 0.05,
      0.5 - t * 0.72 + Math.sin(a * 0.9) * 0.05,
      0.1 + Math.sin(a * 1.3) * 0.05
    ])
  }
  return out
}

function intestineField() {
  const colonPts = catmull([
    [0.6, -0.66, 0.18],
    [0.7, -0.3, 0.14],
    [0.7, 0.1, 0.08],
    [0.62, 0.42, 0.02],
    [0.2, 0.5, -0.02],
    [-0.3, 0.5, -0.04],
    [-0.64, 0.4, -0.04],
    [-0.72, 0.05, 0.0],
    [-0.7, -0.35, 0.06],
    [-0.58, -0.68, 0.1],
    [-0.2, -0.82, 0.12],
    [0.08, -0.95, 0.12]
  ], 90)
  const colonRadii = colonPts.map((_, i) => 0.15 + 0.028 * Math.abs(Math.sin(i * 0.55)))
  const colon = capsuleSweep(
    colonPts.map((p) => [p.x, p.y, p.z]),
    colonRadii,
    0.04
  )
  const small = capsuleSweep(smallIntestinePts(), smallIntestinePts().map(() => 0.085), 0.03)
  return (p) => {
    let d = op.smoothUnion(colon(p), small(p), 0.04)
    d += organic(61, 0.01, 3.6)(p)
    return d
  }
}

export function buildIntestines() {
  const group = new THREE.Group()
  const t = intestineTextures()
  const mat = organMaterial({
    map: t.map, bump: t.bump, bumpScale: 0.65,
    roughness: 0.42, clearcoat: 0.4, clearcoatRoughness: 0.5,
    sheen: 0.55, sheenColor: '#ffd2b8', envMapIntensity: 0.9
  })
  const mesh = new THREE.Mesh(toGeometry(intestineField(), { res: 80 }), mat)
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

export function makeOrgan(key) {
  const def = ORGANS[key]
  if (!def) return null
  const group = def.build()
  fitGroup(group, 1.28)
  return group
}
