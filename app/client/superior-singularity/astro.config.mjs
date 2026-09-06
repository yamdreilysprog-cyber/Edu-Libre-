import { defineConfig } from 'astro/config';

export default defineConfig({
  output: 'server',
  vite: {
    server: {
      proxy: {
        '/api': {
          target: 'http://localhost:3001',
          changeOrigin: true,
          secure: false,
        },
      },
    },
  },
});
