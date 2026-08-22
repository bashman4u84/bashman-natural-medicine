import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Lenis from 'lenis'

gsap.registerPlugin(ScrollTrigger)

export { gsap, ScrollTrigger }

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
const isTouch = window.matchMedia('(pointer: coarse)').matches

let lenis = null

export function initSmoothScroll() {
  if (reduceMotion) return null
  lenis = new Lenis({
    duration: 1.1,
    smoothWheel: true,
    touchMultiplier: 1.6,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t))
  })
  lenis.on('scroll', ScrollTrigger.update)
  gsap.ticker.add((time) => lenis.raf(time * 1000))
  gsap.ticker.lagSmoothing(0)

  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href')
      if (id.length < 2) return
      const target = document.querySelector(id)
      if (!target) return
      e.preventDefault()
      lenis.scrollTo(target, { offset: -80 })
    })
  })
  return lenis
}

export function scrollToEl(target, offset = -80) {
  if (lenis) lenis.scrollTo(target, { offset })
  else target?.scrollIntoView({ behavior: 'smooth' })
}

function initHeader() {
  const header = document.querySelector('.site-header, .landing-header')
  if (!header) return
  const onScroll = () => header.classList.toggle('scrolled', window.scrollY > 30)
  window.addEventListener('scroll', onScroll, { passive: true })
  onScroll()

  const toggle = document.querySelector('.nav-toggle')
  const panel = document.querySelector('.nav-panel')
  if (!toggle || !panel) return
  toggle.addEventListener('click', () => {
    const open = panel.classList.toggle('open')
    toggle.classList.toggle('open', open)
    toggle.setAttribute('aria-expanded', String(open))
    document.body.style.overflow = open ? 'hidden' : ''
    if (open && lenis) lenis.stop()
    else if (lenis) lenis.start()
  })
  panel.querySelectorAll('a').forEach((a) =>
    a.addEventListener('click', () => {
      panel.classList.remove('open')
      toggle.classList.remove('open')
      document.body.style.overflow = ''
      lenis?.start()
    })
  )
}

function initProgressBar() {
  const bar = document.querySelector('.progress-bar')
  if (!bar) return
  window.addEventListener(
    'scroll',
    () => {
      const h = document.documentElement
      const p = h.scrollTop / (h.scrollHeight - h.clientHeight || 1)
      bar.style.width = `${p * 100}%`
    },
    { passive: true }
  )
}

export function revealAll(scope = document) {
  const els = scope.querySelectorAll('[data-reveal]:not(.revealed)')
  els.forEach((el) => {
    const delay = el.dataset.delay || 0
    el.style.setProperty('--rv-delay', `${delay}ms`)
  })
  if (reduceMotion || !('IntersectionObserver' in window)) {
    els.forEach((el) => el.classList.add('revealed'))
    return
  }
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('revealed')
          io.unobserve(entry.target)
        }
      })
    },
    { threshold: 0.14, rootMargin: '0px 0px -8% 0px' }
  )
  els.forEach((el) => io.observe(el))
}

function initCounters() {
  const nums = document.querySelectorAll('[data-counter]')
  if (!nums.length) return
  const run = (el) => {
    const end = parseFloat(el.dataset.counter)
    const suffix = el.dataset.suffix || ''
    const dur = 1600
    const start = performance.now()
    const tick = (now) => {
      const p = Math.min((now - start) / dur, 1)
      const eased = 1 - Math.pow(1 - p, 4)
      el.textContent = Math.round(end * eased).toLocaleString() + suffix
      if (p < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) {
          run(en.target)
          io.unobserve(en.target)
        }
      })
    },
    { threshold: 0.5 }
  )
  nums.forEach((n) => io.observe(n))
}

function initForms() {
  document.querySelectorAll('form[data-fake]').forEach((form) => {
    form.addEventListener('submit', (e) => {
      e.preventDefault()
      if (!form.checkValidity()) {
        form.reportValidity()
        return
      }
      form.querySelectorAll('.form-fields').forEach((f) => (f.style.display = 'none'))
      const ok = form.parentElement.querySelector('.form-success') || form.querySelector('.form-success')
      if (ok) ok.classList.add('show')
    })
  })
}

export function isMobileish() {
  return window.innerWidth < 900 || isTouch
}

export function prefersReduced() {
  return reduceMotion
}

export function initShared() {
  initSmoothScroll()
  initHeader()
  initProgressBar()
  revealAll()
  initCounters()
  initForms()
  const year = document.getElementById('year')
  if (year) year.textContent = new Date().getFullYear()
}

document.addEventListener('DOMContentLoaded', () => {})
