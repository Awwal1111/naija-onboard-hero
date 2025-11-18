import { createRoot } from 'react-dom/client'
import { HelmetProvider } from 'react-helmet-async'
import App from './App.tsx'
import './index.css'
import { QueryProvider } from "./providers/QueryProvider"
import { ThemeProvider } from "next-themes"

// Register service worker for push notifications
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js', { scope: '/' })
      .then((registration) => {
        console.log('[Push] Service Worker registered successfully:', registration.scope);
      })
      .catch((error) => {
        console.error('[Push] Service Worker registration failed:', error);
      });
  });
}

// Register PWA service worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', { scope: '/' })
      .then((registration) => {
        console.log('[PWA] Service Worker registered successfully:', registration.scope);
        
        // Check for updates periodically
        setInterval(() => {
          registration.update();
        }, 60 * 60 * 1000); // Check every hour
      })
      .catch((error) => {
        console.log('[PWA] Service Worker registration failed:', error);
      });
  });
}

// Prevent mobile browser from refreshing on orientation change
window.addEventListener('orientationchange', (e) => {
  e.preventDefault();
});

// Handle page lifecycle to prevent unnecessary reloads
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

createRoot(document.getElementById("root")!).render(
  <HelmetProvider>
    <QueryProvider>
      <ThemeProvider defaultTheme="system" storageKey="naijalancers-theme" attribute="class">
        <App />
      </ThemeProvider>
    </QueryProvider>
  </HelmetProvider>
);
