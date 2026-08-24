/* ============================================================
 * tools/bake.mjs — bakes every 3D asset to a lazy-loaded data
 * chunk (src/js/three/organ-data/*.js). The browser only ever
 * parses base64 Float32 buffers — all sculpting happens here.
 *
 *   npm run bake
 * ============================================================ */
import { sculptField } from '../src/js/three/sculpt.js'
import { ORGAN_FIELDS } from '../src/js/three/organ-fields.js'
import { INGREDIENT_PARTS, dateField } from '../src/js/three/ingredient-fields.js'
import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { mkdirSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'js', 'three', 'organ-data')
mkdirSync(OUT, { recursive: true })

const b64 = (buf) => Buffer.from(buf).toString('base64')

/* quantized encoding:
 *  positions int16 (3 axes, per-axis offset+scale), normals int8,
 *  uvs u16, indices u32 — ~13 bytes/vertex instead of 28.
 * (header values travel alongside the base64 fields) */
function geomToData(geo) {
  const p = geo.getAttribute('position').array
  const n = geo.getAttribute('normal').array
  const u = geo.getAttribute('uv').array
  const idx = geo.getIndex().array
  const vCount = p.length / 3

  // bbox per axis
  const mn = [-1e9, -1e9, -1e9]
  const mx = [-1e9, -1e9, -1e9]
  for (let i = 0; i < vCount; i++) {
    for (let a = 0; a < 3; a++) {
      const v = p[i * 3 + a]
      if (v < mn[a]) mn[a] = v
      if (v > mx[a]) mx[a] = v
    }
  }
  const posQ = new Int16Array(vCount * 3)
  for (let i = 0; i < vCount; i++) {
    for (let a = 0; a < 3; a++) {
      const span = Math.max(mx[a] - mn[a], 1e-6)
      posQ[i * 3 + a] = Math.round(((p[i * 3 + a] - mn[a]) / span) * 65535 - 32768)
    }
  }
  const norQ = new Int8Array(vCount * 3)
  for (let i = 0; i < vCount * 3; i++) {
    norQ[i] = Math.round(Math.max(-1, Math.min(1, n[i])) * 127)
  }
  const uvQ = new Uint16Array(vCount * 2)
  for (let i = 0; i < vCount * 2; i++) {
    const v = u[i] - Math.floor(u[i])
    uvQ[i] = Math.round(v * 65535)
  }
  return {
    positions: b64(Buffer.from(posQ.buffer)),
    normals: b64(Buffer.from(norQ.buffer)),
    uvs: b64(Buffer.from(uvQ.buffer)),
    indices: b64(Buffer.from(idx.buffer)),
    scale: mx.map((v, a) => +(v - mn[a]).toFixed(6)),
    offset: mn.map((v) => +v.toFixed(6))
  }
}

function bakeField(fieldFn, { min, max, res }) {
  const geo = sculptField((x, y, z) => fieldFn()([x, y, z]), { min, max, res, iso: 0.012 })
  if (!geo.getIndex() || geo.getIndex().count === 0) throw new Error('empty geometry')
  return geomToData(geo)
}

const T0 = performance.now()
const manifest = {}

/* ---------- organs ---------- */
for (const [key, def] of Object.entries(ORGAN_FIELDS)) {
  const data = bakeField(def.field, {
    min: [-1.6, -1.6, -1.6], max: [1.6, 1.6, 1.6], res: def.res
  })
  writeModule(key, { main: data })
  manifest[key] = { parts: ['main'], size: estimate(data) }
  console.log('baked organ', key)
}

/* ---------- pomegranate (hero star) ---------- */
const POM_PARTS = { rind: INGREDIENT_PARTS.pomegranate.find((p) => p.part === 'rind'), flesh: INGREDIENT_PARTS.pomegranate.find((p) => p.part === 'flesh') }
const pomRind = bakeField(POM_PARTS.rind.field, {
  min: [-1.4, -1.4, -1.4], max: [1.4, 1.4, 1.4], res: POM_PARTS.rind.res
})
// bake the calyx crown (6 sepals) into the rind buffer
const crownGeos = []
for (let i = 0; i < 6; i++) {
  const a = (i / 6) * Math.PI * 2 + 0.3
  const base = new THREE.Vector3(Math.cos(a) * 0.13, 0.92, Math.sin(a) * 0.13)
  const tipPos = new THREE.Vector3(Math.cos(a) * 0.3, 1.24, Math.sin(a) * 0.3)
  const spike = new THREE.TubeGeometry(
    new THREE.QuadraticBezierCurve3(
      base,
      base.clone().add(new THREE.Vector3(Math.cos(a) * 0.06, 0.14, Math.sin(a) * 0.06)),
      tipPos
    ),
    8, 0.045, 8
  )
  spike.translate(0, 0, 0)
  crownGeos.push(spike)
}
let crownMerged = mergeGeometries(crownGeos)
crownMerged.translate(0, 0, 0)
// crown + rind in one buffer
const rindGeo = new THREE.BufferGeometry()
rindGeo.setAttribute('position', new THREE.BufferAttribute(recover(pomRind.positions), 3))
rindGeo.setAttribute('normal', new THREE.BufferAttribute(recover(pomRind.normals), 3))
rindGeo.setAttribute('uv', new THREE.BufferAttribute(recover(pomRind.uvs), 2))
rindGeo.setIndex(new THREE.BufferAttribute(recoverI(pomRind.indices), 1))
const rindAll = mergeGeometries([rindGeo, crownMerged], false)
writeModule('pomegranate', {
  rind: geomToData(rindAll),
  flesh: bakeField(POM_PARTS.flesh.field, {
    min: [-1.2, -1.2, -1.2], max: [1.2, 1.2, 1.2], res: POM_PARTS.flesh.res
  }),
  arils: bakeArils()
})
manifest.pomegranate = { parts: ['rind', 'flesh', 'arils'], size: 3 }

