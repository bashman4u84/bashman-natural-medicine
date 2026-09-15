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

/* ---------- ad pixel lead tracking (Meta + TikTok) ----------
 * Safe no-op if the pixels aren't loaded on the page (IDs are
 * placeholders in each landing page's <head>). */
function trackLead(label) {
  try {
    if (typeof fbq === 'function') { fbq('track', 'Lead', { content_name: label || 'consultation' }) }
    if (window.ttq) { ttq.track('SubmitForm', { content_name: label || 'consultation' }) }
  } catch (e) { /* pixels are best-effort */ }
}
function initPixelTracking() {
  document.querySelectorAll('.wa-track').forEach((a) =>
    a.addEventListener('click', () => trackLead('whatsapp'))
  )
  document.querySelectorAll('form[data-fake]').forEach((form) => {
    form.addEventListener('submit', () => {
      const cond = form.querySelector('[name="condition"]')?.value
        || document.body.dataset.landing || ''
      trackLead('form-' + (cond || 'consultation'))
    }, { once: true })
  })
}

function initForms() {
  document.querySelectorAll('form[data-fake]').forEach((form) => {
    const showSuccess = () => {
      const hideables = form.matches('.form-fields')
        ? [form]
        : [...form.querySelectorAll('.form-fields')]
      hideables.forEach((f) => (f.style.display = 'none'))
      const ok = form.parentElement.querySelector('.form-success') || form.querySelector('.form-success')
      if (ok) ok.classList.add('show')
    }
    form.addEventListener('submit', async (e) => {
      e.preventDefault()
      if (!form.checkValidity()) {
        form.reportValidity()
        return
      }
      const btn = form.querySelector('[type="submit"]')
      const oldLabel = btn?.textContent
      if (btn) {
        btn.disabled = true
        btn.textContent = 'Sending…'
      }
      form.querySelector('.form-error')?.remove()
      try {
        const fd = new FormData(form)
        fd.set('page', location.pathname)
        if (!fd.get('condition') && document.body.dataset.landing) {
          fd.set('condition', document.body.dataset.landing + ' (landing page)')
        }
        const res = await fetch('/submit-consultation.php', {
          method: 'POST',
          body: fd,
          headers: { Accept: 'application/json' }
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok || data.ok === false) throw new Error(data.error || 'send failed')
        showSuccess()
      } catch (err) {
        console.error('[form]', err)
        if (btn) {
          btn.disabled = false
          btn.textContent = oldLabel
        }
        const errEl = document.createElement('p')
        errEl.className = 'form-error'
        errEl.textContent = 'Couldn’t send automatically — please tap the WhatsApp button and we’ll take it from there.'
        form.appendChild(errEl)
      }
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
  initPixelTracking()
  const year = document.getElementById('year')
  if (year) year.textContent = new Date().getFullYear()
}

document.addEventListener('DOMContentLoaded', () => {})
