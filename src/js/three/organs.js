import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'

function veinBump(dark = '#5f5f5f', light = '#9a9a9a') {
  const c = document.createElement('canvas')
  c.width = c.height = 256
  const ctx = c.getContext('2d')
  ctx.fillStyle = '#7d7d7d'
  ctx.fillRect(0, 0, 256, 256)
  ctx.strokeStyle = dark
  ctx.lineCap = 'round'
  const branch = (x, y, a, len, w, depth) => {
    if (depth <= 0 || len < 6) return
    const nx = x + Math.cos(a) * len
    const ny = y + Math.sin(a) * len
    ctx.lineWidth = w
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineTo(nx, ny)
    ctx.stroke()
    branch(nx, ny, a + (Math.random() - 0.5) * 0.9, len * 0.72, w * 0.65, depth - 1)
    branch(nx, ny, a - (Math.random() - 0.5) * 0.9, len * 0.66, w * 0.65, depth - 1)
  }
  for (let i = 0; i < 3; i++) branch(40 + i * 80 + Math.random() * 30, 250, -Math.PI / 2, 60, 4.2, 5)
  ctx.strokeStyle = light
  for (let i = 0; i < 2; i++) branch(90 + i * 70, 10, Math.PI / 2, 46, 2.6, 4)
  const tex = new THREE.CanvasTexture(c)
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  return tex
}

function ridgeBump() {
  const c = document.createElement('canvas')
  c.width = c.height = 256
  const ctx = c.getContext('2d')
  ctx.fillStyle = '#828282'
  ctx.fillRect(0, 0, 256, 256)
  ctx.strokeStyle = '#5c5c5c'
  ctx.lineWidth = 5
  ctx.lineCap = 'round'
  for (let y = 12; y < 256; y += 26) {
    ctx.beginPath()
    for (let x = 0; x <= 256; x += 8) {
      const yy = y + Math.sin(x * 0.05 + y) * 7 + Math.sin(x * 0.11) * 3
      x === 0 ? ctx.moveTo(x, yy) : ctx.lineTo(x, yy)
    }
    ctx.stroke()
  }
  ctx.strokeStyle = '#a5a5a5'
  ctx.lineWidth = 2.5
  for (let y = 25; y < 256; y += 26) {
    ctx.beginPath()
    for (let x = 0; x <= 256; x += 8) {
      const yy = y + 13 + Math.sin(x * 0.06 + y * 1.3) * 6
      x === 0 ? ctx.moveTo(x, yy) : ctx.lineTo(x, yy)
    }
    ctx.stroke()
  }
  const tex = new THREE.CanvasTexture(c)
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  return tex
}

function organMat({ color, roughness = 0.42, sheenColor = '#ff9d8a', bump = null, bumpScale = 0.35, clearcoat = 0.32 } = {}) {
  const mat = new THREE.MeshPhysicalMaterial({
    color,
    roughness,
    metalness: 0,
    clearcoat,
    clearcoatRoughness: 0.5,
    sheen: 0.55,
    sheenRoughness: 0.6,
    sheenColor: new THREE.Color(sheenColor),
    envMapIntensity: 0.85
  })
  if (bump) {
    mat.bumpMap = bump
    mat.bumpScale = bumpScale
  }
  return mat
}

const gauss = (x, c, s) => Math.exp(-((x - c) ** 2) / (2 * s * s))
const lerp = (a, b, t) => a + (b - a) * t

export function displace(geo, amp = 0.05, freq = 2.2, seed = 0) {
  const pos = geo.attributes.position
  const v = new THREE.Vector3()
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i)
    const n =
      Math.sin(v.x * freq * 1.9 + seed) * 0.55 +
      Math.cos(v.y * freq * 2.4 - seed * 1.7) * 0.3 +
      Math.sin(v.z * freq * 2.1 + v.x * freq + seed) * 0.35
    const len = v.length() || 1
    v.multiplyScalar(1 + (amp * n) / len * Math.min(len, 1.4))
    pos.setXYZ(i, v.x, v.y, v.z)
  }
  geo.computeVertexNormals()
  return geo
}

function sphereAt(r, segs, sx, sy, sz, x, y, z, amp, freq, seed) {
  const g = new THREE.SphereGeometry(r, segs, Math.round(segs * 0.75))
  displace(g, amp, freq, seed)
  g.scale(sx, sy, sz)
  g.translate(x, y, z)
  return g
}

