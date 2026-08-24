import * as THREE from 'three'

/* ============================================================
 * models.js — runtime loader for the BAKE-TIME generated mesh
 * chunks in ./organ-data/*.js (one tiny chunk per model part,
 * quantized int16 geometry). Vite code-splits each chunk and
 * the host serves them gzip-compressed; parsing one takes a
 * few milliseconds instead of 1-3 s of runtime sculpting.
 * ============================================================ */

const partCache = new Map() // 'key/part' -> Promise<BufferGeometry>
const chunkCache = new Map() // 'key/part' -> Promise<part data>

function toBytes(s) {
  const bin = atob(s)
  const u = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i)
  return u
}

function decodeData(data) {
  const posRaw = new Int16Array(toBytes(data.positions).buffer)
  const norRaw = new Int8Array(toBytes(data.normals).buffer)
  const uvRaw = new Uint16Array(toBytes(data.uvs).buffer)
  const idxRaw = new Uint32Array(toBytes(data.indices).buffer)
  const verts = posRaw.length / 3

  const positions = new Float32Array(verts * 3)
  for (let i = 0; i < verts; i++) {
    for (let a = 0; a < 3; a++) {
      const q = posRaw[i * 3 + a] / 65535 + 0.5
      positions[i * 3 + a] = q * data.scale[a] + data.offset[a]
    }
  }
  const normals = new Float32Array(verts * 3)
  for (let i = 0; i < verts * 3; i++) normals[i] = norRaw[i] / 127
  const uvs = new Float32Array(verts * 2)
  for (let i = 0; i < verts * 2; i++) uvs[i] = uvRaw[i] / 65535

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geo.setAttribute('normal', new THREE.BufferAttribute(normals, 3))
  geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2))
  geo.setIndex(new THREE.BufferAttribute(idxRaw, 1))
  geo.computeBoundingSphere()
  return geo
}

export function loadGeometry(key, part = 'main') {
  const id = key + '-' + part
  if (!partCache.has(id)) {
    const p = import(`./organ-data/${id}.js`)
      .then((m) => m.DATA)
      .then(decodeData)
    partCache.set(id, p)
  }
  return partCache.get(id)
}
