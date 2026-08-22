import * as THREE from 'three'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'

export const IS_TOUCH = window.matchMedia('(pointer: coarse)').matches
export const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches

export function initStage(canvas, opts = {}) {
  const {
    fov = 42,
    shadows = !IS_TOUCH,
    alpha = true,
    exposure = 1.05,
    camPos = [0, 0.15, 4.2]
  } = opts

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha,
    powerPreference: 'high-performance'
  })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, IS_TOUCH ? 1.8 : 2))
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = exposure
  if (shadows) {
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
  }

  const scene = new THREE.Scene()
  if (!alpha) scene.background = new THREE.Color('#0b1f16')

  const pmrem = new THREE.PMREMGenerator(renderer)
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.05).texture

  const camera = new THREE.PerspectiveCamera(fov, 1, 0.1, 60)
  camera.position.set(...camPos)

  const clock = new THREE.Clock()
  let renderFn = null
  let disposed = false

  function resize() {
    const w = canvas.clientWidth || canvas.parentElement.clientWidth
    const h = canvas.clientHeight || canvas.parentElement.clientHeight
    if (!w || !h) return
    renderer.setSize(w, h, false)
    camera.aspect = w / h
    camera.updateProjectionMatrix()
  }
  new ResizeObserver(resize).observe(canvas.parentElement || canvas)
  resize()

  const io = new IntersectionObserver(
    ([entry]) => {
      if (disposed) return
      if (entry.isIntersecting) {
        renderer.setAnimationLoop(() => {
          const dt = Math.min(clock.getDelta(), 0.05)
          const t = clock.elapsedTime
          renderFn?.(dt, t)
          renderer.render(scene, camera)
        })
      } else {
        renderer.setAnimationLoop(null)
      }
    },
    { threshold: 0.01 }
  )
  io.observe(canvas)

  function setRender(fn) {
    renderFn = fn
  }

  function dispose() {
    disposed = true
    renderer.setAnimationLoop(null)
    io.disconnect()
    scene.traverse((o) => {
      o.geometry?.dispose?.()
      const mats = Array.isArray(o.material) ? o.material : o.material ? [o.material] : []
      mats.forEach((m) => {
        Object.values(m).forEach((v) => v?.isTexture && v.dispose())
        m.dispose()
      })
    })
    pmrem.dispose()
    renderer.dispose()
  }

  return { renderer, scene, camera, clock, setRender, dispose }
}

export function studioLights(scene, { shadows = false } = {}) {
  const key = new THREE.DirectionalLight(0xfff2da, 2.4)
  key.position.set(2.6, 3.6, 2.4)
  if (shadows) {
    key.castShadow = true
    key.shadow.mapSize.set(1024, 1024)
    key.shadow.camera.near = 1
    key.shadow.camera.far = 12
    key.shadow.bias = -0.0006
    key.shadow.radius = 6
  }
  scene.add(key)

  const rim = new THREE.DirectionalLight(0x7ee2b8, 1.5)
  rim.position.set(-3.4, 2, -2.8)
  scene.add(rim)

  const gold = new THREE.PointLight(0xe8c96a, 14, 14, 2)
  gold.position.set(-1.8, -1.4, 2.6)
  scene.add(gold)

  const under = new THREE.DirectionalLight(0x1e6a4b, 0.5)
  under.position.set(0, -3, 1)
  scene.add(under)

  return { key, rim, gold, under }
}

export function addGroundShadow(scene, y = -1.45, size = 3.2) {
  const mat = new THREE.ShadowMaterial({ opacity: 0.3 })
  const mesh = new THREE.Mesh(new THREE.CircleGeometry(size, 48), mat)
  mesh.rotation.x = -Math.PI / 2
  mesh.position.y = y
  mesh.receiveShadow = true
  scene.add(mesh)
}

let _spriteCache = {}
export function glowTexture(inner = 'rgba(255,255,255,1)', outer = 'rgba(255,255,255,0)') {
  const keyid = inner + outer
  if (_spriteCache[keyid]) return _spriteCache[keyid]
  const c = document.createElement('canvas')
  c.width = c.height = 128
  const ctx = c.getContext('2d')
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64)
  g.addColorStop(0, inner)
  g.addColorStop(0.35, inner.replace(/[\d.]+\)$/, '0.55)'))
  g.addColorStop(1, outer)
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 128, 128)
  const tex = new THREE.CanvasTexture(c)
  _spriteCache[keyid] = tex
  return tex
}

