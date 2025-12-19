import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import legacy from '@vitejs/plugin-legacy';

export default defineConfig({
  plugins: [
    react(),
    legacy({
      targets: ['chrome >= 87', 'safari >= 13', 'edge >= 88'],
      renderLegacyChunks: true,
      modernPolyfills: true,
    }),
  ],
  build: {
    target: 'es2015',
  },
});