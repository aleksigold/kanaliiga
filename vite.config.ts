import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/kanaliiga/',
  root: 'src',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
  },
  appType: 'spa',
  server: {
    proxy: {
      '/proxy': {
        target: 'http://localhost:8787',
        rewrite: (path) => path.replace(/^\/proxy/, ''),
      },
    },
  },
});
