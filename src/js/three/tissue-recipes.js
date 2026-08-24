/* ============================================================
 * tissue-recipes.js — PURE color/bump recipes for the organs.
 * Node-safe (no DOM). Each recipe returns, for a texture
 * coordinate (u,v) in [0,1), an RGB triple or scalar given the
 * shared noise layers l (large mottle), m (medium grain) and
 * c2 (fine speckle). Rendered by tissues.js (canvas) and by the
 * node preview tool for iteration.
 * ============================================================ */

const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]
const T = (v) => [v * 255, v * 255, v * 255]
const clamp01 = (v) => Math.min(1, Math.max(0, v))

export const RECIPES = {
  liver: {
    palette: { base: [0.38, 0.13, 0.09], dark: [0.24, 0.07, 0.05], light: [0.47, 0.2, 0.13], grain: 0.34, speckle: 0.1 },
    color(u, v, l, m, c2) {
      let col = mix(this.palette.base, this.palette.dark, Math.max(0, l) * this.palette.grain + Math.max(0, m) * 0.3)
      col = mix(col, this.palette.light, Math.max(0, -l) * this.palette.grain + Math.max(0, -m) * 0.18)
      col = mix(col, this.palette.light, Math.min(1, Math.max(0, c2 - 0.35) * this.palette.speckle * 3))
      // rare greenish patches (bile tint)
      col = mix(col, [0.35, 0.26, 0.12], Math.max(0, -m - 0.55) * 2.2 * 0.3)
      return col
    },
    bump(u, v, l, m, c2) {
      return clamp01(0.55 + m * 0.16 + c2 * 0.14 + Math.max(0, l) * 0.1)
    }
  },

  stomach: {
    palette: { base: [0.66, 0.3, 0.23], dark: [0.5, 0.2, 0.16], light: [0.78, 0.42, 0.3], grain: 0.3, speckle: 0.08 },
    color(u, v, l, m, c2) {
      let col = mix(this.palette.base, this.palette.dark, Math.max(0, l) * this.palette.grain + Math.max(0, m) * 0.3)
      col = mix(col, this.palette.light, Math.max(0, -l) * this.palette.grain + Math.max(0, -m) * 0.16)
      // rugae ridges: subtle lighter streaks
      const fold = Math.sin(u * Math.PI * 2 * 7 + Math.sin(v * Math.PI * 2) * 1.6 + l * 1.5) * 0.5 + 0.5
      col = mix(col, [0.82, 0.5, 0.36], fold * 0.14)
      return col
    },
    bump(u, v, l, m, c2) {
      const fold = Math.sin(u * Math.PI * 2 * 7 + Math.sin(v * Math.PI * 2) * 1.6 + l * 1.5) * 0.5 + 0.5
      return clamp01(0.6 + m * 0.12 + c2 * 0.1 + fold * 0.28)
    }
  },

  kidney: {
    palette: { base: [0.55, 0.24, 0.19], dark: [0.4, 0.14, 0.12], light: [0.64, 0.34, 0.26], grain: 0.28, speckle: 0.1 },
    color(u, v, l, m, c2) {
      let col = mix(this.palette.base, this.palette.dark, Math.max(0, l) * this.palette.grain + Math.max(0, m) * 0.3)
      col = mix(col, this.palette.light, Math.max(0, -l) * this.palette.grain + Math.max(0, -m) * 0.16)
      const stripe = Math.sin(u * Math.PI * 2 * 5 + l * 2) * 0.5 + 0.5
      col = mix(col, this.palette.light, stripe * 0.08)
      return col
    },
    bump(u, v, l, m, c2) {
      const stripe = Math.sin(u * Math.PI * 2 * 5 + l * 2) * 0.5 + 0.5
      return clamp01(0.58 + m * 0.12 + c2 * 0.1 + stripe * 0.12)
    }
  },

  heart: {
    palette: { base: [0.44, 0.1, 0.12], dark: [0.26, 0.05, 0.07], light: [0.56, 0.15, 0.14], grain: 0.3, speckle: 0.12 },
    color(u, v, l, m, c2) {
      let col = mix(this.palette.base, this.palette.dark, Math.max(0, l) * this.palette.grain + Math.max(0, m) * 0.3)
      col = mix(col, this.palette.light, Math.max(0, -l) * this.palette.grain + Math.max(0, -m) * 0.16)
      // epicardial fat blush on the upper region
      col = mix(col, [0.62, 0.44, 0.26], Math.max(0, 0.3 - v) * 0.32 * (1 + m * 0.5))
      return col
    },
    bump(u, v, l, m, c2) {
      const s = Math.sin((u * 1.5 + v * 0.21) * Math.PI * 2 * 9 + l * 2) * 0.5 + 0.5
      return clamp01(0.55 + m * 0.1 + c2 * 0.08 + s * 0.2)
    }
  },

  pancreas: {
    palette: { base: [0.82, 0.62, 0.38], dark: [0.72, 0.5, 0.3], light: [0.9, 0.72, 0.48], grain: 0.25, speckle: 0.08 },
    color(u, v, l, m, c2) {
      // lobulation from low-frequency noise
      const lob = Math.sin(u * Math.PI * 2 * 3 + l * 4) * Math.sin(v * Math.PI * 2 * 3 + l * 3) * 0.5 + 0.5
      let col = mix(this.palette.base, this.palette.dark, (1 - lob) * 0.5 + Math.max(0, m) * 0.2)
      col = mix(col, this.palette.light, lob * 0.55)
      return col
    },
    bump(u, v, l, m, c2) {
      const lob = Math.sin(u * Math.PI * 2 * 3.2 + l * 4) * Math.sin(v * Math.PI * 2 * 3.2 + l * 3.2) * 0.5 + 0.5
      return clamp01(0.5 + lob * 0.28 + c2 * 0.08)
    }
  },

  intestines: {
    palette: { base: [0.78, 0.53, 0.42], dark: [0.62, 0.38, 0.3], light: [0.87, 0.65, 0.52], grain: 0.26, speckle: 0.09 },
    color(u, v, l, m, c2) {
      let col = mix(this.palette.base, this.palette.dark, Math.max(0, l) * this.palette.grain + Math.max(0, m) * 0.3)
      col = mix(col, this.palette.light, Math.max(0, -l) * this.palette.grain + Math.max(0, -m) * 0.16)
      const fold = Math.sin(u * Math.PI * 2 * 11 + l * 1.2) * 0.5 + 0.5
      col = mix(col, this.palette.light, fold * 0.14)
      return col
    },
    bump(u, v, l, m, c2) {
      const fold = Math.sin(u * Math.PI * 2 * 11 + l * 1.2) * 0.5 + 0.5
      return clamp01(0.55 + m * 0.1 + c2 * 0.09 + fold * 0.22)
    }
  },

  pomegranate: {
    palette: { base: [0.55, 0.06, 0.12], dark: [0.36, 0.03, 0.08], light: [0.72, 0.16, 0.22], grain: 0.3, speckle: 0.12 },
    color(u, v, l, m, c2) {
      let col = mix(this.palette.base, this.palette.dark, Math.max(0, l) * 0.55 + Math.max(0, m) * 0.25)
      col = mix(col, this.palette.light, Math.max(0, -l) * 0.45)
      col = mix(col, [0.78, 0.32, 0.3], Math.max(0, -m - c2 * 0.5) * 0.4)
      col = mix(col, [0.82, 0.5, 0.4], Math.min(0.35, Math.max(0, c2 - 0.4) * 0.8))
      return col
    },
    bump(u, v, l, m, c2) {
      const cell = Math.sin(u * Math.PI * 2 * 9 + l * 3) * Math.sin(v * Math.PI * 2 * 9 + m * 3) * 0.5 + 0.5
      return clamp01(0.52 + m * 0.1 + cell * 0.18 + Math.max(0, -c2) * 0.06)
    }
  }
}
