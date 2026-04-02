import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    host: true,
    proxy: {
      // Serverless function proxy → local dev server (node api/audit-dev-server.mjs)
      '/api/audit': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      // Nuntec direct proxy (used by other integrations)
      '/api/nuntec': {
        target: 'https://nadiana.nuntec.com.br',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/nuntec/, ''),
      },
    },
  },
  build: {
    chunkSizeWarningLimit: 2000,
  },
});
