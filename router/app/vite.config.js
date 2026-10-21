import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import devServer from '@hono/vite-dev-server'

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 8788,
    host: '0.0.0.0',
  },
  plugins: [
    devServer({
      entry: 'src/index.js',
      exclude: [/^\/(node_modules|@vite|@fs).*/],
    }),
  ],
})