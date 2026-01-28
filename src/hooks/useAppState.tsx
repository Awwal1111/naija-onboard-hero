import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { detectMiniPaySync } from '@/lib/minipay';

// SYNC check at module load - prevents async calls in MiniPay
const isMiniPayEnv = detectMiniPaySync().isMiniPay;

/**
 * Custom hook to persist navigation state and restore it when the app comes back from background
 * 
 * CRITICAL: In MiniPay, this hook is COMPLETELY DISABLED
 * We return early BEFORE any React hooks to prevent re-renders
 */
export const useAppState = () => {
  // CRITICAL: Check MiniPay BEFORE any hooks to prevent re-renders
  // This is a conditional hook call but safe because isMiniPayEnv is constant
  if (isMiniPayEnv) {
    return null;
  }

  // Only call these hooks in non-MiniPay environment
  return useAppStateInternal();
};

// Internal hook that only runs in non-MiniPay environments
const useAppStateInternal = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const hasRunRef = useRef(false);

  useEffect(() => {
    // Save current route on every navigation (non-MiniPay only)
    const routeData = {
      path: location.pathname + location.search,
      timestamp: Date.now()
    };
    sessionStorage.setItem('lastRoute', JSON.stringify(routeData));
    localStorage.setItem('lastRoute', JSON.stringify(routeData));
  }, [location]);

  useEffect(() => {
    // Only run once
    if (hasRunRef.current) return;
    hasRunRef.current = true;

    // Restore last route on mount (if app was killed and restarted)
    const restoreLastRoute = () => {
      try {
        const savedRoute = sessionStorage.getItem('lastRoute') || localStorage.getItem('lastRoute');
        if (savedRoute) {
          const routeData = JSON.parse(savedRoute);
          const timeDiff = Date.now() - routeData.timestamp;
          // Only restore if less than 1 hour old and not already on that route
          if (timeDiff < 60 * 60 * 1000 && routeData.path !== location.pathname + location.search) {
            console.log('[AppState] Restoring last route:', routeData.path);
            navigate(routeData.path, { replace: true });
          }
        }
      } catch (error) {
        console.error('[AppState] Error restoring route:', error);
      }
    };

    // Only restore on initial mount (check if app was just launched)
    const hasRestoredRef = sessionStorage.getItem('hasRestored');
    if (!hasRestoredRef) {
      restoreLastRoute();
      sessionStorage.setItem('hasRestored', 'true');
    }
  }, []); // Only run once on mount

  useEffect(() => {
    // Handle page visibility changes (app minimize/resume)
    const handleVisibilityChange = () => {
      const currentPath = location.pathname + location.search;
      
      if (!document.hidden) {
        // App is coming back to foreground - only restore if needed
        try {
          const savedRoute = sessionStorage.getItem('lastRoute') || localStorage.getItem('lastRoute');
          if (savedRoute) {
            const routeData = JSON.parse(savedRoute);
            const timeDiff = Date.now() - routeData.timestamp;
            
            // Only restore if less than 1 hour old and not on the saved route
            if (timeDiff < 60 * 60 * 1000 && routeData.path !== currentPath) {
              navigate(routeData.path, { replace: true });
            }
          }
        } catch (error) {
          console.error('[AppState] Error restoring on resume:', error);
        }
      } else {
        // App is going to background - save current state
        const routeData = {
          path: currentPath,
          timestamp: Date.now()
        };
        sessionStorage.setItem('lastRoute', JSON.stringify(routeData));
        localStorage.setItem('lastRoute', JSON.stringify(routeData));
      }
    };

    // Handle focus/blur events
    const handleBlur = () => {
      const routeData = {
        path: location.pathname + location.search,
        timestamp: Date.now()
      };
      sessionStorage.setItem('lastRoute', JSON.stringify(routeData));
      localStorage.setItem('lastRoute', JSON.stringify(routeData));
    };

    // Save state before page unload
    const handleBeforeUnload = () => {
      const routeData = {
        path: location.pathname + location.search,
        timestamp: Date.now()
      };
      sessionStorage.setItem('lastRoute', JSON.stringify(routeData));
      localStorage.setItem('lastRoute', JSON.stringify(routeData));
    };

    // Add event listeners
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pagehide', handleBeforeUnload);

    // Cleanup
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pagehide', handleBeforeUnload);
    };
  }, [location, navigate]);

  return null;
};
