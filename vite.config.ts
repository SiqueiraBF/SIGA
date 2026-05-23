import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { spawn } from 'child_process';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react()
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    host: true,
    proxy: {
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

