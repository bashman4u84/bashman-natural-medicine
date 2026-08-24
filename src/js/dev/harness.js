import * as THREE from 'three'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import { makeOrgan } from '../three/organs.js'
import { CONDITIONS } from '../data/conditions.js'

const params = new URLSearchParams(location.search)
const organ = params.get('organ') || 'liver'
const cond = Object.values(CONDITIONS).find((c) => c.organ === organ)
const view = params.get('view') || 'front'

const canvas = document.getElementById('c')
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false })
renderer.setPixelRatio(1)
renderer.setSize(innerWidth, innerHeight, false)
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = 1.05
renderer.shadowMap.enabled = false
renderer.shadowMap.type = THREE.PCFSoftShadowMap

const scene = new THREE.Scene()
scene.background = new THREE.Color('#0b1f16')
const pmrem = new THREE.PMREMGenerator(renderer)
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture

const camera = new THREE.PerspectiveCamera(40, innerWidth / innerHeight, 0.1, 60)

// lights (mirrors science viewer)
const key = new THREE.DirectionalLight(0xfff2da, 2.6)
key.position.set(2.6, 3.6, 2.4)
key.castShadow = true
key.shadow.mapSize.set(1024, 1024)
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

const group = makeOrgan(organ)
scene.add(group)
group.position.y += 0.1

// material override for diagnostics
const matOverride = params.get('mat')
if (matOverride) {
  group.traverse((o) => {
    if (o.isMesh) {
      if (matOverride === 'normal') o.material = new THREE.MeshNormalMaterial({ side: THREE.DoubleSide })
      else if (matOverride === 'flat') o.material = new THREE.MeshBasicMaterial({ color: '#7ee2b8', wireframe: true })
      else if (matOverride === 'phys') o.material = new THREE.MeshPhysicalMaterial({ color: '#b0513a', roughness: 0.35, clearcoat: 0.5 })
    }
  })
}

// hotspot markers if a condition maps to this organ
if (cond && cond.hotspots) {
  cond.hotspots.forEach((h, i) => {
    const m = new THREE.Mesh(
      new THREE.SphereGeometry(0.035, 12, 10),
      new THREE.MeshBasicMaterial({ color: '#ffcf5e' })
    )
    const v = new THREE.Vector3(...h.pos)
    m.position.copy(v)
    group.add(m)
    const t = new THREE.Mesh(
      new THREE.SphereGeometry(0.017, 10, 8),
      new THREE.MeshBasicMaterial({ color: '#ffffff' })
    )
    t.position.copy(v)
    group.add(t)
  })
}

// frame the organ
const box = new THREE.Box3().setFromObject(group)
const sphere = box.getBoundingSphere(new THREE.Sphere())
const dist = (sphere.radius * 1.35) / Math.tan((40 * Math.PI) / 360)
const angle = view === 'four' ? Math.PI * 0.85 : view === 'side' ? Math.PI / 2 : view === 'back' ? Math.PI : 0
camera.position.set(Math.sin(angle) * dist, 0.25, Math.cos(angle) * dist)
camera.lookAt(0, 0.05, 0)

// ground
const ground = new THREE.Mesh(
  new THREE.CircleGeometry(2.2, 48),
  new THREE.ShadowMaterial({ opacity: 0.32 })
)
ground.rotation.x = -Math.PI / 2
ground.position.y = -1.62
ground.receiveShadow = true
scene.add(ground)

// diagnostics
if (params.get('info')) {
  const mesh = group.children.find((c) => c.isMesh)
  mesh.frustumCulled = false
  const wp = new THREE.Vector3()
  mesh.getWorldPosition(wp)
  console.log('INFO meshPos', JSON.stringify(wp.toArray().map((v) => +v.toFixed(2))))
  console.log('INFO sphere', JSON.stringify(mesh.geometry.boundingSphere))
  console.log('INFO cam', JSON.stringify(camera.position.toArray().map((v) => +v.toFixed(2))))
  console.log('INFO visible', mesh.visible, 'parent', !!mesh.parent)
}
window.__organReady = true
document.getElementById('info').textContent = `${organ} — ${cond ? cond.name : 'no cond'} — sphere r=${sphere.radius.toFixed(2)} dist=${dist.toFixed(2)} tris=${group.children[0]?.geometry?.index?.count / 3 | 0}`

renderer.setAnimationLoop(() => {
  group.rotation.y += 0.0035
  group.userData?.tick?.(performance.now() / 1000)
  renderer.render(scene, camera)
})
