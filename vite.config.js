import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

export default defineConfig({
  plugins: [
    react(),
    // Service Worker de la PWA "Taller" (scope /workshop/). El manifest y el
    // registro del SW los maneja frontend/src/pwa/PwaBootstrap.jsx a mano
    // (solo mobile + módulo "workshop" habilitado), por eso manifest:false e
    // injectRegister:null — este plugin solo compila src/pwa/sw.js con Workbox.
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src/pwa',
      filename: 'workshop-sw.js',
      manifest: false,
      injectRegister: null,
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,svg,png,webmanifest}'],
        // El bundle principal es una sola SPA (~2.3MB sin comprimir) — ver
        // limitación documentada en el plan PWA: precachear todo el shell
        // requiere subir el límite por defecto de Workbox (2MiB).
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
      },
    }),
  ],
  server: {
    port: 5172,
    host: true
  },
  resolve: {
    // Activa la versión inlined de @undecaf/zbar-wasm (WASM embebido como base64)
    // Esto evita que Vite intente servir el archivo .wasm por separado
    conditions: ['zbar-inlined'],
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@api': path.resolve(__dirname, './src/api'),
      '@components': path.resolve(__dirname, './src/components'),
      '@store': path.resolve(__dirname, './src/store'),
      '@utils': path.resolve(__dirname, './src/utils'),
      '@pages': path.resolve(__dirname, './src/pages'),
      '@hooks': path.resolve(__dirname, './src/hooks'),
      '@assets': path.resolve(__dirname, './src/assets'),
      '@services': path.resolve(__dirname, './src/services'),
    }
  },
  build: {
    sourcemap: false,
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (!id.includes('node_modules')) return undefined;

          // Librerías pesadas o muy independientes primero
          if (id.includes('/xlsx/')) return 'vendor-xlsx';
          if (id.includes('/recharts/') || id.includes('/d3-')) return 'vendor-charts';
          if (id.includes('jsbarcode') || id.includes('@zxing') || id.includes('quagga') || id.includes('zbar-wasm')) return 'vendor-barcode';
          if (id.includes('@heroicons') || id.includes('lucide-react')) return 'vendor-icons';
          if (id.includes('/date-fns/')) return 'vendor-date';
          if (id.includes('/axios/')) return 'vendor-http';
          if (id.includes('react-hot-toast')) return 'vendor-toast';
          // Dejamos que el resto (incluyendo react, react-dom, router, state, forms, headlessui, etc.)
          // se resuelvan automáticamente para evitar dependencias circulares entre chunks manuales.
          return undefined;
        }
      }
    }
  }
})
