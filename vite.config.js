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
        ulcer: resolve(import.meta.dirname, 'ulcer.html')
      }
    }
  },
  server: { host: true }
})
