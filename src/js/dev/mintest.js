import * as THREE from 'three'
const canvas = document.getElementById('c')
const renderer = new THREE.WebGLRenderer({ canvas })
renderer.setSize(500, 500, false)
const scene = new THREE.Scene()
scene.background = new THREE.Color('#224466')
const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100)
camera.position.z = 4
const m = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 32), new THREE.MeshBasicMaterial({ color: '#ff8800' }))
scene.add(m)
let frames = 0
renderer.setAnimationLoop(() => {
  m.rotation.y += 0.02
  renderer.render(scene, camera)
  frames++
})
window.__frames = () => frames
