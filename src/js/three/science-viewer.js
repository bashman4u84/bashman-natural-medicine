import * as THREE from 'three'
import gsap from 'gsap'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { initStage, studioLights, addGroundShadow, driftPoints } from './core.js'
import { makeOrgan } from './organs.js'

export function initScienceViewer(canvas, hotspotLayer) {
  const stage = initStage(canvas, { fov: 40, camPos: [0, 0.15, 4.4] })
  const { scene, camera, renderer } = stage
  studioLights(scene, { shadows: true })
  addGroundShadow(scene, -1.55)

  const controls = new OrbitControls(camera, canvas)
  controls.enableDamping = true
  controls.dampingFactor = 0.06
  controls.enablePan = false
  controls.enableZoom = false
  controls.autoRotate = true
  controls.autoRotateSpeed = 0.85
  controls.minPolarAngle = 0.7
  controls.maxPolarAngle = 2.35
  controls.target.set(0, -0.05, 0)

  /* frame an object so it fills the stage gracefully */
  const _frame = new THREE.Box3()
  const _sph = new THREE.Sphere()
  function frameObject(obj) {
    _frame.setFromObject(obj)
    const r = _frame.getBoundingSphere(_sph).radius
    const d = (r * 1.28) / Math.tan((40 * Math.PI) / 360)
    let dir = camera.position.clone().sub(controls.target)
    if (dir.lengthSq() < 0.01) dir = new THREE.Vector3(0, 0.2, 1)
    dir.normalize()
    /* snap into frame — a tween fights OrbitControls' damping */
    controls.target.set(0, 0, 0)
    camera.position.set(dir.x * d, dir.y * d + 0.12, dir.z * d)
    controls.update()
  }

  const dust = driftPoints({ count: 60, size: 0.045, rMin: 2, rMax: 3.6 })
  scene.add(dust)

  let current = null
  let currentKey = null
  const hotspots = []
  const _p = new THREE.Vector3()
  const _w = new THREE.Vector3()
  const _c = new THREE.Vector3()
  const _d = new THREE.Vector3()

  function disposeGroup(g) {
    g.traverse((o) => {
      o.geometry?.dispose?.()
      const mats = Array.isArray(o.material) ? o.material : o.material ? [o.material] : []
      mats.forEach((m) => m.dispose?.())
    })
  }

  function clearHotspots() {
    hotspots.length = 0
    hotspotLayer.innerHTML = ''
  }

  function setHotspots(list = [], onOpen) {
    clearHotspots()
    list.forEach((h, i) => {
      const el = document.createElement('div')
      el.className = 'hotspot'
      el.innerHTML = `
        <button class="hotspot-btn" aria-label="${h.title}">${i + 1}</button>
        <div class="hotspot-tip" role="tooltip"><strong>${h.title}</strong>${h.body}</div>
      `
      const btn = el.querySelector('.hotspot-btn')
      btn.addEventListener('click', () => {
        const wasActive = el.classList.contains('active')
        hotspotLayer.querySelectorAll('.hotspot.active').forEach((a) => a.classList.remove('active'))
        if (!wasActive) {
          el.classList.add('active')
          onOpen?.(h)
        }
      })
      hotspotLayer.appendChild(el)
      hotspots.push({ data: h, el, worldPos: new THREE.Vector3(...h.pos) })
    })
  }

  function projectHotspots() {
    if (!hotspots.length || !current) return
    const w = canvas.clientWidth
    const hgt = canvas.clientHeight
    current.getWorldPosition(_c)
    _d.copy(camera.position).sub(_c).normalize()
    hotspots.forEach((h) => {
      _w.copy(h.worldPos).applyMatrix4(current.matrixWorld)
      _p.copy(_w).project(camera)
      if (_p.z > 1) {
        h.el.classList.add('dim')
        return
      }
      const x = (_p.x * 0.5 + 0.5) * w
      const y = (-_p.y * 0.5 + 0.5) * hgt
      h.el.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`
      _w.sub(_c).normalize()
      h.el.classList.toggle('dim', _w.dot(_d) < -0.05)
    })
  }

  function setOrgan(key, hotspotsList, onHotspotOpen) {
    if (key === currentKey) return
    currentKey = key
    clearHotspots()
    const buildNext = () => {
      if (current) {
        scene.remove(current)
        disposeGroup(current)
        current = null
      }
      const next = makeOrgan(key)
      next.traverse((o) => {
        if (o.isMesh) o.castShadow = true
      })
      /* measure the final (animated) bounds BEFORE starting the
       * intro animation, so the camera frames the real organ */
      next.position.y = 0.4
      next.updateWorldMatrix(true, true)
      frameObject(next)
      next.scale.setScalar(0.001)
      scene.add(next)
      current = next
      gsap.to(next.scale, { x: 1, y: 1, z: 1, duration: 0.9, ease: 'elastic.out(1, 0.75)' })
      gsap.to(next.position, { y: 0, duration: 0.9, ease: 'power3.out' })
      if (hotspotsList) setTimeout(() => setHotspots(hotspotsList, onHotspotOpen), 700)
    }
    if (current) {
      gsap.to(current.scale, {
        x: 0.001, y: 0.001, z: 0.001,
        duration: 0.32, ease: 'power2.in',
        onComplete: buildNext
      })
    } else {
      buildNext()
    }
  }

  function zoom(dir) {
    const target = THREE.MathUtils.clamp(camera.position.length() * dir, 2.8, 7)
    const newPos = camera.position.clone().normalize().multiplyScalar(target)
    gsap.to(camera.position, { x: newPos.x, y: newPos.y, z: newPos.z, duration: 0.6, ease: 'power2.out' })
  }

  stage.setRender((dt) => {
    controls.update()
    current?.userData.tick?.(dt)
    dust.userData.tick(dt)
    projectHotspots()
  })

  window.__sciDebug = () => ({
    cam: camera.position.toArray().map((v) => +v.toFixed(2)),
    tgt: controls.target.toArray().map((v) => +v.toFixed(2)),
    organWorld: current
      ? (() => { const s = new THREE.Vector3(); current.getWorldScale(s); return { scale: +s.x.toFixed(3) } })()
      : null
  })
  return { setOrgan, setHotspots, zoom, get renderer() { return renderer } }
}
