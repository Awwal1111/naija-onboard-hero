import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from 'vite-plugin-pwa';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  define: {
    // Unique build ID per deploy — used by cacheHealer to detect stale caches
    'import.meta.env.VITE_BUILD_ID': JSON.stringify(Date.now().toString(36)),
  },
  server: {
    host: "::",
    port: 8080,
    // Allow ngrok hosts for MiniPay testing (per docs)
    allowedHosts: [".ngrok.app", ".ngrok-free.dev", ".ngrok-free.app"],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'charts': ['recharts'],
          'ui': ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', '@radix-ui/react-tabs', '@radix-ui/react-select'],
          'supabase': ['@supabase/supabase-js'],
          'utils': ['date-fns', 'clsx', 'tailwind-merge']
        }
      }
    },
    chunkSizeWarningLimit: 1000
  },
  plugins: [
    react(),
    mode === 'development' && componentTagger(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        maximumFileSizeToCacheInBytes: 10 * 1024 * 1024, // 10 MB
        // CRITICAL FIX: Do NOT precache HTML - it causes stale app on refresh
        // Only cache static assets (JS, CSS, images, fonts)
        globPatterns: ['**/*.{js,css,ico,png,svg,jpg,jpeg,gif,woff,woff2}'],
        // No navigateFallback - let the browser fetch index.html from network
        // This prevents serving stale HTML that references outdated JS bundles
        navigateFallbackDenylist: [/.*/],
        // Force immediate activation of new service workers
        skipWaiting: true,
        clientsClaim: true,
        // Clean up old caches from previous SW versions
        cleanupOutdatedCaches: true,
        // No runtime caching - all API/auth calls go to network
        runtimeCaching: []
      },
      manifest: {
        name: 'NaijaLancers - Connect, Earn & Grow',
        short_name: 'NaijaLancers',
        description: 'Nigerian freelance and professional networking platform',
        theme_color: '#10b981',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/main-feed',
        icons: [
          {
            src: '/logo.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ],
        categories: ['social', 'business', 'productivity'],
        screenshots: [
          {
            src: '/logo.png',
            sizes: '540x720',
            type: 'image/png'
          }
        ]
      }
    })
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
