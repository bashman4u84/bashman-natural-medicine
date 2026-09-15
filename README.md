# Bashman Natural Medicine — Website

A cinematic, 3D-first marketing site for **Bashman Natural Medicine** — a prophetic & herbal medicine practice treating Hepatitis B, ulcers and chronic illness.

Built with **Vite (MPA) · Three.js · GSAP ScrollTrigger · Lenis**. Every organ and the homepage pomegranate centrepiece are sculpted procedurally (smooth-blended signed-distance fields → watertight surface-net meshing → analytic normals → handmade PBR textiles) — no external model downloads.

## Pages

| Route | Purpose |
|---|---|
| `/` (index.html) | Flagship home — "Healing Garden Arch" hero (instant inline-SVG botanical art on every device; the 3D garden fades in only on capable desktops after idle), conditions grid, horizontal scroll journey, video testimony, stats, method |
| `/science.html` | **Why We Get Sick** — interactive 3D organ explorer: pick a sickness → rotate a life-like organ, tap hotspots, read cause & natural treatment |
| `/hepatitis-b.html` | Ad conversion landing page for Hepatitis B campaigns (pinned scroll-story liver scene) |
| `/ulcer.html` | Ad conversion landing page for Ulcer campaigns (pinned scroll-story stomach scene) |
| `/treatments.html` | All treatments & the Bashman Method (12 programs) |
| `/hepatitis.html` | Ad conversion landing — Hepatitis A–E (lead form, WhatsApp deep-links, proof panel) |
| `/cancer-prevention.html` | Ad conversion landing — cancer prevention (honest no-cure-claims tone) |
| `/male-fertility.html` | Ad conversion landing — oligospermia & azoospermia 72-day renewal |
| `/pcos-wellness.html` | Ad conversion landing — PCOS & female wellness |
| `/immune-booster.html` | Ad conversion landing — immune booster |
| `/404.html` | Branded 404 page (prevents the host's ErrorDocument 500 loop) |
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

- **Phone/WhatsApp**: search all HTML for `2348063091501` and replace.
- **Email**: replace `ceo@bashmannaturalmedicine.com`.
- **Media**: `public/media/bashman-portrait.jpeg`, `bashman-testimony-720.mp4` (+360 fallback).
- **Testimonials/copy**: edit directly in each HTML file; science condition data lives in `src/js/data/conditions.js`.
- **Form delivery**: all forms POST to `public/submit-consultation.php` (copied into the build). It emails admin notifications to the addresses set in the admin dashboard (`config.json`) + sends the visitor a branded confirmation from the business email. Every submission is also logged to `public/admin/leads.json` for the dashboard. Requires a PHP-capable host (cPanel `mail()`); honeypot field `website` drops bots.
- **Admin dashboard**: `/admin/` — login with the business email `ceo@bashmannaturalmedicine.com` and the password set in `public/admin/index.php` (change it from the dashboard after first login). It shows lead stats + a full lead inbox (filter by ad page, mark new/contacted/done, delete) and edits all site variables (brand email, admin notify emails, phone/WhatsApp, business hours, pixel IDs, email disclaimer). `config.json` + `leads.json` live in `public/admin/` and are web-denied by `admin/.htaccess`. **Deploy note: the deploy script excludes the `admin` folder from deletion so these runtime data files survive redeploys.**
- **Ad pixels (FB/TikTok)**: each conversion landing page's `<head>` contains Meta + TikTok pixel scripts with `YOUR_META_PIXEL_ID` / `YOUR_TIKTOK_PIXEL_ID` placeholders. Replace those with your real Pixel IDs. `main.js` fires `Lead` (Meta) / `SubmitForm` (TikTok) on successful form submit and on any `.wa-track` WhatsApp click — safe no-ops if the pixel isn't loaded.
- **Conversion landings**: the 5 disease pages (hepatitis, cancer-prevention, male-fertility, pcos-wellness, immune-booster) are mobile-first ad landings: WhatsApp deep-links per condition (`wa.me/2348063091501?text=…`), lead form with name/phone/email, practitioner proof panel, symptom hooks, 3-phase protocol, testimonials, FAQ, sticky call/WhatsApp bar. Copy lives in the HTML; condition-specific WhatsApp text is in the `WA_LINK` anchors.
- **`.htaccess`** (server, preserved by deploys) maps extensionless URLs (`/hepatitis-b` → `.html`) and serves `404.html` for missing paths to avoid the host's ErrorDocument 500 loop.

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
        │   ├── hero.js     # home hero garden still-life — mounted inside the hero arch, lazy-loaded
        │   ├── science-viewer.js
        │   └── landing-scene.js
        ├── dev/harness.js  # dev-only organ/hero viewer (devtest.html)
        └── pages/*.js      # per-page entry scripts
```
`devtest.html` is a local dev tool (not part of the build) — run `npm run dev` and open `/devtest.html?organ=heart` (or `?hero=1`) to inspect any 3D asset.

**After changing any organ/ingredient shape, regenerate the lazy-loaded 3D chunks:** `npm run bake` (bakes `src/js/three/organ-data/*.js` — the browser never sculpts at runtime; this is what keeps the 3D pages fast). `tools/preview.mjs` renders a CPU ray-traced preview of the SDF fields without a browser: `node tools/preview.mjs liver`.

## Disclaimer

This site presents complementary wellness services rooted in prophetic medicine and herbal practice. It does not replace medical diagnosis or emergency care; testimonials reflect individual experiences.
