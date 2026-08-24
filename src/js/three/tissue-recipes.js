/* ============================================================
 * tissue-recipes.js — PURE per-pixel recipes for the organs:
 * color (sRGB), bump height and roughness (linear), all driven
 * by the same seamless noise layers l (large mottle), m (medium
 * grain), c2 (fine speckle). Node-safe: used by tissues.js
 * (canvas) and the CPU preview tool.
 * ============================================================ */

const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]
const T = (v) => [v * 255, v * 255, v * 255]
const clamp01 = (v) => Math.min(1, Math.max(0, v))

/* wet gloss: organs are glistening — dark crevices stay glossy,
 * dried patches go matte. Shared model, tuned per organ. */
function wetRoughness(u, v, l, m, c2, opts = {}) {
  const min = opts.min ?? 0.12
  const max = opts.max ?? 0.62
  const wet = Math.max(0, m * 0.5 + c2 * 0.5 - 0.05)
  const dry = 0.45 + l * 0.18 + Math.max(0, c2 - 0.3) * 0.2
  return clamp01(Math.min(max, Math.max(min, dry - wet * 0.55)))
}

export const RECIPES = {
  liver: {
    palette: {
      base: [0.36, 0.1, 0.07], dark: [0.2, 0.045, 0.035], light: [0.48, 0.155, 0.1],
      grain: 0.36, speckle: 0.14
    },
    color(u, v, l, m, c2) {
      let col = mix(this.palette.base, this.palette.dark, Math.max(0, l) * this.palette.grain + Math.max(0, m) * 0.32)
      col = mix(col, this.palette.light, Math.max(0, -l) * this.palette.grain + Math.max(0, -m) * 0.2)
      col = mix(col, this.palette.light, Math.min(1, Math.max(0, c2 - 0.32) * this.palette.speckle * 3))
      // fine lobule pores (slightly darker pits)
      const pore = Math.max(0, -c2 - 0.1) * 0.5
      col = mix(col, this.palette.dark, Math.min(0.4, pore))
      // faint olive/pale flecks
      col = mix(col, [0.36, 0.29, 0.13], Math.max(0, -m - 0.5) * 0.5 * 0.3)
      return col
    },
    bump(u, v, l, m, c2) {
      const lob = Math.sin(u * Math.PI * 2 * 9 + l * 3.2) * Math.sin(v * Math.PI * 2 * 9 + l * 2.4) * 0.5 + 0.5
      return clamp01(0.5 + m * 0.14 + c2 * 0.12 + lob * 0.14 + Math.max(0, l) * 0.08)
    },
    roughness: (u, v, l, m, c2) => wetRoughness(u, v, l, m, c2, { min: 0.09, max: 0.5 })
  },

  stomach: {
    palette: {
      base: [0.57, 0.24, 0.19], dark: [0.4, 0.14, 0.11], light: [0.7, 0.34, 0.25],
      grain: 0.32, speckle: 0.1
    },
    color(u, v, l, m, c2) {
      let col = mix(this.palette.base, this.palette.dark, Math.max(0, l) * this.palette.grain + Math.max(0, m) * 0.3)
      col = mix(col, this.palette.light, Math.max(0, -l) * this.palette.grain + Math.max(0, -m) * 0.16)
      const fold = Math.sin(u * Math.PI * 2 * 7 + Math.sin(v * Math.PI * 2) * 1.6 + l * 1.5) * 0.5 + 0.5
      col = mix(col, [0.76, 0.44, 0.3], fold * 0.12)
      // redder ridges
      col = mix(col, [0.66, 0.22, 0.16], Math.max(0, fold - 0.6) * 0.5)
      return col
    },
    bump(u, v, l, m, c2) {
      const fold = Math.sin(u * Math.PI * 2 * 7 + Math.sin(v * Math.PI * 2) * 1.6 + l * 1.5) * 0.5 + 0.5
      return clamp01(0.55 + m * 0.12 + c2 * 0.1 + fold * 0.3)
    },
    roughness: (u, v, l, m, c2) => wetRoughness(u, v, l, m, c2, { min: 0.12, max: 0.55 })
  },

  kidney: {
    palette: {
      base: [0.4, 0.16, 0.12], dark: [0.27, 0.09, 0.075], light: [0.52, 0.24, 0.17],
      grain: 0.3, speckle: 0.1
    },
    color(u, v, l, m, c2) {
      let col = mix(this.palette.base, this.palette.dark, Math.max(0, l) * this.palette.grain + Math.max(0, m) * 0.3)
      col = mix(col, this.palette.light, Math.max(0, -l) * this.palette.grain + Math.max(0, -m) * 0.16)
      const stripe = Math.sin(u * Math.PI * 2 * 5 + l * 2) * 0.5 + 0.5
      col = mix(col, this.palette.light, stripe * 0.09)
      return col
    },
    bump(u, v, l, m, c2) {
      const stripe = Math.sin(u * Math.PI * 2 * 5 + l * 2) * 0.5 + 0.5
      return clamp01(0.55 + m * 0.12 + c2 * 0.1 + stripe * 0.13)
    },
    roughness: (u, v, l, m, c2) => wetRoughness(u, v, l, m, c2, { min: 0.1, max: 0.52 })
  },

  heart: {
    palette: {
      base: [0.38, 0.06, 0.08], dark: [0.23, 0.025, 0.04], light: [0.52, 0.1, 0.1],
      grain: 0.32, speckle: 0.14
    },
    color(u, v, l, m, c2) {
      let col = mix(this.palette.base, this.palette.dark, Math.max(0, l) * this.palette.grain + Math.max(0, m) * 0.3)
      col = mix(col, this.palette.light, Math.max(0, -l) * this.palette.grain + Math.max(0, -m) * 0.16)
      // epicardial fat: buttery streaks toward the atria
      col = mix(col, [0.62, 0.44, 0.24], Math.max(0, v - 0.68) * 0.5 * (1 + m * 0.5))
      // coronary veins: darker channels
      const vein = Math.max(0, -c2 - 0.25) * 0.4
      col = mix(col, this.palette.dark, Math.min(0.5, vein))
      return col
    },
    bump(u, v, l, m, c2) {
      const s = Math.sin((u * 1.5 + v * 0.21) * Math.PI * 2 * 9 + l * 2) * 0.5 + 0.5
      return clamp01(0.5 + m * 0.1 + c2 * 0.08 + s * 0.24)
    },
    roughness: (u, v, l, m, c2) => wetRoughness(u, v, l, m, c2, { min: 0.08, max: 0.45 })
  },

  pancreas: {
    palette: {
      base: [0.76, 0.56, 0.33], dark: [0.62, 0.42, 0.24], light: [0.86, 0.68, 0.42],
      grain: 0.26, speckle: 0.1
    },
    color(u, v, l, m, c2) {
      const lob = Math.sin(u * Math.PI * 2 * 3 + l * 4) * Math.sin(v * Math.PI * 2 * 3 + l * 3) * 0.5 + 0.5
      let col = mix(this.palette.base, this.palette.dark, (1 - lob) * 0.5 + Math.max(0, m) * 0.2)
      col = mix(col, this.palette.light, lob * 0.55)
      return col
    },
    bump(u, v, l, m, c2) {
      const lob = Math.sin(u * Math.PI * 2 * 3.2 + l * 4) * Math.sin(v * Math.PI * 2 * 3.2 + l * 3.2) * 0.5 + 0.5
      return clamp01(0.46 + lob * 0.3 + c2 * 0.08)
    },
    roughness: (u, v, l, m, c2) => wetRoughness(u, v, l, m, c2, { min: 0.22, max: 0.68 })
  },

  intestines: {
    palette: {
      base: [0.66, 0.46, 0.36], dark: [0.52, 0.32, 0.25], light: [0.78, 0.58, 0.45],
      grain: 0.28, speckle: 0.1
    },
    color(u, v, l, m, c2) {
      let col = mix(this.palette.base, this.palette.dark, Math.max(0, l) * this.palette.grain + Math.max(0, m) * 0.3)
      col = mix(col, this.palette.light, Math.max(0, -l) * this.palette.grain + Math.max(0, -m) * 0.16)
      const fold = Math.sin(u * Math.PI * 2 * 11 + l * 1.2) * 0.5 + 0.5
      col = mix(col, this.palette.light, fold * 0.16)
      return col
    },
    bump(u, v, l, m, c2) {
      const fold = Math.sin(u * Math.PI * 2 * 11 + l * 1.2) * 0.5 + 0.5
      return clamp01(0.5 + m * 0.1 + c2 * 0.09 + fold * 0.24)
    },
    roughness: (u, v, l, m, c2) => wetRoughness(u, v, l, m, c2, { min: 0.1, max: 0.5 })
  },

  uterus: {
    palette: {
      base: [0.56, 0.16, 0.17], dark: [0.4, 0.09, 0.1], light: [0.68, 0.25, 0.24],
      grain: 0.3, speckle: 0.1
    },
    color(u, v, l, m, c2) {
      let col = mix(this.palette.base, this.palette.dark, Math.max(0, l) * this.palette.grain + Math.max(0, m) * 0.3)
      col = mix(col, this.palette.light, Math.max(0, -l) * this.palette.grain + Math.max(0, -m) * 0.16)
      const fold = Math.sin(u * Math.PI * 2 * 6 + v * 3 + l * 1.6) * 0.5 + 0.5
      col = mix(col, [0.74, 0.32, 0.3], fold * 0.1)
      return col
    },
    bump(u, v, l, m, c2) {
      const fold = Math.sin(u * Math.PI * 2 * 6 + v * 3 + l * 1.6) * 0.5 + 0.5
      return clamp01(0.52 + m * 0.12 + c2 * 0.1 + fold * 0.22)
    },
    roughness: (u, v, l, m, c2) => wetRoughness(u, v, l, m, c2, { min: 0.12, max: 0.55 })
  },

  pomegranate: {
    palette: { base: [0.44, 0.038, 0.075], dark: [0.28, 0.018, 0.045], light: [0.56, 0.09, 0.12], grain: 0.3, speckle: 0.12 },
    color(u, v, l, m, c2) {
      let col = mix(this.palette.base, this.palette.dark, Math.max(0, l) * 0.6 + Math.max(0, m) * 0.25)
      col = mix(col, this.palette.light, Math.max(0, -l) * 0.45)
      col = mix(col, [0.72, 0.22, 0.2], Math.max(0, -m - c2 * 0.5) * 0.3)
      col = mix(col, [0.72, 0.36, 0.28], Math.min(0.14, Math.max(0, c2 - 0.5) * 0.5))
      return col
    },
    bump(u, v, l, m, c2) {
      const cell = Math.sin(u * Math.PI * 2 * 9 + l * 3) * Math.sin(v * Math.PI * 2 * 9 + m * 3) * 0.5 + 0.5
      return clamp01(0.52 + m * 0.1 + cell * 0.18 + Math.max(0, -c2) * 0.06)
    },
    roughness: (u, v, l, m, c2) => wetRoughness(u, v, l, m, c2, { min: 0.2, max: 0.6 })
  }
}
