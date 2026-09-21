import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // /api/* se reenvía al api-gateway; así no hace falta configurar CORS en Spring
      '/api': 'http://localhost:8080',
    },
  },
});