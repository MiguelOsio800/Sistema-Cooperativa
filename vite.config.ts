import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
        // AGREGA ESTO:
        proxy: {
          '/api': {
            target: 'https://4wt9b8zl-5000.use2.devtunnels.ms/',
            changeOrigin: true,
            secure: false, 
            // Esto ayuda a saltar algunas restricciones de túneles
            headers: {
              'ngrok-skip-browser-warning': 'true',
              'User-Agent': 'Node/Vite-Proxy'
            }
          }
        }
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});