export function buildLiver() {
  const group = new THREE.Group()
  const tex = veinBump('#4f4f4f', '#a8a8a8')
  tex.repeat.set(2.2, 2.2)
  const mat = organMat({ color: '#7c3b2c', roughness: 0.46, sheenColor: '#ff8a70', bump: tex, bumpScale: 0.5 })

  const body = mergeGeometries([
    sphereAt(1, 72, 0.98, 0.68, 0.74, 0.3, -0.02, 0, 0.055, 2.1, 1),
    sphereAt(0.62, 56, 0.92, 0.44, 0.52, -0.68, 0.14, 0.02, 0.07, 2.6, 2),
    sphereAt(0.24, 40, 0.95, 0.7, 0.62, -0.02, 0.24, -0.3, 0.08, 3, 3)
  ])
  const liverMesh = new THREE.Mesh(body, mat)
  liverMesh.castShadow = true
  group.add(liverMesh)

  const gbMat = new THREE.MeshPhysicalMaterial({
    color: '#4f9e57',
    roughness: 0.18,
    transmission: 0.45,
    thickness: 0.5,
    clearcoat: 0.8,
    transparent: true,
    opacity: 0.96
  })
  const gb = new THREE.Mesh(new THREE.CapsuleGeometry(0.13, 0.16, 8, 20), gbMat)
  gb.position.set(0.22, -0.4, 0.34)
  gb.rotation.set(0.3, 0, -0.55)
  gb.castShadow = true
  group.add(gb)

  group.rotation.set(-0.12, 0.45, 0.1)
  return group
}

function varyTube(curve, tubularSegments, radialSegments, radiusFn) {
  const frames = curve.computeFrenetFrames(tubularSegments, false)
  const positions = []
  const uvs = []
  const indices = []
  const P = new THREE.Vector3()
  for (let i = 0; i <= tubularSegments; i++) {
    const t = i / tubularSegments
    curve.getPointAt(t, P)
    const N = frames.normals[i]
    const B = frames.binormals[i]
    const r = radiusFn(t)
    for (let j = 0; j <= radialSegments; j++) {
      const a = (j / radialSegments) * Math.PI * 2
      const rx = r * (1 + 0.13 * Math.cos(a))
      const ry = r
      const cs = Math.cos(a)
      const sn = Math.sin(a)
      positions.push(
        P.x + (N.x * cs + B.x * sn) * rx,
        P.y + (N.y * cs + B.y * sn) * ry,
        P.z + (N.z * cs + B.z * sn) * rx
      )
      uvs.push(i / tubularSegments * 6, j / radialSegments)
    }
  }
  for (let i = 0; i < tubularSegments; i++) {
    for (let j = 0; j < radialSegments; j++) {
      const a = (radialSegments + 1) * i + j
      const b = (radialSegments + 1) * (i + 1) + j
      const c = (radialSegments + 1) * (i + 1) + j + 1
      const d = (radialSegments + 1) * i + j + 1
      indices.push(a, b, d, b, c, d)
    }
  }
  const geo = new THREE.BufferGeometry()
  geo.setIndex(indices)
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  geo.computeVertexNormals()
  return geo
}

export function buildStomach() {
  const group = new THREE.Group()
  const tex = ridgeBump()
  tex.repeat.set(2.4, 1.4)
  const mat = organMat({ color: '#b0513a', roughness: 0.4, sheenColor: '#ffb09a', bump: tex, bumpScale: 0.55, clearcoat: 0.45 })

  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.04, 1.04, -0.06),
    new THREE.Vector3(-0.34, 0.86, -0.04),
    new THREE.Vector3(-0.63, 0.5, 0.01),
    new THREE.Vector3(-0.66, 0.06, 0.07),
    new THREE.Vector3(-0.43, -0.32, 0.13),
    new THREE.Vector3(-0.03, -0.51, 0.15),
    new THREE.Vector3(0.31, -0.42, 0.08),
    new THREE.Vector3(0.47, -0.1, 0.0),
    new THREE.Vector3(0.52, 0.14, -0.07)
  ])
  const radiusFn = (t) => {
    let r = 0.3 + 0.21 * gauss(t, 0.2, 0.09) - 0.045 * gauss(t, 0.48, 0.22)
    if (t < 0.09) r *= lerp(0.42, 1, t / 0.09)
    if (t > 0.72) r *= 1 - 0.58 * ((t - 0.72) / 0.28) ** 1.35
    return r + Math.sin(t * 21) * 0.008
  }
  const mesh = new THREE.Mesh(varyTube(curve, 130, 30, radiusFn), mat)
  mesh.castShadow = true
  group.add(mesh)

  const capMat = mat.clone()
  const capTop = new THREE.Mesh(new THREE.SphereGeometry(0.115, 20, 16), capMat)
  capTop.position.set(-0.04, 1.05, -0.06)
  const capEnd = new THREE.Mesh(new THREE.SphereGeometry(0.105, 20, 16), capMat)
  capEnd.position.set(0.52, 0.15, -0.07)
  group.add(capTop, capEnd)

  group.rotation.set(0.06, -0.5, 0)
  return group
}

