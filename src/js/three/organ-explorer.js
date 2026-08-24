import { initShared, gsap } from '../main.js'
import { initScienceViewer } from './science-viewer.js'
import { CONDITIONS, CONDITION_ORDER, ORGAN_META } from '../data/conditions.js'
import { loadGeometry } from './models.js'
import { organTextures } from './tissues.js'

/* ============================================================
 * organ-explorer.js — the "Why We Get Sick" feature.
 * One init call mounts the whole explorer (condition rail, 3D
 * stage, hotspots, info tabs, zoom) into any section. Used by
 * science.html AND the homepage.
 *
 * Switch behavior is tuned so selecting a new condition never
 * scrolls or hangs: the next organ builds while the current one
 * shrinks, and all organ data is warmed into the cache after
 * the first render, so subsequent switches are near-instant.
 * ============================================================ */

const icons = {
  liver: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 8c4-2.5 9-2.5 13-1s5 3.5 5 6c0 3-2 5-5.5 5S10 16 8.5 14 5 11 3 11V8Z"/><path d="M14.5 15.5c.5-1 .5-2 0-3"/></svg>',
  stomach: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M9 3v4c0 2-1.5 3.5-1.5 6A6.5 6.5 0 0 0 14 19.5c3 0 5-1.7 5-4 0-2-1.3-3.2-3-3.7L12 11c-1.6-.5-2.5-1.6-2.5-3V3H9Z"/></svg>',
  intestines: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M7 4h10M17 4c0 3-2 4-5 4s-5 1-5 4 2 4 5 4 5 1 5 4M7 20h10"/></svg>',
  heart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 20s-7-4.5-9-9c-1.3-3 .7-6.5 4-6.5 2.2 0 3.7 1.3 5 3 1.3-1.7 2.8-3 5-3 3.3 0 5.3 3.5 4 6.5-2 4.5-9 9-9 9Z"/></svg>',
  pancreas: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 9c3-2 6-2 8 0s5 2.5 8 1M4 9c-.5 2 .5 3.5 2 4s4 .5 5-1M20 10c.5 2-.5 3.5-2 4"/></svg>',
  uterus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 3c-3 0-5 2-5 5 0 2 1 3 1 5s-1 4-1 6c0 1.5 2.2 2 5 2s5-.5 5-2c0-2-1-4-1-6s1-3 1-5c0-3-2-5-5-5Z"/><path d="M7 6c-2-1-4 0-4 0M17 6c2-1 4 0 4 0"/></svg>',
  kidneys: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M9 4C6 4 4 7 4 11s2 9 4 9 2.5-2.5 2.5-5S12 4 9 4Zm6 0c3 0 5 3 5 7s-2 9-4 9-2.5-2.5-2.5-5S15 4 15 4Z"/></svg>'
}

