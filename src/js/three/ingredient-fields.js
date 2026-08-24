import { SDF, op, capsuleSweep, makeNoise, fbm } from './sculpt.js'

/* ============================================================
 * ingredient-fields.js — PURE fields for the homepage hero's
 * flowing Sunnah ingredients (pomegranate, leaves, dates,
 * seeds, bees, honeycomb, ginger, garlic, turmeric).
 * Baked once by tools/bake.mjs; browsers never build them.
 * ============================================================ */

const nz = (seed, amp, freq) => {
  const n = makeNoise(seed, 6)
  return (p) => fbm(n, p[0] * freq + 0.5, p[1] * freq + 0.5, p[2] * freq + 0.5, 2) * amp
}

/* ---------- pomegranate (mirrors hero.js v10) ---------- */
export function pomRindField() {
  const cutShape = (q) => op.at(q, SDF.roundBox([0.5, 0.42, 0.38], 0.03), { tx: 0.0, ty: 0.68, tz: 0.62, rx: -0.55 })
  const innerShape = (q) => op.at(q, SDF.sphere(0.78), { ty: -0.06 })
  const tipShape = (q) => op.at(q, SDF.sphere(0.3), { ty: 1.02 })
  const noise = nz(101, 0.02, 2.2)
  return (p) => {
    let d = SDF.ellipsoid([0.98, 0.92, 0.92])(p) + noise(p)
    d = op.smoothUnion(d, tipShape(p), 0.2)
    d = op.smoothSubtract(d, innerShape(p), 0.02)
    d = op.subtract(d, cutShape(p))
    return d
  }
}

export function pomFleshField() {
  const dome = (q) => op.at(q, SDF.sphere(0.6), { ty: -0.24 })
  return (p) => dome(p) + nz(103, 0.012, 2.6)(p)
}

/* ---------- leaf: flat petal with a pointed tip ---------- */
export function leafField(len = 1) {
  return (p) => {
    let d = SDF.ellipsoid([len * 0.5, len * 0.09, len * 0.26])(p)
    const tip = (q) => op.at(q, SDF.sphere(len * 0.12), { tx: len * 0.46 })
    d = op.smoothUnion(d, tip(p), len * 0.06)
    d += nz(len > 0.5 ? 201 : 202, 0.008, 2.4)(p)
    return d
  }
}

/* ---------- date fruit ---------- */
export function dateField() {
  return (p) => {
    let d = SDF.ellipsoid([0.34, 0.13, 0.12])(p)
    const bulge = (q) => op.at(q, SDF.sphere(0.11), { tx: 0.16 })
    d = op.smoothUnion(d, bulge(p), 0.05)
    const calyx = (q) => op.at(q, SDF.sphere(0.055), { tx: -0.32 })
    d = op.smoothUnion(d, calyx(p), 0.02)
    d += nz(211, 0.006, 3.2)(p)
    return d
  }
}

/* ---------- date pit ---------- */
export function datePitField() {
  return (p) => {
    let d = SDF.ellipsoid([0.17, 0.055, 0.045])(p)
    const groove = SDF.capsule([-0.15, 0.02, 0], [0.15, 0.02, 0], 0.02)(p)
    d = op.smoothSubtract(d, groove, 0.015)
    return d
  }
}

/* ---------- bee ---------- */
export function beeBodyField() {
  const abdomen = (q) => op.at(q, SDF.ellipsoid([0.16, 0.115, 0.11]), { tx: -0.05 })
  const thorax = (q) => op.at(q, SDF.ellipsoid([0.11, 0.1, 0.095]), { tx: 0.1 })
  const head = (q) => op.at(q, SDF.sphere(0.075), { tx: 0.21 })
  return (p) => {
    let d = op.smoothUnion(abdomen(p), thorax(p), 0.05)
    d = op.smoothUnion(d, head(p), 0.04)
    d += nz(221, 0.006, 3.4)(p)
    return d
  }
}

