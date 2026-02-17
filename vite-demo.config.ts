import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  root: resolve(__dirname, 'demo'),
  base: './',
  server: {
    port: 3000,
    open: true,
  },
  build: {
    outDir: resolve(__dirname, 'dist-demo'),
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      'js-cloudimage-smart-crop-preview': resolve(__dirname, 'src/index.ts'),
      'js-cloudimage-smart-crop-preview/css': resolve(__dirname, 'src/styles/index.css'),
    },
  },
});