function beanGeo(sign) {
  const g = new THREE.SphereGeometry(1, 56, 44)
  const pos = g.attributes.position
  const v = new THREE.Vector3()
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i)
    if (v.x * sign > 0) {
      const f = gauss(v.y, 0, 0.42) * gauss(v.z, 0, 0.36)
      v.x -= v.x * f * 1.05 * sign
    }
    const n = Math.sin(v.x * 5 + sign) * Math.cos(v.y * 6 - 1) * Math.sin(v.z * 5)
    v.multiplyScalar(1 + 0.035 * n)
    pos.setXYZ(i, v.x, v.y, v.z)
  }
  g.scale(0.52, 0.8, 0.48)
  g.computeVertexNormals()
  return g
}

export function buildKidneys() {
  const group = new THREE.Group()
  const tex = veinBump('#555555', '#9f9f9f')
  tex.repeat.set(1.6, 1.6)
  const mat = organMat({ color: '#8e3d33', roughness: 0.38, sheenColor: '#ff9d85', bump: tex, bumpScale: 0.4 })

  const left = new THREE.Mesh(beanGeo(1), mat)
  left.position.set(-0.66, 0.18, -0.06)
  left.rotation.z = 0.14
  left.castShadow = true
  const right = new THREE.Mesh(beanGeo(-1), mat)
  right.position.set(0.66, 0.12, -0.06)
  right.rotation.z = -0.14
  right.castShadow = true
  group.add(left, right)

  const bladder = new THREE.Mesh(
    new THREE.SphereGeometry(1, 32, 24),
    new THREE.MeshPhysicalMaterial({ color: '#e3cf7d', roughness: 0.3, clearcoat: 0.6, transparent: true, opacity: 0.94 })
  )
  bladder.scale.set(0.42, 0.33, 0.36)
  bladder.position.set(0, -1.12, 0.22)
  group.add(bladder)

  const ureterMat = new THREE.MeshStandardMaterial({ color: '#caa46a', roughness: 0.45 })
  ;[-1, 1].forEach((s) => {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(s * 0.38, 0.02, 0.02),
      new THREE.Vector3(s * 0.34, -0.48, 0.1),
      new THREE.Vector3(s * 0.16, -0.88, 0.18),
      new THREE.Vector3(s * 0.06, -1.02, 0.2)
    ])
    const u = new THREE.Mesh(new THREE.TubeGeometry(curve, 40, 0.045, 12), ureterMat)
    group.add(u)
    const artery = new THREE.Mesh(
      new THREE.TubeGeometry(
        new THREE.CatmullRomCurve3([
          new THREE.Vector3(s * 0.12, 0.62, -0.4),
          new THREE.Vector3(s * 0.3, 0.45, -0.25),
          new THREE.Vector3(s * 0.42, 0.3, -0.12)
        ]),
        24,
        0.05,
        10
      ),
      new THREE.MeshStandardMaterial({ color: '#a63a3a', roughness: 0.4 })
    )
    group.add(artery)
  })
  return group
}

export function buildHeart() {
  const group = new THREE.Group()
  const g = new THREE.SphereGeometry(1, 64, 56)
  const pos = g.attributes.position
  const v = new THREE.Vector3()
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i)
    if (v.y < -0.3) {
      const k = Math.max(0.32, 1 - (-v.y - 0.3) * 0.78)
      v.x *= k
      v.z *= k
      v.x += -(-v.y - 0.3) * 0.14
    }
    const rxz = Math.hypot(v.x, v.z)
    if (rxz > 0.001 && v.y > 0.1) {
      const shrink = 1 - 0.09 * gauss(v.y, 0.44, 0.1)
      v.x *= shrink
      v.z *= shrink
    }
    const n = Math.sin(v.x * 4.4) * Math.cos(v.y * 5.2) * Math.sin(v.z * 4.8)
    const s = 1 + 0.03 * n
    v.multiplyScalar(s)
    pos.setXYZ(i, v.x, v.y, v.z)
  }
  g.computeVertexNormals()

  const mat = organMat({ color: '#8e3038', roughness: 0.36, sheenColor: '#ff8d80', clearcoat: 0.55 })
  const body = new THREE.Mesh(g, mat)
  body.castShadow = true
  body.rotation.z = -0.12
  group.add(body)

  const vesselMat = (color) => new THREE.MeshPhysicalMaterial({ color, roughness: 0.35, clearcoat: 0.5, sheen: 0.4 })
  const aortaCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.05, 0.42, 0.05),
    new THREE.Vector3(0.02, 0.86, 0.06),
    new THREE.Vector3(0.26, 1.08, 0.0),
    new THREE.Vector3(0.48, 0.86, -0.08),
    new THREE.Vector3(0.46, 0.5, -0.14)
  ])
  const aorta = new THREE.Mesh(new THREE.TubeGeometry(aortaCurve, 50, 0.115, 16), vesselMat('#b0474e'))
  aorta.castShadow = true

  const pulmCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.18, 0.5, 0.14),
    new THREE.Vector3(-0.34, 0.9, 0.18),
    new THREE.Vector3(-0.56, 1.0, 0.12),
    new THREE.Vector3(-0.66, 0.78, 0.05)
  ])
  const pulm = new THREE.Mesh(new THREE.TubeGeometry(pulmCurve, 40, 0.09, 14), vesselMat('#5a76a8'))

  const cavCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.4, 0.9, -0.2),
    new THREE.Vector3(0.44, 0.55, -0.22),
    new THREE.Vector3(0.4, 0.28, -0.18)
  ])
  const cav = new THREE.Mesh(new THREE.TubeGeometry(cavCurve, 30, 0.085, 12), vesselMat('#7a5a72'))
  group.add(aorta, pulm, cav)

  group.userData.tick = (t) => {
    const beat = 1 + Math.sin(t * 2.6) * 0.011 + Math.max(0, Math.sin(t * 2.6 - 0.55)) * 0.02
    body.scale.setScalar(beat)
    aorta.scale.setScalar(1 + (beat - 1) * 0.4)
  }
  group.rotation.set(0.05, 0.35, 0)
  return group
}

