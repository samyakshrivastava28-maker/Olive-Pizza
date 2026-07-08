import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version || '1.0.0'),
  },
  build: {
    outDir: 'dist/client',
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router'],
          'vendor-firebase': ['firebase/app', 'firebase/firestore', 'firebase/auth'],
          'vendor-motion': ['framer-motion'],
          'vendor-leaflet': ['leaflet', 'react-leaflet'],
          'vendor-supabase': ['@supabase/supabase-js'],
          'vendor-ui': ['lucide-react', 'react-hot-toast'],
          'vendor-state': ['zustand'],
          'vendor-three': ['three', '@react-three/fiber', '@react-three/drei'],
          'vendor-charts': ['chart.js', 'react-chartjs-2'],
          'vendor-utils': ['date-fns', 'html2canvas', 'jspdf']
        }
      }
    }
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate', // Automatically updates the PWA without requiring user interaction
      includeAssets: [
        'favicon.ico', 
        'apple-touch-icon.png', 
        'icons/icon-192x192.webp',
        'icons/icon-256x256.webp',
        'icons/icon-384x384.webp',
        'icons/icon-512x512.webp',
        'icons/maskable-icon-512x512.webp',
        'icons/apple-touch-icon-180x180.webp'
      ],
      manifest: {
        name: 'Olive Pizza',
        short_name: 'Olive Pizza',
        description: 'Premium mobile-first pizza ordering platform',
        theme_color: '#020617', // Dark-950 background
        background_color: '#020617',
        display: 'standalone',
        orientation: 'portrait-primary',
        categories: ['food', 'lifestyle', 'shopping'],
        icons: [
          {
            src: '/icons/icon-192x192.webp',
            sizes: '192x192',
            type: 'image/webp'
          },
          {
            src: '/icons/icon-256x256.webp',
            sizes: '256x256',
            type: 'image/webp'
          },
          {
            src: '/icons/icon-384x384.webp',
            sizes: '384x384',
            type: 'image/webp'
          },
          {
            src: '/icons/icon-512x512.webp',
            sizes: '512x512',
            type: 'image/webp'
          },
          {
            src: '/icons/maskable-icon-512x512.webp',
            sizes: '512x512',
            type: 'image/webp',
            purpose: 'maskable'
          },
          {
            src: '/icons/apple-touch-icon-180x180.webp',
            sizes: '180x180',
            type: 'image/webp'
          }
        ],
        shortcuts: [
          {
            name: 'Order Pizza',
            short_name: 'Order',
            description: 'Order your favorite pizza',
            url: '/menu',
            icons: [{ src: '/icons/icon-192x192.webp', sizes: '192x192' }]
          },
          {
            name: 'My Orders',
            short_name: 'Orders',
            description: 'Track your recent orders',
            url: '/customer/dashboard',
            icons: [{ src: '/icons/icon-192x192.webp', sizes: '192x192' }]
          },
          {
            name: 'View Cart',
            short_name: 'Cart',
            description: 'View items in your cart',
            url: '/cart',
            icons: [{ src: '/icons/icon-192x192.webp', sizes: '192x192' }]
          }
        ]
      },
      workbox: {
        maximumFileSizeToCacheInBytes: 10000000,
        cleanupOutdatedCaches: true,
        navigateFallback: '/index.html',
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,jpg,jpeg}'],
        runtimeCaching: [
          {
            // API requests must NEVER be cached — always go to network
            urlPattern: /^\/api\/.*/i,
            handler: 'NetworkOnly',
            options: { cacheName: 'api-never-cache' }
          },
          {
            // Firebase Auth and securetoken MUST go to network
            urlPattern: /^https:\/\/.*\.googleapis\.com\/.*/i,
            handler: 'NetworkOnly',
            options: { cacheName: 'firebase-googleapis' }
          },
          {
            urlPattern: /^https:\/\/securetoken\.googleapis\.com\/.*/i,
            handler: 'NetworkOnly',
            options: { cacheName: 'firebase-securetoken' }
          },
          {
            urlPattern: /^https:\/\/res\.cloudinary\.com\/.*\/image\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'cloudinary-images',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 30 * 24 * 60 * 60 // 30 Days
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'google-fonts-stylesheets',
            }
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-webfonts',
              expiration: {
                maxEntries: 30,
                maxAgeSeconds: 365 * 24 * 60 * 60 // 1 year
              }
            }
          }
        ]
      }
    })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
  server: {
    hmr: process.env.DISABLE_HMR !== 'true',
    watch: process.env.DISABLE_HMR === 'true' ? null : {},
  },
});
