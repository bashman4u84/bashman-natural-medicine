import * as THREE from 'three'
import { loadGeometry } from './models.js'
import {
  liverTextures, stomachTextures, kidneyTextures, heartTextures,
  pancreasTextures, intestineTextures, organMaterial
} from './tissues.js'

/* ============================================================
 * organs.js — the fine organ models. Geometry is baked at build
 * time (tools/bake.mjs → ./organ-data/*.js) and loaded lazily;
 * this file keeps the material recipes and the anatomical
 * attachments (gallbladder, vessels, ureters, bladder…).
 * ============================================================ */

export function fitGroup(group, targetRadius = 1.28) {
  group.updateWorldMatrix(true, true)
  const box = new THREE.Box3().setFromObject(group)
  const c = box.getCenter(new THREE.Vector3())
  const size = box.getSize(new THREE.Vector3()).length()
  const s = (targetRadius * 2) / Math.max(size, 0.01)
  group.position.set(-c.x, -c.y, -c.z)
  group.scale.setScalar(s)
  return s
}

function vesselMat(color) {
  return new THREE.MeshPhysicalMaterial({ color, roughness: 0.36, clearcoat: 0.5, sheen: 0.4, sheenColor: '#ffffff' })
}

async function buildLiver() {
  const group = new THREE.Group()
  const t = liverTextures()
  const mat = organMaterial({
    map: t.map, bump: t.bump, bumpScale: 0.6,
    roughness: 0.4, clearcoat: 0.42, clearcoatRoughness: 0.5,
    sheen: 0.5, sheenColor: '#ff9a80', envMapIntensity: 0.9
  })
  const mesh = new THREE.Mesh(await loadGeometry('liver'), mat)
  mesh.castShadow = true
  group.add(mesh)

  const gbMat = new THREE.MeshPhysicalMaterial({
    color: '#4f9e57', roughness: 0.18, transmission: 0.35, thickness: 0.5,
    clearcoat: 0.8, transparent: true, opacity: 0.95
  })
  const gb = new THREE.Mesh(new THREE.CapsuleGeometry(0.115, 0.1, 6, 18), gbMat)
  gb.position.set(0.26, -0.6, 0.26)
  gb.rotation.set(0.35, 0, -0.5)
  gb.castShadow = true
  group.add(gb)
  const duct = new THREE.Mesh(
    new THREE.TubeGeometry(
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(0.24, -0.52, 0.24),
        new THREE.Vector3(0.18, -0.36, 0.2),
        new THREE.Vector3(0.12, -0.2, 0.14)
      ]), 14, 0.032, 8),
    new THREE.MeshStandardMaterial({ color: '#7fae6a', roughness: 0.5 })
  )
  group.add(duct)
  group.rotation.set(-0.06, 0.35, 0.05)
  return group
}

async function buildStomach() {
  const group = new THREE.Group()
  const t = stomachTextures()
  const mat = organMaterial({
    map: t.map, bump: t.bump, bumpScale: 0.7,
    roughness: 0.42, clearcoat: 0.5, clearcoatRoughness: 0.45,
    sheen: 0.6, sheenColor: '#ffb59c', envMapIntensity: 0.9
  })
  const mesh = new THREE.Mesh(await loadGeometry('stomach'), mat)
  mesh.castShadow = true
  group.add(mesh)

  const stubMat = organMaterial({
    bump: t.bump, bumpScale: 0.5, roughness: 0.45,
    color: '#a85a42', clearcoat: 0.3, sheen: 0.4, sheenColor: '#ffc7ae'
  })
  const eso = new THREE.Mesh(new THREE.CapsuleGeometry(0.1, 0.16, 6, 14), stubMat)
  eso.position.set(0.02, 1.1, -0.02)
  group.add(eso)
  const duo = new THREE.Mesh(new THREE.CapsuleGeometry(0.1, 0.14, 6, 14), stubMat)
  duo.position.set(0.6, 0.3, -0.05)
  duo.rotation.z = -0.7
  group.add(duo)
  group.rotation.set(0.04, -0.4, 0)
  return group
}