export function virusTexture(body = '#a4d84c') {
  if (_spriteCache['virus' + body]) return _spriteCache['virus' + body]
  const c = document.createElement('canvas')
  c.width = c.height = 128
  const ctx = c.getContext('2d')
  ctx.translate(64, 64)
  ctx.strokeStyle = body
  ctx.fillStyle = body
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2
    ctx.beginPath()
    ctx.moveTo(Math.cos(a) * 26, Math.sin(a) * 26)
    ctx.lineTo(Math.cos(a) * 46, Math.sin(a) * 46)
    ctx.lineWidth = 5
    ctx.stroke()
    ctx.beginPath()
    ctx.arc(Math.cos(a) * 50, Math.sin(a) * 50, 6.5, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.beginPath()
  ctx.arc(0, 0, 28, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = 'rgba(11,31,22,0.55)'
  ;[
    [-9, -6],
    [9, -6],
    [0, 7]
  ].forEach(([x, y]) => {
    ctx.beginPath()
    ctx.arc(x, y, 4.5, 0, Math.PI * 2)
    ctx.fill()
  })
  const tex = new THREE.CanvasTexture(c)
  _spriteCache['virus' + body] = tex
  return tex
}

export function dropTexture(color = '#ff9a3d') {
  if (_spriteCache['drop' + color]) return _spriteCache['drop' + color]
  const c = document.createElement('canvas')
  c.width = c.height = 128
  const ctx = c.getContext('2d')
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.moveTo(64, 10)
  ctx.bezierCurveTo(96, 58, 104, 82, 64, 108)
  ctx.bezierCurveTo(24, 82, 32, 58, 64, 10)
  ctx.fill()
  ctx.fillStyle = 'rgba(255,255,255,0.65)'
  ctx.beginPath()
  ctx.ellipse(52, 74, 9, 16, 0.5, 0, Math.PI * 2)
  ctx.fill()
  const tex = new THREE.CanvasTexture(c)
  _spriteCache['drop' + color] = tex
  return tex
}

export function driftPoints({
  count = 90,
  rMin = 1.7,
  rMax = 3.4,
  colors = ['#e8c96a', '#7ee2b8'],
  size = 0.055
} = {}) {
  const pos = new Float32Array(count * 3)
  const col = new Float32Array(count * 3)
  const palette = colors.map((c) => new THREE.Color(c))
  for (let i = 0; i < count; i++) {
    const r = rMin + Math.random() * (rMax - rMin)
    const th = Math.random() * Math.PI * 2
    const ph = Math.acos(2 * Math.random() - 1)
    pos[i * 3] = r * Math.sin(ph) * Math.cos(th)
    pos[i * 3 + 1] = r * Math.cos(ph)
    pos[i * 3 + 2] = r * Math.sin(ph) * Math.sin(th)
    const colr = palette[i % palette.length]
    col[i * 3] = colr.r
    col[i * 3 + 1] = colr.g
    col[i * 3 + 2] = colr.b
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3))
  const mat = new THREE.PointsMaterial({
    size,
    map: glowTexture(),
    transparent: true,
    opacity: 0.75,
    vertexColors: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true
  })
  const pts = new THREE.Points(geo, mat)
  pts.userData.tick = (dt) => {
    pts.rotation.y += dt * 0.05
    pts.rotation.z += dt * 0.012
  }
  return pts
}

export function billboardSwarm({
  count = 40,
  texture,
  size = 0.34,
  rMin = 1.2,
  rMax = 2.4,
  opacity = 0.95
} = {}) {
  const group = new THREE.Group()
  const data = []
  for (let i = 0; i < count; i++) {
    const mat = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      opacity,
      depthWrite: false
    })
    const s = new THREE.Sprite(mat)
    const seed = Math.random() * Math.PI * 2
    const speed = 0.25 + Math.random() * 0.5
    const rad = rMin + Math.random() * (rMax - rMin)
    const tilt = (Math.random() - 0.5) * 1.6
    const sc = size * (0.6 + Math.random() * 0.7)
    s.scale.setScalar(sc)
    s.userData.baseScale = sc
    group.add(s)
    data.push({ s, seed, speed, rad, tilt })
  }
  group.userData.tick = (t) => {
    data.forEach((d) => {
      const a = d.seed + t * d.speed
      d.s.position.set(
        Math.cos(a) * d.rad,
        Math.sin(a * 1.3) * 0.9 + d.tilt * Math.sin(a),
        Math.sin(a) * d.rad * 0.6
      )
    })
  }
  return group
}
