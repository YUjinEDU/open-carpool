/// <reference types="vitest" />
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';

const naverProxy = (route: string, upstreamPath: string, env: Record<string, string>) => ({
  target: 'https://maps.apigw.ntruss.com',
  changeOrigin: true,
  rewrite: (p: string) => `${upstreamPath}${p.replace(route, '')}`,
  headers: {
    'X-NCP-APIGW-API-KEY-ID': env.VITE_NAVER_CLIENT_ID || '',
    'X-NCP-APIGW-API-KEY': env.NAVER_CLIENT_SECRET || '',
  },
});

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      // Dev-only mirror of the Vercel functions in api/naver/*.
      proxy: {
        '/api/naver/geocode': naverProxy('/api/naver/geocode', '/map-geocode/v2/geocode', env),
        '/api/naver/reverse-geocode': naverProxy('/api/naver/reverse-geocode', '/map-reversegeocode/v2/gc', env),
      },
    },
    build: {
      rollupOptions: {
        output: {
          // Vendor chunks change far less often than app code, so browsers keep them cached across deploys.
          manualChunks(id: string) {
            if (!id.includes('node_modules')) return undefined;
            if (/[\\/]node_modules[\\/](firebase|@firebase)[\\/]/.test(id)) return 'firebase';
            if (/[\\/]node_modules[\\/](react|react-dom|react-router|scheduler)[\\/]/.test(id)) return 'react';
            return undefined;
          },
        },
      },
    },
    preview: {
      host: '0.0.0.0',
      port: 4173,
      strictPort: true,
    },
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
      include: ['src/**/*.test.{ts,tsx}', 'api/**/*.test.ts'],
    },
  };
});