async function buildKidneys() {
  const group = new THREE.Group()
  const t = kidneyTextures()
  const mat = organMaterial({
    map: t.map, bump: t.bump, bumpScale: 0.55,
    roughness: 0.4, clearcoat: 0.45, clearcoatRoughness: 0.5,
    sheen: 0.5, sheenColor: '#ffa48a', envMapIntensity: 0.95
  })
  const mesh = new THREE.Mesh(await loadGeometry('kidneys'), mat)
  mesh.castShadow = true
  group.add(mesh)

  const adrMat = new THREE.MeshPhysicalMaterial({ color: '#d9a45e', roughness: 0.5, clearcoat: 0.2 })
  ;[-1, 1].forEach((s) => {
    const adr = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), adrMat)
    adr.scale.set(0.16, 0.1, 0.12)
    adr.position.set(s * 0.58, 0.92, -0.04)
    adr.rotation.z = s * 0.25
    group.add(adr)
  })

  const ureterMat = new THREE.MeshStandardMaterial({ color: '#c9a06c', roughness: 0.5 })
  ;[-1, 1].forEach((s) => {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(s * 0.36, 0.02, 0.02),
      new THREE.Vector3(s * 0.3, -0.5, 0.1),
      new THREE.Vector3(s * 0.14, -0.9, 0.16),
      new THREE.Vector3(s * 0.06, -1.02, 0.2)
    ])
    const u = new THREE.Mesh(new THREE.TubeGeometry(curve, 36, 0.042, 10), ureterMat)
    group.add(u)
    const artery = new THREE.Mesh(
      new THREE.TubeGeometry(
        new THREE.CatmullRomCurve3([
          new THREE.Vector3(s * 0.1, 0.66, -0.42),
          new THREE.Vector3(s * 0.28, 0.5, -0.26),
          new THREE.Vector3(s * 0.42, 0.34, -0.12)
        ]), 24, 0.05, 10),
      new THREE.MeshStandardMaterial({ color: '#a63a3a', roughness: 0.42 })
    )
    group.add(artery)
  })
  const bladder = new THREE.Mesh(
    new THREE.SphereGeometry(1, 26, 20),
    new THREE.MeshPhysicalMaterial({ color: '#e3cf7d', roughness: 0.32, clearcoat: 0.55, transparent: true, opacity: 0.93 })
  )
  bladder.scale.set(0.42, 0.33, 0.36)
  bladder.position.set(0, -1.14, 0.22)
  group.add(bladder)
  group.rotation.set(0.05, 0, 0)
  return group
}

async function buildHeart() {
  const group = new THREE.Group()
  const t = heartTextures()
  const mat = organMaterial({
    map: t.map, bump: t.bump, bumpScale: 0.5,
    roughness: 0.38, clearcoat: 0.48, clearcoatRoughness: 0.45,
    sheen: 0.55, sheenColor: '#ff9a8e', envMapIntensity: 0.9
  })
  const body = new THREE.Mesh(await loadGeometry('heart'), mat)
  body.castShadow = true
  group.add(body)

  const aorta = new THREE.Mesh(
    new THREE.TubeGeometry(
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(0.0, 0.52, 0.08),
        new THREE.Vector3(0.05, 0.92, 0.08),
        new THREE.Vector3(0.3, 1.06, 0.0),
        new THREE.Vector3(0.5, 0.88, -0.08),
        new THREE.Vector3(0.5, 0.62, -0.12)
      ]), 50, 0.108, 16),
    vesselMat('#b0474e')
  )
  aorta.castShadow = true
  const pulm = new THREE.Mesh(
    new THREE.TubeGeometry(
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(0.08, 0.5, 0.2),
        new THREE.Vector3(-0.06, 0.74, 0.16),
        new THREE.Vector3(-0.26, 0.8, 0.08)
      ]), 36, 0.082, 14),
    vesselMat('#5a76a8')
  )
  const cav = new THREE.Mesh(
    new THREE.TubeGeometry(
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(0.33, 1.02, -0.08),
        new THREE.Vector3(0.36, 0.68, -0.12),
        new THREE.Vector3(0.3, 0.5, -0.05)
      ]), 24, 0.06, 12),
    vesselMat('#7a5a72')
  )
  const capA = new THREE.Mesh(new THREE.SphereGeometry(0.1, 14, 10), vesselMat('#b0474e'))
  capA.position.set(0.5, 0.62, -0.12)
  const capP = new THREE.Mesh(new THREE.SphereGeometry(0.078, 14, 10), vesselMat('#5a76a8'))
  capP.position.set(-0.26, 0.8, 0.08)
  const capC = new THREE.Mesh(new THREE.SphereGeometry(0.058, 14, 10), vesselMat('#7a5a72'))
  capC.position.set(0.33, 1.02, -0.08)
  group.add(aorta, pulm, cav, capA, capP, capC)

  group.userData.tick = (t) => {
    const beat = 1 + Math.sin(t * 2.6) * 0.011 + Math.max(0, Math.sin(t * 2.6 - 0.55)) * 0.02
    body.scale.setScalar(beat)
    aorta.scale.setScalar(1 + (beat - 1) * 0.4)
  }
  group.rotation.set(0.05, 0.3, 0.25)
  return group
}

async function buildPancreas() {
  const group = new THREE.Group()
  const t = pancreasTextures()
  const mat = organMaterial({
    map: t.map, bump: t.bump, bumpScale: 0.8,
    roughness: 0.5, clearcoat: 0.25, clearcoatRoughness: 0.5,
    sheen: 0.4, sheenColor: '#ffdfa8', envMapIntensity: 0.85
  })
  const mesh = new THREE.Mesh(await loadGeometry('pancreas'), mat)
  mesh.castShadow = true
  group.add(mesh)
  group.rotation.set(0.05, -0.2, 0)
  return group
}

async function buildIntestines() {
  const group = new THREE.Group()
  const t = intestineTextures()
  const mat = organMaterial({
    map: t.map, bump: t.bump, bumpScale: 0.65,
    roughness: 0.42, clearcoat: 0.4, clearcoatRoughness: 0.5,
    sheen: 0.55, sheenColor: '#ffd2b8', envMapIntensity: 0.9
  })
  const mesh = new THREE.Mesh(await loadGeometry('intestines'), mat)
  mesh.castShadow = true
  group.add(mesh)
  group.rotation.set(0.02, 0.4, 0)
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

export async function makeOrgan(key) {
  const def = ORGANS[key]
  if (!def) return null
  const group = await def.build()
  fitGroup(group, 1.28)
  return group
}
