import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000, // Set the port for Vite dev server (default is 5173)
    proxy: {
      // Proxy API requests to the backend Express server
      '/api': {
        target: 'http://localhost:8081',  // Express server URL
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
