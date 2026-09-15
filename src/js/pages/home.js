import { initShared, gsap, ScrollTrigger, isMobileish, prefersReduced } from '../main.js'

initShared()

/* ============================================================
 * home.js — homepage orchestration, speed-first.
 *
 * Nothing 3D ships in the initial bundle: the hero garden and
 * the organ explorer are dynamic imports that Vite code-splits,
 * fetched only when the device can use them and/or when the
 * visitor scrolls near them. First paint is pure HTML + CSS.
 * ============================================================ */

/* ---------- hero: progressive 3D enhancement ----------
 * The arch always shows the instant static botanical art.
 * Only desktop-class devices (fine pointer, wide viewport, no
 * reduced-motion, no data-saver) fetch Three.js after idle. */
const heroEl = document.getElementById('hero')
const heroCanvas = document.getElementById('heroCanvas')
const hero3dAllowed =
  heroCanvas &&
  !prefersReduced() &&
  !isMobileish() &&
  matchMedia('(min-width: 1024px) and (pointer: fine)').matches &&
  !(navigator.connection && navigator.connection.saveData)

if (hero3dAllowed) {
  const idle = window.requestIdleCallback || ((cb) => setTimeout(cb, 1400))
  idle(async () => {
    try {
      const { initHero } = await import('../three/hero.js')
      const hero = initHero(heroCanvas, { framing: 'stage' })
      ScrollTrigger.create({
        trigger: '#hero',
        start: 'top top',
        end: 'bottom top',
        scrub: true,
        onUpdate: (self) => hero.setScroll(self.progress)
      })
      /* swap the static art for the live garden only once the first
       * sculpted part has actually arrived — and fall back to the art
       * if the GL context is ever lost. */
      const t0 = performance.now()
      const awaitFirstPart = () => {
        if (window.__hero3dAt) {
          heroEl?.classList.add('hero-3d-on')
          return
        }
        if (performance.now() - t0 < 9000) requestAnimationFrame(awaitFirstPart)
      }
      requestAnimationFrame(awaitFirstPart)
      heroCanvas.addEventListener('webglcontextlost', () => heroEl?.classList.remove('hero-3d-on'))
      heroCanvas.addEventListener('webglcontextrestored', () => {
        if (window.__hero3dAt) heroEl?.classList.add('hero-3d-on')
      })
    } catch (e) {
      console.error('[hero]', e)
    }
  })
} else {
  heroEl?.classList.add('static-hero')
}

/* gentle copy drift as the hero scrolls away — cheap, no 3D needed */
if (!prefersReduced()) {
  gsap.to('.hero-copy', {
    opacity: 0.2,
    y: -70,
    ease: 'none',
    scrollTrigger: { trigger: '#hero', start: 'top top', end: '75% top', scrub: true }
  })
  gsap.to('.hero-stage', {
    y: 46,
    ease: 'none',
    scrollTrigger: { trigger: '#hero', start: 'top top', end: 'bottom top', scrub: true }
  })
}

/* ---------- horizontal journey (desktop only) ---------- */
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

/* ---------- organ explorer: boot when it nears the viewport ----------
 * The chunk, the first organ's geometry and its textures are all
 * prewarmed at browser idle right after load — so by the time the
 * visitor scrolls here, mounting is near-instant. */
const explorerRoot = document.getElementById('explorer')
if (explorerRoot) {
  const bootExplorer = async () => {
    try {
      const { initOrganExplorer } = await import('../three/organ-explorer.js')
      initOrganExplorer(explorerRoot)
    } catch (e) {
      console.error('[explorer]', e)
    }
  }
  /* prewarm: fetch the module + first organ's assets while the browser is idle */
  const idle = window.requestIdleCallback || ((cb) => setTimeout(cb, 2000))
  idle(async () => {
    try {
      const explorerP = import('../three/organ-explorer.js')
      const [{ loadGeometry }, { organTexturesAsync }] = await Promise.all([
        import('../three/models.js'),
        import('../three/tissues.js'),
        explorerP
      ])
      await Promise.all([loadGeometry('liver'), organTexturesAsync('liver')])
    } catch (e) {
      /* prewarm is best-effort */
    }
  })
  if ('IntersectionObserver' in window && !prefersReduced()) {
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          io.disconnect()
          bootExplorer()
        }
      },
      { rootMargin: '1400px 0px' }
    )
    io.observe(explorerRoot)
  } else {
    bootExplorer()
  }
}

window.addEventListener('load', () => ScrollTrigger.refresh())
