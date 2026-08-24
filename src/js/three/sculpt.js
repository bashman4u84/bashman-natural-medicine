import * as THREE from 'three'

/* ============================================================
 * sculpt.js — a miniature sculpting engine.
 *
 * Organs are defined as smooth-blended SDF fields (signed
 * distance functions) and meshed with crack-free Marching
 * Tetrahedra on a regular grid, then Laplacian-smoothed and
 * re-normalised with the ANALYTIC gradient of the field (true
 * smooth shading — no faceting). Vertices get box-projected
 * UVs, which are seam-free for the isotropic procedural
 * textures in tissues.js.
 *
 * Shapes live in "organ space", roughly within [-1.35, 1.35],
 * so page code and hotspot coordinates stay stable.
 * ============================================================ */

const V = {
  sub: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]],
  add: (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]],
  dot: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
  scale: (a, s) => [a[0] * s, a[1] * s, a[2] * s],
  len: (a) => Math.hypot(a[0], a[1], a[2])
}

/* ---------- deterministic PRNG ---------- */
export function mulberry32(seed) {
  let a = seed >>> 0
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/* ---------- periodic value noise (wraps on all 3 axes, in [-1,1]) ---------- */
export function makeNoise(seed, n = 8) {
  const rand = mulberry32(seed)
  const grid = new Float32Array(n * n * n)
  for (let i = 0; i < grid.length; i++) grid[i] = rand() * 2 - 1
  const wrap = (i) => ((i % n) + n) % n
  const fade = (t) => t * t * (3 - 2 * t)
  const lerp = (a, b, t) => a + (b - a) * t
  return (x, y, z) => {
    const fx = x * n, fy = y * n, fz = z * n
    const x0 = Math.floor(fx), y0 = Math.floor(fy), z0 = Math.floor(fz)
    const u = fade(fx - x0), v = fade(fy - y0), w = fade(fz - z0)
    const at = (i, j, k) => grid[wrap(i) + wrap(j) * n + wrap(k) * n * n]
    const c000 = at(x0, y0, z0), c100 = at(x0 + 1, y0, z0)
    const c010 = at(x0, y0 + 1, z0), c110 = at(x0 + 1, y0 + 1, z0)
    const c001 = at(x0, y0, z0 + 1), c101 = at(x0 + 1, y0, z0 + 1)
    const c011 = at(x0, y0 + 1, z0 + 1), c111 = at(x0 + 1, y0 + 1, z0 + 1)
    return lerp(
      lerp(lerp(c000, c100, u), lerp(c010, c110, u), v),
      lerp(lerp(c001, c101, u), lerp(c011, c111, u), v),
      w
    )
  }
}

export function fbm(noise, x, y, z, octaves = 3) {
  let sum = 0, amp = 0.5, freq = 1, norm = 0
  for (let i = 0; i < octaves; i++) {
    sum += noise(x * freq, y * freq, z * freq) * amp
    norm += amp
    amp *= 0.5
    freq *= 2.01
  }
  return sum / norm
}

/* ---------- SDF primitives (signed distance, negative inside) ----------
 * Curried factories so they can ride through op.at(p, shape, t):
 *   sphere(r)          -> (p) => d
 *   ellipsoid([rx,ry,rz]) -> (p) => d
 *   capsule([a], [b], r)  -> (p) => d
 *   cone([a], [b], ra, rb)-> (p) => d
 *   roundBox([bx,by,bz], r)-> (p) => d
 *   torus(R, r)        -> (p) => d
 */
export const SDF = {
  sphere: (r) => (p) => Math.hypot(p[0], p[1], p[2]) - r,

  ellipsoid: (r) => (p) => {
    const k0 = Math.hypot(p[0] / r[0], p[1] / r[1], p[2] / r[2])
    const k1 = Math.hypot(p[0] / (r[0] * r[0]), p[1] / (r[1] * r[1]), p[2] / (r[2] * r[2]))
    // iq's approximation degenerates to ~0 at the center (spurious iso
    // shells inside the volume) — clamp the interior so it stays negative.
    const d = (k0 * (k0 - 1)) / k1
    const rmin = Math.min(r[0], r[1], r[2]) * 0.6
    return Math.max(d, -rmin)
  },

  capsule: (a, b, r) => (p) => {
    const ab = V.sub(b, a)
    const t = Math.max(0, Math.min(1, V.dot(V.sub(p, a), ab) / V.dot(ab, ab)))
    return V.len(V.sub(p, V.add(a, V.scale(ab, t)))) - r
  },

  /* iq's capped cone */
  cone: (a, b, ra, rb) => (p) => {
    const ba = V.sub(b, a)
    const l2 = V.dot(ba, ba)
    const rr = ra - rb
    const a2 = l2 - rr * rr
    const il2 = 1 / l2
    const pa = V.sub(p, a)
    const y = V.dot(pa, ba)
    const z = y - l2
    const pa2 = V.scale(pa, l2)
    const bay = V.scale(ba, y)
    const x2 = V.dot(V.sub(pa2, bay), V.sub(pa2, bay))
    const y2 = y * y * l2
    const z2 = z * z * l2
    const k = Math.sign(rr) * rr * rr * x2
    if (Math.sign(z) * a2 * z2 > k) return Math.sqrt(x2 + z2) * il2 - rb
    if (Math.sign(y) * a2 * y2 < k) return Math.sqrt(x2 + y2) * il2 - ra
    return (Math.sqrt((x2 * a2) * il2) + y * rr) * il2 - ra
  },

  roundBox: (b, r) => (p) => {
    const qx = Math.abs(p[0]) - b[0] + r
    const qy = Math.abs(p[1]) - b[1] + r
    const qz = Math.abs(p[2]) - b[2] + r
    const ox = Math.max(qx, 0), oy = Math.max(qy, 0), oz = Math.max(qz, 0)
    return Math.hypot(ox, oy, oz) + Math.min(Math.max(qx, Math.max(qy, qz)), 0) - r
  },

  torus: (R, r) => (p) => {
    const q = Math.hypot(p[0], p[2]) - R
    return Math.hypot(q, p[1]) - r
  }
}

/* ---------- SDF operators ---------- */
export const op = {
  union: (a, b) => Math.min(a, b),
  subtract: (a, b) => Math.max(a, -b),
  intersect: (a, b) => Math.max(a, b),

  smoothUnion(a, b, k) {
    /* iq polynomial smin */
    const h = Math.min(Math.max(0.5 + (0.5 * (b - a)) / k, 0), 1)
    return b * (1 - h) + a * h - k * h * (1 - h)
  },

  smoothSubtract(a, b, k) {
    /* iq: removes shape b from a with a C1 blend */
    const h = Math.min(Math.max(0.5 - (0.5 * (b + a)) / k, 0), 1)
    return a * (1 - h) - b * h + k * h * (1 - h)
  },

  /* evaluate shape(coord) at p transformed by t {tx,ty,tz,rx,ry,rz,s,sx,sy,sz} */
  at(p, shape, t) {
    let x = p[0], y = p[1], z = p[2]
    if (t.tx || t.ty || t.tz) { x -= t.tx || 0; y -= t.ty || 0; z -= t.tz || 0 }
    if (t.ry) {
      const c = Math.cos(t.ry), s = Math.sin(t.ry)
      const nx = x * c + z * s
      z = -x * s + z * c
      x = nx
    }
    if (t.rx) {
      const c = Math.cos(t.rx), s = Math.sin(t.rx)
      const ny = y * c - z * s
      z = y * s + z * c
      y = ny
    }
    if (t.rz) {
      const c = Math.cos(t.rz), s = Math.sin(t.rz)
      const nx = x * c - y * s
      y = x * s + y * c
      x = nx
    }
    if (t.sx || t.sy || t.sz || t.s) {
      const sx = t.sx ?? t.s ?? 1
      const sy = t.sy ?? t.s ?? 1
      const sz = t.sz ?? t.s ?? 1
      x /= sx; y /= sy; z /= sz
    }
    return shape([x, y, z])
  }
}

/* ---------- smooth tube sweep along a polyline ----------
 * J-shaped stomach, pancreas and intestines come out as one
 * clean organic surface from (b)endpoints and (r)adii per point.
 */
export function capsuleSweep(points, radii, smoothK = 0.05) {
  const segs = []
  for (let i = 0; i < points.length - 1; i++) {
    segs.push({ a: points[i], b: points[i + 1], ra: radii[i], rb: radii[i + 1] })
  }
  return (p) => {
    let d = SDF.cone(segs[0].a, segs[0].b, segs[0].ra, segs[0].rb)(p)
    for (let i = 1; i < segs.length; i++) {
      const s = segs[i]
      d = op.smoothUnion(d, SDF.cone(s.a, s.b, s.ra, s.rb)(p), smoothK)
    }
    return d
  }
}

/* ============================================================
 * MESHING — Smooth Surface Nets (dual contouring-lite)
 *
 * One vertex per cell the surface passes through (placed at the
 * centroid of the edge crossings) and one quad per crossed grid
 * edge (the four cells around it). Watertight and crack-free by
 * construction, no lookup tables, fewer triangles than marching
 * cubes, and the off-grid vertex placement reads as "sculpted".
 * ============================================================ */

const CORNERS = [
  [0, 0, 0], [1, 0, 0], [1, 1, 0], [0, 1, 0],
  [0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]
]

const GRID_EDGES12 = [
  [0, 1], [1, 2], [2, 3], [3, 0],
  [4, 5], [5, 6], [6, 7], [7, 4],
  [0, 4], [1, 5], [2, 6], [3, 7]
]

export function marchField(field, { min, max, res = 88, iso = 0.012 } = {}) {
  const nx = res + 1, ny = res + 1, nz = res + 1
  const dx = (max[0] - min[0]) / res
  const dy = (max[1] - min[1]) / res
  const dz = (max[2] - min[2]) / res
  const NXY = nx * ny
  const vals = new Float32Array(nx * ny * nz)
  for (let k = 0; k < nz; k++) {
    const z = min[2] + k * dz
    for (let j = 0; j < ny; j++) {
      const y = min[1] + j * dy
      const o = (k * ny + j) * nx
      for (let i = 0; i < nx; i++) vals[o + i] = field(min[0] + i * dx, y, z)
    }
  }
  const inside = (i, j, k) => vals[k * NXY + j * nx + i] < iso

  const CO = [0, 1, nx + 1, nx, NXY, NXY + 1, NXY + nx + 1, NXY + nx]

  /* dual vertices: one per surface cell */
  const cellCount = res * res * res
  const cellV = new Int32Array(cellCount).fill(-1)
  const vpos = []
  const cellIsSurface = new Uint8Array(cellCount)

  for (let k = 0; k < res; k++) {
    for (let j = 0; j < res; j++) {
      for (let i = 0; i < res; i++) {
        const base = k * NXY + j * nx + i
        let mask = 0
        if (vals[base + CO[0]] < iso) mask |= 1
        if (vals[base + CO[1]] < iso) mask |= 2
        if (vals[base + CO[2]] < iso) mask |= 4
        if (vals[base + CO[3]] < iso) mask |= 8
        if (vals[base + CO[4]] < iso) mask |= 16
        if (vals[base + CO[5]] < iso) mask |= 32
        if (vals[base + CO[6]] < iso) mask |= 64
        if (vals[base + CO[7]] < iso) mask |= 128
        if (mask === 0 || mask === 255) continue
        const cid = (k * res + j) * res + i
        cellIsSurface[cid] = 1

        /* average of the edge crossings — the dual vertex position */
        let ax = 0, ay = 0, az = 0, cnt = 0
        for (let e = 0; e < 12; e++) {
          const cAi = GRID_EDGES12[e][0]
          const cBi = GRID_EDGES12[e][1]
          const cA = CORNERS[cAi]
          const cB = CORNERS[cBi]
          const vA = vals[base + CO[cAi]]
          const vB = vals[base + CO[cBi]]
          if ((vA < iso) === (vB < iso)) continue
          const t = (vA - iso) / (vA - vB)
          ax += i + cA[0] + (cB[0] - cA[0]) * t
          ay += j + cA[1] + (cB[1] - cA[1]) * t
          az += k + cA[2] + (cB[2] - cA[2]) * t
          cnt++
        }
        if (cnt === 0) continue
        const inv = 1 / cnt
        cellV[cid] = vpos.length / 3
        vpos.push(
          min[0] + ax * inv * dx,
          min[1] + ay * inv * dy,
          min[2] + az * inv * dz
        )
      }
    }
  }

  /* quads: one per crossed primal grid edge (4 surrounding cells) */
  const tris = []
  const pushQuad = (c0, c1, c2, c3) => {
    const a = cellV[c0], b = cellV[c1], c = cellV[c2], d = cellV[c3]
    if (a < 0 || b < 0 || c < 0 || d < 0) return
    tris.push(a, b, c, a, c, d)
  }
  for (let k = 0; k <= res; k++) {
    for (let j = 0; j <= res; j++) {
      for (let i = 0; i <= res; i++) {
        const v0 = vals[k * NXY + j * nx + i]
        // +x edge
        if (i < res) {
          const vx = vals[k * NXY + j * nx + i + 1]
          if ((v0 < iso) !== (vx < iso)) {
            if (j > 0 && k > 0 && j < res && k < res) {
              const cid = (i, jj, kk) => (kk * res + jj) * res + i
              pushQuad(cid(i, j - 1, k - 1), cid(i, j - 1, k), cid(i, j, k), cid(i, j, k - 1))
            }
          }
        }
        // +y edge
        if (j < res) {
          const vy = vals[(k * NXY) + (j + 1) * nx + i]
          if ((v0 < iso) !== (vy < iso)) {
            if (i > 0 && k > 0 && i < res && k < res) {
              const cid = (ii, jj, kk) => (kk * res + jj) * res + ii
              pushQuad(cid(i - 1, j, k - 1), cid(i, j, k - 1), cid(i, j, k), cid(i - 1, j, k))
            }
          }
        }
        // +z edge
        if (k < res) {
          const vz = vals[(k + 1) * NXY + j * nx + i]
          if ((v0 < iso) !== (vz < iso)) {
            if (i > 0 && j > 0 && i < res && j < res) {
              const cid = (ii, jj, kk) => (kk * res + jj) * res + ii
              pushQuad(cid(i - 1, j - 1, k), cid(i, j - 1, k), cid(i, j, k), cid(i - 1, j, k))
            }
          }
        }
      }
    }
  }

  return {
    positions: new Float32Array(vpos),
    indices: new Uint32Array(tris),
    dx, dy, dz
  }
}

/* ---------- Laplacian smoothing over indexed triangles ---------- */
export function smoothMesh(positions, indices, iterations = 2, lambda = 0.5) {
  if (iterations <= 0) return positions
  let pos = positions
  const vCount = positions.length / 3

  // CSR adjacency over unique undirected edges
  const deg = new Uint32Array(vCount)
  const edgeSeen = new Set()
  const triCount = indices.length / 3
  for (let t = 0; t < triCount; t++) {
    const a = indices[t * 3], b = indices[t * 3 + 1], c = indices[t * 3 + 2]
    // count unique edges per vertex (approx: dedupe via set for correctness)
    const u = [a, b, c]
    for (let e = 0; e < 3; e++) {
      const x = u[e], y = u[(e + 1) % 3]
      const key = x < y ? x * 131072 + y : y * 131072 + x
      if (edgeSeen.has(key)) continue
      edgeSeen.add(key)
      deg[x]++; deg[y]++
    }
  }
  const adj = new Uint32Array(vCount + 1)
  for (let i = 0; i < vCount; i++) adj[i + 1] = adj[i] + deg[i]
  const nbr = new Uint32Array(adj[vCount])
  const cursor = adj.slice(0, vCount)
  for (let t = 0; t < triCount; t++) {
    const a = indices[t * 3], b = indices[t * 3 + 1], c = indices[t * 3 + 2]
    const u = [a, b, c]
    for (let e = 0; e < 3; e++) {
      const x = u[e], y = u[(e + 1) % 3]
      const key = x < y ? x * 131072 + y : y * 131072 + x
      if (!edgeSeen.has(key)) continue
      edgeSeen.delete(key)
      nbr[cursor[x]++] = y
      nbr[cursor[y]++] = x
    }
  }

  for (let it = 0; it < iterations; it++) {
    const next = new Float32Array(pos.length)
    for (let i = 0; i < vCount; i++) {
      const s = adj[i], e = adj[i + 1]
      const nbCount = e - s
      if (nbCount === 0) {
        next[i * 3] = pos[i * 3]; next[i * 3 + 1] = pos[i * 3 + 1]; next[i * 3 + 2] = pos[i * 3 + 2]
        continue
      }
      let ax = 0, ay = 0, az = 0
      for (let j = s; j < e; j++) {
        const o = nbr[j] * 3
        ax += pos[o]; ay += pos[o + 1]; az += pos[o + 2]
      }
      const inv = lambda / nbCount
      const keep = 1 - lambda
      next[i * 3] = pos[i * 3] * keep + ax * inv
      next[i * 3 + 1] = pos[i * 3 + 1] * keep + ay * inv
      next[i * 3 + 2] = pos[i * 3 + 2] * keep + az * inv
    }
    pos = next
  }
  return pos
}

/* ---------- gradient of the field at p (central differences) ---------- */
export function gradField(field, p, h = 0.004) {
  const [x, y, z] = p
  const gx = field(x + h, y, z) - field(x - h, y, z)
  const gy = field(x, y + h, z) - field(x, y - h, z)
  const gz = field(x, y, z + h) - field(x, y, z - h)
  const l = Math.hypot(gx, gy, gz) || 1
  return [gx / l, gy / l, gz / l]
}

/* ---------- full pipeline: field -> THREE.BufferGeometry ----------
 * Returns a clean indexed geometry with smooth analytic normals,
 * winding corrected against the field gradient and box-projected
 * UVs (safe for the isotropic textures in tissues.js).
 */
export function sculptField(field, { min, max, res = 88, iso = 0.012, smoothIters = 2, smoothLambda = 0.5 } = {}) {
  const { positions: rawPos, indices, dx } = marchField(field, { min, max, res, iso })
  const vCount = rawPos.length / 3
  if (!vCount) return new THREE.BufferGeometry()

  const pos = smoothMesh(rawPos, indices, smoothIters, smoothLambda)

  // analytic normals
  const normals = new Float32Array(vCount * 3)
  for (let i = 0; i < vCount; i++) {
    const p = [pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]]
    const g = gradField(field, p, Math.max(dx * 0.35, 0.002))
    normals[i * 3] = g[0]; normals[i * 3 + 1] = g[1]; normals[i * 3 + 2] = g[2]
  }

  // fix winding against normals; also drop degenerate triangles
  const outIdx = []
  const AB = [0, 0, 0], AC = [0, 0, 0], N = [0, 0, 0]
  for (let t = 0; t < indices.length; t += 3) {
    const ia = indices[t], ib = indices[t + 1], ic = indices[t + 2]
    const a = ia * 3, b = ib * 3, c = ic * 3
    AB[0] = pos[b] - pos[a]; AB[1] = pos[b + 1] - pos[a + 1]; AB[2] = pos[b + 2] - pos[a + 2]
    AC[0] = pos[c] - pos[a]; AC[1] = pos[c + 1] - pos[a + 1]; AC[2] = pos[c + 2] - pos[a + 2]
    N[0] = AB[1] * AC[2] - AB[2] * AC[1]
    N[1] = AB[2] * AC[0] - AB[0] * AC[2]
    N[2] = AB[0] * AC[1] - AB[1] * AC[0]
    if (N[0] * N[0] + N[1] * N[1] + N[2] * N[2] < 1e-12) continue
    const d =
      N[0] * (normals[a] + normals[b] + normals[c]) +
      N[1] * (normals[a + 1] + normals[b + 1] + normals[c + 1]) +
      N[2] * (normals[a + 2] + normals[b + 2] + normals[c + 2])
    if (d < 0) outIdx.push(ib, ia, ic)
    else outIdx.push(ia, ib, ic)
  }

  // box-projected UVs from normals
  const uvs = new Float32Array(vCount * 2)
  const S = 1 / 2.4
  for (let i = 0; i < vCount; i++) {
    const nX = Math.abs(normals[i * 3]), nY = Math.abs(normals[i * 3 + 1]), nZ = Math.abs(normals[i * 3 + 2])
    if (nX >= nY && nX >= nZ) {
      uvs[i * 2] = pos[i * 3 + 1] * S
      uvs[i * 2 + 1] = pos[i * 3 + 2] * S
    } else if (nY >= nX && nY >= nZ) {
      uvs[i * 2] = pos[i * 3] * S
      uvs[i * 2 + 1] = pos[i * 3 + 2] * S
    } else {
      uvs[i * 2] = pos[i * 3] * S
      uvs[i * 2 + 1] = pos[i * 3 + 1] * S
    }
  }

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  geo.setAttribute('normal', new THREE.BufferAttribute(normals, 3))
  geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2))
  geo.setIndex(new THREE.BufferAttribute(new Uint32Array(outIdx), 1))
  geo.computeBoundingSphere()
  return geo
}

/* ---------- convenience: geometry from a group of field builders ----------
 * `shapes` = array of (x,y,z)->d functions, combined with op.smoothUnion... —
 * pages usually compose their own field; this helper only scales/offsets
 * and recenters a finished geometry to a target radius.
 */
export function fitGeometry(geo, targetRadius = 1.25) {
  geo.computeBoundingSphere()
  const c = geo.boundingSphere.center
  const r = geo.boundingSphere.radius || 1
  const s = targetRadius / r
  const posAttr = geo.getAttribute('position')
  for (let i = 0; i < posAttr.count; i++) {
    posAttr.setXYZ(
      i,
      (posAttr.getX(i) - c.x) * s,
      (posAttr.getY(i) - c.y) * s,
      (posAttr.getZ(i) - c.z) * s
    )
  }
  posAttr.needsUpdate = true
  geo.computeBoundingSphere()
  geo.computeBoundingBox()
  return s
}
