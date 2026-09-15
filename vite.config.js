import { defineConfig } from 'vite'
import { resolve } from 'node:path'

export default defineConfig({
  appType: 'mpa',
  build: {
    target: 'es2020',
    cssCodeSplit: true,
    rollupOptions: {
      input: {
        index: resolve(import.meta.dirname, 'index.html'),
        about: resolve(import.meta.dirname, 'about.html'),
        treatments: resolve(import.meta.dirname, 'treatments.html'),
        science: resolve(import.meta.dirname, 'science.html'),
        testimonials: resolve(import.meta.dirname, 'testimonials.html'),
        contact: resolve(import.meta.dirname, 'contact.html'),
        'hepatitis-b': resolve(import.meta.dirname, 'hepatitis-b.html'),
        ulcer: resolve(import.meta.dirname, 'ulcer.html'),
        fibroid: resolve(import.meta.dirname, 'fibroid.html'),
        hepatitis: resolve(import.meta.dirname, 'hepatitis.html'),
        'cancer-prevention': resolve(import.meta.dirname, 'cancer-prevention.html'),
        'male-fertility': resolve(import.meta.dirname, 'male-fertility.html'),
        'pcos-wellness': resolve(import.meta.dirname, 'pcos-wellness.html'),
        'immune-booster': resolve(import.meta.dirname, 'immune-booster.html'),
        '404': resolve(import.meta.dirname, '404.html')
      }
    }
  },
  server: { host: true }
})
