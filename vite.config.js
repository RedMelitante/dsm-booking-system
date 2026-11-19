import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// `npm run dev` serves the frontend with hot reload and proxies /api to a
// local Worker (`npx wrangler dev`, port 8787). `npm run cf:dev` runs both from dist/.
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8787',
        // The Worker rejects cross-origin writes; the dev proxy is same-site in practice.
        configure: (proxy) => proxy.on('proxyReq', (req) => req.removeHeader('origin')),
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
