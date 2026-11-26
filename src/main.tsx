import { createRoot } from 'react-dom/client'
import { HelmetProvider } from 'react-helmet-async'
import App from './App.tsx'
import './index.css'
import { QueryProvider } from "./providers/QueryProvider"
import { ThemeProvider } from "next-themes"
import { LanguageProvider } from "./hooks/useLanguage"
import { CurrencyProvider } from "./hooks/useCurrency"
import { TimezoneProvider } from "./hooks/useTimezone"
import { detectMiniPaySync } from './lib/minipay'
import { checkAndHealCache } from './utils/cacheHealer'

// SYNC detection at module load
const isMiniPayEnv = detectMiniPaySync().isMiniPay;

// --- PWA Service Worker Guard ---
// Only register SW in production on the real domain, never in iframes or preview hosts
const isInIframe = (() => {
  try { return window.self !== window.top; } catch { return true; }
})();
const isPreviewHost =
  window.location.hostname.includes('id-preview--') ||
  window.location.hostname.includes('lovableproject.com') ||
  window.location.hostname.includes('localhost');

if (isPreviewHost || isInIframe) {
  // Unregister any existing service workers in preview/iframe contexts
  navigator.serviceWorker?.getRegistrations().then((registrations) => {
    registrations.forEach((r) => r.unregister());
  });
} else if (!isMiniPayEnv) {
  // Register SW manually in production only
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' }).then((reg) => {
        console.log('[SW] Registered:', reg.scope);
      }).catch((err) => {
        console.warn('[SW] Registration failed:', err);
      });
    });
  }
  // Auto-heal stale caches from previous deploys
  checkAndHealCache();
}

// Prevent mobile browser from refreshing on orientation change
if (!isMiniPayEnv) {
  window.addEventListener('orientationchange', (e) => {
    e.preventDefault();
  });
}

// Handle page lifecycle to prevent unnecessary reloads
if (!isMiniPayEnv) {
  let isPageHidden = false;
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      isPageHidden = true;
    } else if (isPageHidden) {
      isPageHidden = false;
    }
  });
}

const root = createRoot(document.getElementById("root")!)
root.render(
  <HelmetProvider>
    <QueryProvider>
      <ThemeProvider defaultTheme="system" storageKey="naijalancers-theme" attribute="class">
        <LanguageProvider>
          <CurrencyProvider>
            <TimezoneProvider>
              <App />
            </TimezoneProvider>
          </CurrencyProvider>
        </LanguageProvider>
      </ThemeProvider>
    </QueryProvider>
  </HelmetProvider>
);

// Only clear chunk-recovery history after lazy route chunks have had time to
// load. Clearing it at entrypoint startup erased the retry counter too early.
window.setTimeout(() => {
  import('./utils/chunkErrorHandler').then(({ clearReloadTracking }) => clearReloadTracking())
}, 30_000)
