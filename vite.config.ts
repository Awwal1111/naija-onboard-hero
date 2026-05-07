import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from 'vite-plugin-pwa';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Explicitly log environment variables for debugging
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  const supabaseProjectId = process.env.VITE_SUPABASE_PROJECT_ID;

  if (mode === 'production') {
    console.log('[Vite Build] Production Environment:');
    console.log('  VITE_SUPABASE_URL:', supabaseUrl ? '✓ SET' : '✗ MISSING');
    console.log('  VITE_SUPABASE_PUBLISHABLE_KEY:', supabaseKey ? '✓ SET (' + supabaseKey.substring(0, 20) + '...)' : '✗ MISSING');
    console.log('  VITE_SUPABASE_PROJECT_ID:', supabaseProjectId ? '✓ SET' : '✗ MISSING');
  }

  return {
  define: {
    'import.meta.env.VITE_BUILD_ID': JSON.stringify(Date.now().toString(36)),
  },
  server: {
    host: "::",
    port: 8080,
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
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      registerType: 'autoUpdate',
      injectRegister: false,
      devOptions: {
        enabled: false,
      },
      injectManifest: {
        maximumFileSizeToCacheInBytes: 10 * 1024 * 1024,
        globPatterns: ['**/*.{js,css,ico,png,svg,jpg,jpeg,gif,woff,woff2}'],
      },
      workbox: {
        navigateFallbackDenylist: [/^\/~oauth/],
      },
      manifest: {
        name: 'NaijaLancers - Connect, Earn & Grow',
        short_name: 'NaijaLancers',
        description: 'Nigerian freelance and professional networking platform',
        theme_color: '#10b981',
        background_color: '#ffffff',
        display: 'standalone',
        display_override: ['standalone', 'minimal-ui'],
        orientation: 'any',
        dir: 'ltr',
        lang: 'en',
        scope: '/',
        start_url: '/main-feed',
        id: '/main-feed',
        launch_handler: {
          client_mode: 'focus-existing'
        } as any,
        share_target: {
          action: '/main-feed',
          method: 'GET',
          params: { title: 'title', text: 'text', url: 'url' }
        } as any,
        icons: [
          {
            src: '/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/icon-384.png',
            sizes: '384x384',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ],
        categories: ['social', 'business', 'productivity'],
        screenshots: [
          {
            src: '/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            form_factor: 'narrow',
            label: 'NaijaLancers - Nigeria\'s Freelance Platform'
          }
        ] as any
      }
    })
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
};
});
