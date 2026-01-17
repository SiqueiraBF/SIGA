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
      '/api/nuntec': {
        target: 'https://nadiana.nuntec.com.br',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/nuntec/, ''),
      },
    },
  },
});
