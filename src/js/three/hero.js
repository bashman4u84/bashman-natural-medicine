import * as THREE from 'three'
import { initStage, studioLights, driftPoints, glowTexture, REDUCED } from './core.js'
import { displace } from './organs.js'

function leafGeometry(len = 1) {
  const s = new THREE.Shape()
  s.moveTo(0, -len * 0.45)
  s.bezierCurveTo(len * 0.4, -len * 0.22, len * 0.38, len * 0.26, 0, len * 0.62)
  s.bezierCurveTo(-len * 0.38, len * 0.26, -len * 0.4, -len * 0.22, 0, -len * 0.45)
  const g = new THREE.ShapeGeometry(s, 14)
  const pos = g.attributes.position
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i)
    pos.setZ(i, Math.sin(((y / len) * 0.5 + 0.45) * Math.PI * 2) * 0.1 * len)
  }
  g.computeVertexNormals()
  return g
}

export function initHero(canvas) {
  const stage = initStage(canvas, { fov: 44, camPos: [0, 0.1, 4.6], shadows: false })
  const { scene, camera } = stage
  studioLights(scene)

  const coreGeo = new THREE.SphereGeometry(1.05, window.innerWidth < 900 ? 56 : 110, Math.round(window.innerWidth < 900 ? 42 : 84))
  displace(coreGeo, 0.07, 1.9, 3)
  const coreMat = new THREE.MeshPhysicalMaterial({
    color: '#155c41',
    roughness: 0.24,
    metalness: 0.08,
    clearcoat: 0.9,
    clearcoatRoughness: 0.3,
    sheen: 0.8,
    sheenColor: new THREE.Color('#7ee2b8'),
    envMapIntensity: 1.1
  })
  const core = new THREE.Mesh(coreGeo, coreMat)
  scene.add(core)

  const shell = new THREE.Mesh(
    new THREE.IcosahedronGeometry(1.62, 1),
    new THREE.MeshBasicMaterial({ color: '#e8c96a', wireframe: true, transparent: true, opacity: 0.07 })
  )
  scene.add(shell)

  const halo = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: glowTexture('rgba(126,226,184,0.85)'),
      transparent: true,
      opacity: 0.34,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    })
  )
  halo.scale.setScalar(6.4)
  halo.position.z = -0.8
  scene.add(halo)

  const innerLight = new THREE.PointLight('#ffd97a', 26, 8, 2)
  scene.add(innerLight)

  const rings = []
  ;[1.72, 2.14].forEach((r, i) => {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(r, 0.005, 8, 140),
      new THREE.MeshBasicMaterial({ color: i === 0 ? '#7ee2b8' : '#e8c96a', transparent: true, opacity: 0.16 })
    )
    ring.rotation.x = Math.PI / 2 - 0.32 - i * 0.28
    ring.rotation.y = i * 0.4
    scene.add(ring)
    rings.push(ring)
  })

  const leafGroup = new THREE.Group()
  const leafGeos = [leafGeometry(0.52), leafGeometry(0.36)]
  const palette = ['#3fa372', '#2c7a54', '#58b98a', '#8fd8b4', '#d9b64a']
  const leaves = []
  for (let i = 0; i < 9; i++) {
    const mat = new THREE.MeshStandardMaterial({
      color: palette[i % palette.length],
      roughness: 0.5,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.92,
      sheen: 0.6,
      sheenColor: new THREE.Color('#ffffff')
    })
    const leaf = new THREE.Mesh(leafGeos[i % 2], mat)
    const pivot = new THREE.Group()
    pivot.add(leaf)
    leafGroup.add(pivot)
    leaves.push({ pivot, leaf, speed: 0.14 + Math.random() * 0.22, phase: (i / 9) * Math.PI * 2, rad: i < 5 ? 1.75 : 2.2, bob: 0.15 + Math.random() * 0.25 })
  }
  leafGroup.rotation.x = 0.42
  scene.add(leafGroup)

  const dust = driftPoints({ count: window.innerWidth < 900 ? 55 : 110, size: 0.05 })
  scene.add(dust)

  let scrollP = 0
  let mx = 0
  let my = 0
  let tmx = 0
  let tmy = 0

  if (!REDUCED && window.matchMedia('(pointer: fine)').matches) {
    window.addEventListener('pointermove', (e) => {
      tmx = (e.clientX / window.innerWidth - 0.5) * 2
      tmy = (e.clientY / window.innerHeight - 0.5) * 2
    })
  }

  stage.setRender((dt, t) => {
    mx += (tmx - mx) * 0.05
    my += (tmy - my) * 0.05

    const breathe = 1 + Math.sin(t * 0.9) * 0.022
    core.scale.setScalar(breathe * (1 - scrollP * 0.32))
    core.position.y = scrollP * 1.05
    core.rotation.y += dt * 0.12
    core.rotation.z = Math.sin(t * 0.23) * 0.06

    shell.scale.setScalar((1.04 + Math.sin(t * 0.6) * 0.03) * (1 - scrollP * 0.3))
    shell.rotation.y -= dt * 0.07
    shell.rotation.x = Math.sin(t * 0.19) * 0.2
    shell.position.y = core.position.y

    halo.material.opacity = 0.34 * (1 - scrollP * 0.75) + Math.sin(t * 1.4) * 0.02
    halo.position.y = core.position.y
    innerLight.intensity = 20 + Math.sin(t * 1.7) * 7
    innerLight.position.y = core.position.y

    rings.forEach((r, i) => {
      r.rotation.z += dt * (i === 0 ? 0.1 : -0.06)
      r.position.y = core.position.y * (0.9 + i * 0.1)
      r.material.opacity = 0.16 * (1 - scrollP * 0.8)
    })

    const spin = 1 - scrollP * 0.65
    leafGroup.rotation.y += dt * 0.1 * spin
    leaves.forEach((l) => {
      const a = l.phase + t * l.speed * spin
      l.pivot.position.set(Math.cos(a) * l.rad, Math.sin(a * 1.4) * l.bob, Math.sin(a) * l.rad)
      l.pivot.rotation.set(Math.sin(a) * 0.7, a, 0.4)
    })

    dust.userData.tick(dt)
    dust.position.y = scrollP * 0.6

    camera.position.x = mx * 0.42
    camera.position.y = 0.1 - my * 0.3 + scrollP * 0.35
    camera.lookAt(0, scrollP * 0.7, 0)
  })

  return {
    setScroll(p) {
      scrollP = p
    },
    dispose: stage.dispose
  }
}