export function beeWingField() {
  const wing = (q) => op.at(q, SDF.ellipsoid([0.16, 0.03, 0.09]), { tx: 0.08, ty: 0.06, rz: 0.35 })
  const wing2 = (q) => op.at(q, SDF.ellipsoid([0.16, 0.03, 0.09]), { tx: 0.08, ty: -0.06, rz: -0.35 })
  return (p) => {
    const d1 = wing(p)
    const d2 = wing2(p)
    const m = op.union(d1, d2)
    // taper toward the wing tips
    const tip = (q) => op.at(q, SDF.sphere(0.045), { tx: 0.24, ty: 0.1 })
    return op.smoothUnion(m, tip(p), 0.02)
  }
}

/* ---------- ginger root: 3 knuckly fingers ---------- */
export function gingerField() {
  const main = capsuleSweep(
    [
      [-0.32, 0.0, 0.0],
      [-0.1, 0.04, 0.02],
      [0.1, -0.02, -0.02],
      [0.3, 0.0, 0.02]
    ],
    [0.09, 0.11, 0.09, 0.05],
    0.04
  )
  const f2 = capsuleSweep(
    [[-0.05, 0.0, 0.0], [0.0, 0.16, 0.06], [0.06, 0.28, 0.1]],
    [0.08, 0.07, 0.03],
    0.04
  )
  const f3 = capsuleSweep(
    [[0.02, 0.0, 0.03], [0.12, 0.08, -0.12], [0.2, 0.14, -0.2]],
    [0.07, 0.06, 0.028],
    0.04
  )
  return (p) => {
    let d = main(p)
    d = op.smoothUnion(d, f2(p), 0.05)
    d = op.smoothUnion(d, f3(p), 0.05)
    d += nz(231, 0.014, 3.6)(p)
    return d
  }
}

/* ---------- garlic bulb ---------- */
export function garlicBulbField() {
  return (p) => {
    let d = SDF.ellipsoid([0.15, 0.2, 0.15])(p)
    // soften the base + add 6 shallow clove grooves
    const base = (q) => op.at(q, SDF.sphere(0.13), { ty: -0.12 })
    d = op.smoothUnion(d, base(p), 0.04)
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2
      const rx = Math.cos(a) * 0.145
      const rz = Math.sin(a) * 0.145
      const groove = SDF.capsule([rx, -0.18, rz], [rx * 0.55, 0.2, rz * 0.55], 0.022)(p)
      d = op.smoothSubtract(d, groove, 0.02)
    }
    d += nz(241, 0.01, 3.0)(p)
    return d
  }
}

export function garlicSproutField() {
  const sprout = capsuleSweep([[0, 0.16, 0], [0, 0.3, 0.01]], [0.035, 0.012], 0.02)
  return (p) => sprout(p)
}

/* ---------- turmeric root: curved, knuckly, pointy ---------- */
export function turmericField() {
  const root = capsuleSweep(
    [
      [-0.3, 0.02, 0.0],
      [-0.12, 0.1, 0.03],
      [0.06, 0.02, -0.02],
      [0.2, -0.1, 0.0],
      [0.32, -0.03, 0.02]
    ],
    [0.05, 0.075, 0.085, 0.06, 0.02],
    0.04
  )
  const side = capsuleSweep([[0.0, 0.05, 0.02], [0.0, 0.2, 0.06], [0.03, 0.3, 0.08]], [0.055, 0.045, 0.02], 0.04)
  return (p) => {
    let d = root(p)
    d = op.smoothUnion(d, side(p), 0.05)
    d += nz(251, 0.012, 3.4)(p)
    return d
  }
}

export const INGREDIENT_PARTS = {
  pomegranate: [
    { part: 'rind', field: pomRindField, res: 84 },
    { part: 'flesh', field: pomFleshField, res: 68 }
  ],
  leaf: [
    { part: 'main', field: () => leafField(1), res: 52 }
  ],
  'date-seed': [
    { part: 'main', field: datePitField, res: 52 }
  ],
  bee: [
    { part: 'body', field: beeBodyField, res: 56 },
    { part: 'wings', field: beeWingField, res: 40 }
  ],
  ginger: [
    { part: 'main', field: gingerField, res: 56 }
  ],
  garlic: [
    { part: 'bulb', field: garlicBulbField, res: 56 },
    { part: 'sprout', field: garlicSproutField, res: 32 }
  ],
  turmeric: [
    { part: 'main', field: turmericField, res: 56 }
  ]
}
