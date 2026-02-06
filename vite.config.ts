import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteStaticCopy } from 'vite-plugin-static-copy';

export default defineConfig({
  plugins: [
    react(),
    viteStaticCopy({
      targets: [
        {
          src: '../node_modules/@jimp/plugin-print/fonts/open-sans/open-sans-128-white/*',
          dest: './',
        },
      ],
    }),
  ],
  base: '/kanaliiga/',
  root: 'src',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        app: './src/index.html',
        serviceworker: './src/serviceworker.ts',
      },
      output: {
        entryFileNames: ({ name }) => {
          if (name === 'serviceworker') {
            return '[name].js';
          }
          return `assets/[name]-[hash].js`;
        },
      },
    },
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
