# Bashman Natural Medicine — Website

A cinematic, 3D-first marketing site for **Bashman Natural Medicine** — a prophetic & herbal medicine practice treating Hepatitis B, ulcers and chronic illness.

Built with **Vite (MPA) · Three.js · GSAP ScrollTrigger · Lenis**. Every organ and the homepage pomegranate centrepiece are sculpted procedurally (smooth-blended signed-distance fields → watertight surface-net meshing → analytic normals → handmade PBR textiles) — no external model downloads.

## Pages

| Route | Purpose |
|---|---|
| `/` (index.html) | Flagship home — 3D healing-core hero, conditions grid, horizontal scroll journey, video testimony, stats, method |
| `/science.html` | **Why We Get Sick** — interactive 3D organ explorer: pick a sickness → rotate a life-like organ, tap hotspots, read cause & natural treatment |
| `/hepatitis-b.html` | Ad conversion landing page for Hepatitis B campaigns (pinned scroll-story liver scene) |
| `/ulcer.html` | Ad conversion landing page for Ulcer campaigns (pinned scroll-story stomach scene) |
| `/treatments.html` | All treatments & the Bashman Method |
| `/about.html` | Bashman's story, values, journey |
| `/testimonials.html` | Video + written healing stories with animated counters |
| `/contact.html` | Booking form, contact channels |

## Develop

```bash
npm install
npm run dev        # local dev server
npm run build      # production build → dist/
npm run preview    # serve the built site
```

Deploy `dist/` to any static host (Netlify, Vercel, Cloudflare Pages, GitHub Pages). For sub-path hosting (e.g. GitHub Pages), add `base: '/repo-name/'` to `vite.config.js`.

## Customize before launch

- **Phone/WhatsApp**: search all HTML for `2348030000000` and replace.
- **Email**: replace `hello@bashmanheals.com`.
- **Media**: `public/media/bashman-portrait.jpeg`, `bashman-testimony-720.mp4` (+360 fallback).
- **Testimonials/copy**: edit directly in each HTML file; science condition data lives in `src/js/data/conditions.js`.
- **Form delivery**: forms currently show an on-page success state (`data-fake`). Wire them to Formspree/Getform or a WhatsApp deep-link when ready.

## Structure

```
├── *.html                  # 8 pages (Vite MPA inputs)
├── public/media/           # photo + testimonial videos
└── src/
    ├── styles/main.css     # full design system
    └── js/
        ├── main.js         # Lenis smooth scroll, GSAP reveals, counters, nav, forms
        ├── data/conditions.js
        ├── three/
        │   ├── core.js     # renderer/env/lights/particle helpers
        │   ├── sculpt.js   # SDF engine: primitives, smooth ops, marching + smoothing
        │   ├── tissues.js  # seamless PBR texture painters (canvas)
        │   ├── tissue-recipes.js # pure color/bump recipes (node-safe previews)
        │   ├── organs.js   # sculpted liver, stomach, kidneys, heart, pancreas, intestines
        │   ├── hero.js     # home "Healing Seed" — half-open pomegranate centrepiece
        │   ├── science-viewer.js
        │   └── landing-scene.js
        ├── dev/harness.js  # dev-only organ/hero viewer (devtest.html)
        └── pages/*.js      # per-page entry scripts
```
`devtest.html` is a local dev tool (not part of the build) — run `npm run dev` and open `/devtest.html?organ=heart` (or `?hero=1`) to inspect any 3D asset. `tools/preview.mjs` renders a CPU ray-traced preview of the SDF fields without a browser: `node tools/preview.mjs liver`.

## Disclaimer

This site presents complementary wellness services rooted in prophetic medicine and herbal practice. It does not replace medical diagnosis or emergency care; testimonials reflect individual experiences.
