import * as THREE from 'three'
import { SDF, op, capsuleSweep, makeNoise, fbm } from './sculpt.js'

/* ============================================================
 * organ-fields.js — PURE signed-distance fields for the organs
 * (no DOM). Meshed at BUILD time by tools/bake.mjs; the browser
 * only ever parses the baked geometry.
 * ============================================================ */

export function organic(seed, amp = 0.014, freq = 2.6) {
  const n = makeNoise(seed, 6)
  return (p) => fbm(n, p[0] * freq + 0.5, p[1] * freq + 0.5, p[2] * freq + 0.5, 2) * amp
}

export const H = 0.012

export function liverField() {
  return (p) => {
    const right = op.at(p, SDF.ellipsoid([0.64, 0.42, 0.52]), { tx: 0.36, ty: 0.06, tz: -0.02 })
    const left = op.at(p, SDF.ellipsoid([0.62, 0.16, 0.35]), { tx: -0.42, ty: 0.18, tz: -0.02 })
    const lower = op.at(p, SDF.ellipsoid([0.44, 0.3, 0.34]), { tx: 0.2, ty: -0.12, tz: 0.1 })
    let d = op.smoothUnion(right, left, 0.22)
    d = op.smoothUnion(d, lower, 0.18)
    const carve = op.at(p, SDF.sphere(1.28), { tx: 0.1, ty: -1.35, tz: 0.05 })
    d = op.smoothSubtract(d, carve, 0.1)
    const f = SDF.capsule([0.06, 0.62, -0.34], [0.06, 0.62, 0.42], 0.045)(p)
    d = op.smoothSubtract(d, f, 0.04)
    d += organic(11, 0.012, 3.1)(p)
    return d
  }
}

export function stomachField() {
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
    const fundus = op.at(p, SDF.sphere(0.26), { tx: -0.34, ty: 0.86, tz: 0.0 })
    d = op.smoothUnion(d, fundus, 0.06)
    d += organic(23, 0.01, 2.8)(p)
    return d
  }
}

export function beanField(cx, cy, cz, rotZ) {
  return (p) => {
    const q = op.at(p, SDF.ellipsoid([0.4, 0.66, 0.36]), { tx: cx, ty: cy, tz: cz, rz: rotZ })
    let d = q
    const hilum = op.at(p, SDF.ellipsoid([0.2, 0.24, 0.28]), { tx: cx - Math.sign(cx) * 0.34, ty: cy + 0.04, tz: cz, rz: rotZ })
    d = op.smoothSubtract(d, hilum, 0.09)
    d += organic(cx > 0 ? 31 : 32, 0.01, 3.2)(p)
    return d
  }
}

export function heartField() {
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
    const groove = SDF.capsule([0.05, 0.3, 0.46], [-0.24, -0.52, 0.2], 0.05)(p)
    d = op.smoothSubtract(d, groove, 0.05)
    const ring = op.at(p, SDF.torus(0.42, 0.045), { tx: 0.04, ty: 0.34, tz: 0.0, rx: 0.28 })
    d = op.smoothSubtract(d, ring, 0.05)
    d += organic(43, 0.012, 3.4)(p)
    return d
  }
}

export function pancreasField() {
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

function catmull(points, samples) {
  const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)), false, 'catmullrom', 0.5)
  const out = []
  for (let i = 0; i <= samples; i++) out.push(curve.getPointAt(i / samples))
  return out
}

function smallIntestinePts() {
  const out = []
  const N = 150
  for (let i = 0; i <= N; i++) {
    const t = i / N
    const row = Math.min(2, Math.floor(t * 3))
    const local = t * 3 - row
    const a = local * Math.PI * 2 * 1.35 + row * 2.4
    const r = 0.36 - local * 0.16
    const y = 0.46 - row * 0.26 + Math.sin(a * 0.8) * 0.03
    out.push([Math.cos(a) * r + Math.sin(a * 1.9) * 0.05, y, 0.16 + Math.sin(a * 1.5) * 0.06])
  }
  return out
}

export function intestinesField() {
  const colonPts = catmull([
    [0.6, -0.66, 0.18], [0.7, -0.3, 0.14], [0.7, 0.1, 0.08], [0.62, 0.42, 0.02],
    [0.2, 0.5, -0.02], [-0.3, 0.5, -0.04], [-0.64, 0.4, -0.04], [-0.72, 0.05, 0.0],
    [-0.7, -0.35, 0.06], [-0.58, -0.68, 0.1], [-0.2, -0.82, 0.12], [0.08, -0.95, 0.12]
  ], 90)
  const colonRadii = colonPts.map((_, i) => 0.15 + 0.028 * Math.abs(Math.sin(i * 0.55)))
  const colon = capsuleSweep(colonPts.map((p) => [p.x, p.y, p.z]), colonRadii, 0.04)
  const small = capsuleSweep(smallIntestinePts(), smallIntestinePts().map(() => 0.095), 0.03)
  return (p) => {
    let d = op.smoothUnion(colon(p), small(p), 0.04)
    d += organic(61, 0.01, 3.6)(p)
    return d
  }
}

export function uterusField() {
  return (p) => {
    const fundus = op.at(p, SDF.ellipsoid([0.36, 0.3, 0.28]), { ty: 0.32 })
    const body = op.at(p, SDF.ellipsoid([0.31, 0.42, 0.25]), { ty: -0.04 })
    let d = op.smoothUnion(fundus, body, 0.12)
    const cervix = SDF.cone([0, -0.26, 0], [0.03, -0.62, 0.02], 0.13, 0.055)(p)
    d = op.smoothUnion(d, cervix, 0.09)
    d += organic(71, 0.014, 3.2)(p)
    return d
  }
}

export const ORGAN_FIELDS = {
  liver: { field: liverField, res: 88 },
  stomach: { field: stomachField, res: 84 },
  kidneys: { field: () => (p) => op.smoothUnion(beanField(-0.6, 0.22, -0.04, 0.12)(p), beanField(0.66, 0.16, -0.04, -0.12)(p), 0.01), res: 80 },
  heart: { field: heartField, res: 84 },
  pancreas: { field: pancreasField, res: 80 },
  intestines: { field: intestinesField, res: 80 },
  uterus: { field: uterusField, res: 82 }
}
