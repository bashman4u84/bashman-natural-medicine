import * as THREE from 'three'
import { initStage, studioLights, driftPoints, virusTexture, dropTexture, billboardSwarm, IS_TOUCH } from './core.js'
import { makeOrgan } from './organs.js'

export function initLandingScene(canvas, { organ = 'liver', bad = 'virus', badColor = '#9fd44a' } = {}) {
  const stage = initStage(canvas, { fov: 42, camPos: [0, 0.1, 4.5], shadows: false })
  const { scene, camera } = stage
  studioLights(scene)

  const inflameLight = new THREE.PointLight('#ff4d3d', 16, 10, 2)
  inflameLight.position.set(0.6, -0.2, 1.6)
  const healLight = new THREE.PointLight('#ffd97a', 3, 12, 2)
  healLight.position.set(-0.8, 0.6, 1.4)
  scene.add(inflameLight, healLight)

  let group = null
  makeOrgan(organ).then((g) => {
    if (g) { group = g; scene.add(g) }
  })

  const badTex = bad === 'virus' ? virusTexture(badColor) : dropTexture(badColor)
  const swarm = billboardSwarm({
    count: IS_TOUCH ? 22 : 38,
    texture: badTex,
    size: bad === 'virus' ? 0.3 : 0.26,
    rMin: 1.15,
    rMax: 2.5
  })
  scene.add(swarm)

  const heal = driftPoints({ count: IS_TOUCH ? 45 : 80, colors: ['#ffe08a', '#e8c96a', '#fff3c4'], size: 0.06, rMin: 0.9, rMax: 3.2 })
  heal.material.opacity = 0
  scene.add(heal)

  let p = 0
  let targetP = 0

  stage.setRender((dt, t) => {
    p += (targetP - p) * Math.min(dt * 6, 1)

    if (group) {
      group.rotation.y += dt * 0.28
      group.position.y = Math.sin(t * 0.8) * 0.07
      const settle = 1 - Math.sin(p * Math.PI) * 0.04
      group.scale.setScalar(settle)
    }

    swarm.userData.tick(t)
    swarm.children.forEach((s) => {
      s.material.opacity = (1 - p) * 0.95
      const shrink = 1 - p * 0.55
      s.scale.setScalar(s.userData.baseScale * shrink)
    })
    swarm.visible = p < 0.93

    heal.material.opacity = p * 0.85
    heal.rotation.y += dt * (0.08 + p * 0.4)
    heal.scale.setScalar(0.55 + p * 0.85)

    inflameLight.intensity = 16 * (1 - p) + 2 + Math.sin(t * 3) * 1.2 * (1 - p)
    healLight.intensity = 3 + p * 24

    camera.position.z += (4.5 - p * 0.75 - camera.position.z) * 0.05
    camera.lookAt(0, 0, 0)
  })

  return { setProgress(v) { targetP = v } }
}
