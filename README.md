# Bashman Natural Medicine — Website

A cinematic, 3D-first marketing site for **Bashman Natural Medicine** — a prophetic & herbal medicine practice treating Hepatitis B, ulcers and chronic illness.

Built with **Vite (MPA) · Three.js · GSAP ScrollTrigger · Lenis**. Every organ is procedurally generated geometry — no external model downloads.

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
        │   ├── organs.js   # procedural liver, stomach, kidneys, heart, pancreas, intestines
        │   ├── hero.js     # home healing-core scene
        │   ├── science-viewer.js
        │   └── landing-scene.js
        └── pages/*.js      # per-page entry scripts
```

## Disclaimer

This site presents complementary wellness services rooted in prophetic medicine and herbal practice. It does not replace medical diagnosis or emergency care; testimonials reflect individual experiences.
