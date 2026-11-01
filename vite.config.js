import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';

// base relativa: funziona su GitHub Pages in qualunque sottocartella
export default defineConfig({
  base: './',
  plugins: [preact()],
});