function recover(s) {
  const bin = Buffer.from(s, 'base64')
  return new Float32Array(bin.buffer, bin.byteOffset, bin.byteLength / 4)
}
function recoverI(s) {
  const bin = Buffer.from(s, 'base64')
  return new Uint32Array(bin.buffer, bin.byteOffset, bin.byteLength / 4)
}

/* arils: merged rubies hugging the flesh dome */
function bakeArils() {
  const parts = []
  const cutAxis = new THREE.Vector3(0, Math.cos(0.75), Math.sin(0.75)).normalize()
  const right = new THREE.Vector3(1, 0, 0)
  const up = new THREE.Vector3().crossVectors(cutAxis, right).normalize()
  const domeC = new THREE.Vector3(0, -0.24, 0)
  const domeR = 0.6
  let seedI = 987654321
  const rand = () => {
    seedI = (seedI * 16807) % 2147483647
    return seedI / 2147483647
  }
  for (let i = 0; i < 74; i++) {
    const a = rand() * Math.PI * 2
    const capAng = Math.acos(1 - rand() * 0.55)
    const dir = cutAxis
      .clone()
      .multiplyScalar(Math.cos(capAng))
      .addScaledVector(right, Math.sin(capAng) * Math.cos(a))
      .addScaledVector(up, Math.sin(capAng) * Math.sin(a))
      .normalize()
    const p = domeC.clone().addScaledVector(dir, domeR + 0.015)
    const sc = 0.75 + rand() * 0.7
    const g = new THREE.SphereGeometry(0.052, 8, 6)
    g.scale(sc * 0.92, sc, sc * 0.92)
    g.translate(p.x, p.y, p.z)
    parts.push(g)
  }
  const merged = mergeGeometries(parts)
  return geomToData(merged)
}

/* ---------- remaining ingredients ---------- */
const ingredientParts = {
  date: [{ part: 'main', field: dateField, res: 56, box: 0.55 }],
  ...INGREDIENT_PARTS
}
delete ingredientParts.pomegranate
ingredientParts['date-seed'] = INGREDIENT_PARTS['date-seed']
for (const [key, entries] of Object.entries(ingredientParts)) {
  const parts = {}
  for (const e of entries) {
    const box = e.box || 0.55
    parts[e.part] = bakeField(e.field, { min: [-box, -box, -box], max: [box, box, box], res: e.res })
  }
  writeModule(key, parts)
  manifest[key] = { parts: Object.keys(parts), size: Object.values(parts).reduce((s, d) => s + estimate(d), 0) }
  console.log('baked', key)
}

/* honey (honeycomb + drip) — direct geometry */
function honeyGeoms() {
  const cells = []
  const R = 0.21
  for (let qx = -1; qx <= 1; qx++) {
    for (let qy = -1; qy <= 1; qy++) {
      const x = qx * R * 1.76 + (qy % 2 ? R * 0.88 : 0)
      const y = qy * R * 1.53
      if (Math.hypot(x, y) > R * 2.1) continue
      const hex = new THREE.CylinderGeometry(R * 0.8, R * 0.8, 0.12, 6)
      hex.rotateZ(Math.PI / 6)
      hex.translate(x, y, 0)
      cells.push(hex)
    }
  }
  // a drip under one cell
  const drip = new THREE.CapsuleGeometry(R * 0.16, R * 0.5, 4, 8)
  drip.translate(0, -R * 1.35, 0)
  const bead = new THREE.SphereGeometry(R * 0.13, 8, 6)
  bead.translate(0, -R * 1.9, 0)
  return mergeGeometries([...cells, drip, bead])
}
writeModule('honey', { main: geomToData(honeyGeoms()) })
manifest.honey = { parts: ['main'], size: 1 }
console.log('baked honey')

function estimate(d) {
  return Math.round((d.positions.length + d.normals.length + d.uvs.length + d.indices.length) / 1024)
}
function writeDot(name, part, data) {
  const lines = ['/* AUTO-GENERATED by tools/bake.mjs — do not edit. Run `npm run bake` to regenerate. */']
  lines.push(`export const KEY = ${JSON.stringify(name)}`)
  lines.push(`export const PART = ${JSON.stringify(part)}`)
  lines.push('export const DATA = {')
  lines.push(`  positions: '${data.positions}',`)
  lines.push(`  normals: '${data.normals}',`)
  lines.push(`  uvs: '${data.uvs}',`)
  lines.push(`  indices: '${data.indices}',`)
  lines.push(`  scale: ${JSON.stringify(data.scale)},`)
  lines.push(`  offset: ${JSON.stringify(data.offset)}`)
  lines.push('}')
  writeFileSync(join(OUT, name + '-' + part + '.js'), lines.join('\n') + '\n')
}
function writeModule(name, parts) {
  for (const [part, data] of Object.entries(parts)) writeDot(name, part, data)
}
writeFileSync(join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2))
console.log('bake complete in', ((performance.now() - T0) / 1000).toFixed(1) + 's ->', OUT)
