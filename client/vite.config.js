import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react()],
    server: {
      host: '127.0.0.1',
      port: 5175,
      strictPort: true,
      proxy: {
        '/api': { target: env.API_TARGET || 'http://127.0.0.1:8000', changeOrigin: true },
        '/health': { target: env.API_TARGET || 'http://127.0.0.1:8000', changeOrigin: true },
      },
    },
    build: { sourcemap: false },
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: './tests/setup.js',
      include: ['src/**/*.test.{js,jsx}'],
    },
  };
});
