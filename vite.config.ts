import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  root: 'src',
  base: '/kanaliiga/',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
  },
  appType: 'spa',
});
