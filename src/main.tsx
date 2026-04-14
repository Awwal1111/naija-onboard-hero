import { createRoot } from 'react-dom/client'
import { HelmetProvider } from 'react-helmet-async'
import App from './App.tsx'
import './index.css'
import { QueryProvider } from "./providers/QueryProvider"
import { ThemeProvider } from "next-themes"
import { LanguageProvider } from "./hooks/useLanguage"
import { CurrencyProvider } from "./hooks/useCurrency"
import { TimezoneProvider } from "./hooks/useTimezone"
import { UserModeProvider } from "./hooks/useUserMode"
import { detectMiniPaySync } from './lib/minipay'
import { clearReloadTracking } from './utils/chunkErrorHandler'
import { checkAndHealCache } from './utils/cacheHealer'

// SYNC detection at module load
const isMiniPayEnv = detectMiniPaySync().isMiniPay;

// App loaded successfully - clear any chunk reload tracking
clearReloadTracking();

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
  // Only heal cache in production (not preview/iframe)
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

createRoot(document.getElementById("root")!).render(
  <HelmetProvider>
    <QueryProvider>
      <ThemeProvider defaultTheme="system" storageKey="naijalancers-theme" attribute="class">
        <LanguageProvider>
          <CurrencyProvider>
            <TimezoneProvider>
              <UserModeProvider>
                <App />
              </UserModeProvider>
            </TimezoneProvider>
          </CurrencyProvider>
        </LanguageProvider>
      </ThemeProvider>
    </QueryProvider>
  </HelmetProvider>
);