export function initOrganExplorer(root, { initialId = null, hashAware = false } = {}) {
  initShared()

  const q = (sel) => root.querySelector(sel)
  const qa = (sel) => root.querySelectorAll(sel)

  const rail = q('.sci-rail')
  const stageEl = q('.sci-stage')
  const hotspotLayer = q('.hotspot-layer')
  const canvas = q('.explorer-canvas')
  if (!rail || !stageEl || !canvas) return null

  const viewer = initScienceViewer(canvas, hotspotLayer)

  const els = {
    organName: q('.organ-name'),
    organSub: q('.organ-sub'),
    condName: q('.cond-name'),
    condTagline: q('.cond-tagline'),
    paneHappening: q('.pane-happening'),
    paneNote: q('.pane-note'),
    causeChips: q('.cause-chips'),
    symptomChips: q('.symptom-chips'),
    remedyList: q('.remedy-list'),
    info: q('.sci-info'),
    cta: q('.cond-cta')
  }

  function railBtn(id, cond) {
    const btn = document.createElement('button')
    btn.className = 'sci-btn'
    btn.dataset.id = id
    btn.innerHTML = `${icons[cond.organ]}<span class="t"><strong>${cond.name}</strong><small>of the ${ORGAN_META[cond.organ].label.replace('The ', '').toLowerCase()}</small></span>`
    btn.addEventListener('click', () => selectCondition(id))
    return btn
  }

  CONDITION_ORDER.forEach((id) => rail.appendChild(railBtn(id, CONDITIONS[id])))

  /* ---------- info panels ---------- */
  function renderInfo(cond) {
    const meta = ORGAN_META[cond.organ]
    els.organName.textContent = meta.label
    els.organSub.textContent = meta.sub
    els.condName.textContent = cond.name
    els.condTagline.textContent = cond.tagline
    els.paneHappening.textContent = cond.happening
    if (els.paneNote) els.paneNote.textContent = cond.note || ''
    els.causeChips.innerHTML = cond.causes.map((c) => `<span class="chip">${c}</span>`).join('')
    els.symptomChips.innerHTML = cond.symptoms.map((s) => `<span class="chip">${s}</span>`).join('')
    els.remedyList.innerHTML = cond.remedies
      .map(
        (r, i) => `
      <div class="remedy-item">
        <div class="remedy-ico">${i % 2 === 0 ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 21C7 17 3.5 13.5 3.5 9.5 3.5 6 6 3.5 9 3.5c1.5 0 2.5.7 3 1.5.5-.8 1.5-1.5 3-1.5 3 0 5.5 2.5 5.5 6 0 4-3.5 7.5-8.5 11.5Z"/></svg>' : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 2v6m0 0c-4 0-7 3-7 7a7 7 0 0 0 14 0c0-4-3-7-7-7Z"/></svg>'}</div>
        <div><h4>${r.name}</h4><p>${r.note}</p></div>
      </div>`
      )
      .join('')
    if (els.cta) els.cta.href = cond.link || '/contact.html'
  }

  let currentId = null
  function selectCondition(id, animate = true) {
    if (id === currentId || !CONDITIONS[id]) return
    currentId = id
    const cond = CONDITIONS[id]

    rail.querySelectorAll('.sci-btn').forEach((b) => b.classList.toggle('active', b.dataset.id === id))
    showTab('happening')

    const apply = () => {
      renderInfo(cond)
      viewer.setOrgan(cond.organ, cond.hotspots)
      gsap.fromTo(els.info, { opacity: 0, y: 26 }, { opacity: 1, y: 0, duration: 0.65, ease: 'power3.out' })
      const title = q('.sci-overlay-title')
      if (title) gsap.fromTo(title, { opacity: 0 }, { opacity: 1, duration: 0.6 })
    }

    if (animate) {
      gsap.to(els.info, { opacity: 0, y: -18, duration: 0.22, ease: 'power2.in', onComplete: apply })
    } else {
      apply()
    }
  }

  function showTab(name) {
    qa('.sci-tab').forEach((t) => t.classList.toggle('active', t.dataset.tab === name))
    qa('.sci-pane').forEach((p) => p.classList.toggle('active', p.dataset.pane === name))
  }

  qa('.sci-tab').forEach((tab) => tab.addEventListener('click', () => showTab(tab.dataset.tab)))

  q('.zoom-in')?.addEventListener('click', () => viewer.zoom(0.82))
  q('.zoom-out')?.addEventListener('click', () => viewer.zoom(1.22))

  const startId =
    initialId ||
    (hashAware && (location.hash.match(/condition-(\w[\w-]*)/) || [])[1])
  const first = startId && CONDITIONS[startId] ? startId : 'hepatitis-b'
  selectCondition(first, false)

  if (hashAware) {
    window.addEventListener('hashchange', () => {
      const m = (location.hash.match(/condition-(\w[\w-]*)/) || [])[1]
      if (m && CONDITIONS[m]) selectCondition(m)
    })
  }

  /* ---------- cache warming: preload every organ's data+textures
   * so switching conditions never stalls, even on slow devices ---------- */
  let warmed = false
  const warm = () => {
    if (warmed) return
    warmed = true
    Promise.allSettled(
      Object.keys(CONDITIONS).map((k) => {
        const organ = CONDITIONS[k].organ
        return Promise.all([loadGeometry(organ), organTextures(organ)])
      })
    )
  }
  setTimeout(warm, 600)

  return { selectCondition }
}
