import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
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
