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

// Auto-heal stale caches from previous deploys
// CRITICAL: Must complete BEFORE React renders to avoid reload mid-render
if (!isMiniPayEnv) {
  // Run cache heal but don't block render — the heal will reload if needed
  // Delay slightly to avoid racing with auth state restoration
  setTimeout(() => checkAndHealCache(), 500);
}

// Service worker is handled automatically by VitePWA plugin (registerType: 'autoUpdate')
// Do NOT manually register a service worker here - it conflicts with VitePWA's sw.js

// Prevent mobile browser from refreshing on orientation change
// DISABLED in MiniPay - can cause flickering
if (!isMiniPayEnv) {
  window.addEventListener('orientationchange', (e) => {
    e.preventDefault();
  });
}

// Handle page lifecycle to prevent unnecessary reloads
// DISABLED in MiniPay - visibility changes can cause re-renders
if (!isMiniPayEnv) {
  let isPageHidden = false;
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      isPageHidden = true;
      console.log('[Lifecycle] Page hidden - state preserved');
    } else if (isPageHidden) {
      isPageHidden = false;
      console.log('[Lifecycle] Page visible - state restored');
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
