import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Relative base + hash routing: works at any GitHub Pages path.
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
})
