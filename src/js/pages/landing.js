import { initShared, ScrollTrigger, prefersReduced } from '../main.js'
import { initLandingScene } from '../three/landing-scene.js'

initShared()

const kind = document.body.dataset.landing
const organ = kind === 'ulcer' ? 'stomach' : 'liver'
const bad = kind === 'ulcer' ? 'drop' : 'virus'
const badColor = kind === 'ulcer' ? '#ff8c42' : '#9fd44a'

const heroCanvas = document.getElementById('lpCanvas')
const storyCanvas = document.getElementById('storyCanvas')

if (heroCanvas && !prefersReduced()) initLandingScene(heroCanvas, { organ, bad, badColor })
else heroCanvas?.classList.add('hidden')

let story = null
if (storyCanvas && !prefersReduced()) story = initLandingScene(storyCanvas, { organ, bad, badColor })
else storyCanvas?.classList.add('hidden')

const pin = document.querySelector('.story-pin')
const steps = Array.from(document.querySelectorAll('.story-step'))
const dots = Array.from(document.querySelectorAll('.progress-dots span'))

if (pin && steps.length) {
  const applyStep = (idx) => {
    steps.forEach((s, i) => s.classList.toggle('active', i === idx))
    dots.forEach((d, i) => d.classList.toggle('on', i <= idx))
  }
  if (!prefersReduced()) {
    ScrollTrigger.create({
      trigger: pin,
      start: 'top top',
      end: '+=260%',
      pin: true,
      scrub: true,
      onUpdate: (self) => {
        story?.setProgress(self.progress)
        const idx = Math.min(steps.length - 1, Math.floor(self.progress * steps.length * 0.999))
        if (idx !== pin.__stepIdx) {
          pin.__stepIdx = idx
          applyStep(idx)
        }
      }
    })
    applyStep(0)
  } else {
    steps.forEach((s) => s.classList.add('active'))
    dots.forEach((d) => d.classList.add('on'))
  }
}

window.addEventListener('load', () => ScrollTrigger.refresh())
