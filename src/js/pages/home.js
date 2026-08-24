import { initShared, gsap, ScrollTrigger, isMobileish, prefersReduced } from '../main.js'
import { initHero } from '../three/hero.js'
import { initOrganExplorer } from '../three/organ-explorer.js'

initShared()

const heroCanvas = document.getElementById('heroCanvas')
if (heroCanvas) {
  if (!prefersReduced()) {
    const hero = initHero(heroCanvas)
    ScrollTrigger.create({
      trigger: '#hero',
      start: 'top top',
      end: 'bottom top',
      scrub: true,
      onUpdate: (self) => hero.setScroll(self.progress)
    })
    gsap.to('.hero-inner', {
      opacity: 0,
      y: -90,
      ease: 'none',
      scrollTrigger: { trigger: '#hero', start: 'top top', end: '65% top', scrub: true }
    })
  } else {
    document.getElementById('hero')?.classList.add('static-hero')
  }
}

const journey = document.querySelector('.journey')
const track = document.querySelector('.journey-track')
if (journey && track && !isMobileish() && !prefersReduced()) {
  const distance = () => Math.max(track.scrollWidth - window.innerWidth + 80, 0)
  gsap.to(track, {
    x: () => -distance(),
    ease: 'none',
    scrollTrigger: {
      trigger: journey,
      start: 'top top',
      end: () => `+=${distance()}`,
      pin: true,
      scrub: 1,
      invalidateOnRefresh: true
    }
  })
}

const explorerRoot = document.getElementById('explorer')
if (explorerRoot) initOrganExplorer(explorerRoot)

window.addEventListener('load', () => ScrollTrigger.refresh())
