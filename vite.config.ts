import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig(() => ({
  plugins: [
    {
      name: 'hvdigital-hc2-dual-view',
      enforce: 'pre',
      transform(code, id) {
        if (!id.replace(/\\/g, '/').endsWith('/src/NewApp.vue')) return null
        const actualizado = code.replace(
          './views/hc2/Hc2View.vue',
          './views/hc2/Hc2DualView.vue',
        )
        return actualizado === code ? null : { code: actualizado, map: null }
      },
    },
    vue(),
  ],
  resolve: {
    alias: {
      '@tauri-apps/api/core': fileURLToPath(new URL('./src/web/tauri-core.ts', import.meta.url)),
      '@tauri-apps/api/event': fileURLToPath(new URL('./src/web/tauri-event.ts', import.meta.url)),
      '@tauri-apps/plugin-sql': fileURLToPath(new URL('./src/web/tauri-sql.ts', import.meta.url)),
      '@tauri-apps/plugin-notification': fileURLToPath(new URL('./src/web/tauri-notification.ts', import.meta.url)),
      '@tauri-apps/plugin-dialog': fileURLToPath(new URL('./src/web/tauri-dialog.ts', import.meta.url)),
      '@tauri-apps/plugin-opener': fileURLToPath(new URL('./src/web/tauri-opener.ts', import.meta.url)),
    },
  },
  clearScreen: false,
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api': {
        target: process.env.HVDIGITAL_API_URL || 'http://127.0.0.1:8080',
        changeOrigin: true,
      },
    },
  },
}))
