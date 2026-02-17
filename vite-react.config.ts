import { defineConfig } from 'vite';
import { resolve } from 'path';
import dts from 'vite-plugin-dts';

export default defineConfig({
  plugins: [
    dts({
      include: ['react/**/*'],
      outDir: 'dist/react',
      rollupTypes: true,
      tsconfigPath: './tsconfig.react.json',
    }),
  ],
  build: {
    lib: {
      entry: resolve(__dirname, 'react/index.tsx'),
      name: 'CISmartCropReact',
      formats: ['es'],
      fileName: () => 'index.mjs',
    },
    outDir: 'dist/react',
    rollupOptions: {
      external: ['react', 'react-dom', 'js-cloudimage-smart-crop-preview'],
      output: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM',
        },
      },
    },
    sourcemap: true,
    minify: 'esbuild',
  },
});