export function buildPancreas() {
  const group = new THREE.Group()
  const mat = organMat({ color: '#d3a05e', roughness: 0.55, sheenColor: '#ffd9a0', clearcoat: 0.15 })
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.92, 0.18, 0.16),
    new THREE.Vector3(0.5, 0.02, 0.02),
    new THREE.Vector3(0.02, -0.06, -0.08),
    new THREE.Vector3(-0.5, 0.04, 0.0),
    new THREE.Vector3(-0.92, 0.3, 0.12)
  ])
  const radiusFn = (t) => {
    let r = lerp(0.27, 0.075, t ** 1.15)
    r += Math.sin(t * 34) * 0.014
    return r
  }
  const mesh = new THREE.Mesh(varyTube(curve, 110, 26, radiusFn), mat)
  mesh.castShadow = true
  group.add(mesh)
  group.rotation.set(0.12, -0.25, 0)
  return group
}

export function buildIntestines() {
  const group = new THREE.Group()
  const colonPts = [
    new THREE.Vector3(0.6, -0.66, 0.2),
    new THREE.Vector3(0.68, -0.12, 0.14),
    new THREE.Vector3(0.64, 0.36, 0.06),
    new THREE.Vector3(0.16, 0.54, 0.0),
    new THREE.Vector3(-0.3, 0.5, -0.05),
    new THREE.Vector3(-0.64, 0.32, -0.06),
    new THREE.Vector3(-0.7, -0.18, 0.0),
    new THREE.Vector3(-0.6, -0.6, 0.06),
    new THREE.Vector3(-0.32, -0.76, 0.13),
    new THREE.Vector3(0.04, -0.8, 0.16),
    new THREE.Vector3(0.2, -1.0, 0.19)
  ]
  const colonMat = organMat({ color: '#c07a5e', roughness: 0.44, sheenColor: '#ffab90' })
  const colon = new THREE.Mesh(
    varyTube(new THREE.CatmullRomCurve3(colonPts), 170, 24, (t) => 0.155 + 0.03 * Math.abs(Math.sin(t * 42))),
    colonMat
  )
  colon.castShadow = true
  group.add(colon)

  const smallPts = []
  const rows = 4
  for (let rIdx = 0; rIdx < rows; rIdx++) {
    const y = 0.34 - rIdx * 0.27
    const zBase = rIdx % 2 === 0 ? 0.24 : 0.02
    for (let cIdx = 0; cIdx <= 4; cIdx++) {
      const t = cIdx / 4
      const x = (rIdx % 2 === 0 ? lerp(-0.42, 0.42, t) : lerp(0.42, -0.42, t)) + Math.sin(rIdx * 2.3 + cIdx) * 0.06
      smallPts.push(new THREE.Vector3(x, y + Math.sin(cIdx * 1.7 + rIdx) * 0.05, zBase + Math.cos(cIdx * 2.1) * 0.05))
    }
  }
  const smallMat = organMat({ color: '#d68d72', roughness: 0.4, sheenColor: '#ffc2a8', clearcoat: 0.4 })
  const small = new THREE.Mesh(
    varyTube(new THREE.CatmullRomCurve3(smallPts), 220, 18, () => 0.1 + Math.sin(Math.random()) * 0.002),
    smallMat
  )
  small.castShadow = true
  group.add(small)
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
  return def ? def.build() : null
}
