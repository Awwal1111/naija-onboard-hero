import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

/**
 * Custom hook to persist navigation state and restore it when the app comes back from background
 * This prevents the app from redirecting to the main dashboard when minimized or backgrounded
 */
export const useAppState = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    // Save current route on every navigation
    const routeData = {
      path: location.pathname + location.search,
      timestamp: Date.now()
    };
    sessionStorage.setItem('lastRoute', JSON.stringify(routeData));
    localStorage.setItem('lastRoute', JSON.stringify(routeData));
  }, [location]);

  useEffect(() => {
    // Restore last route on mount (if app was killed and restarted)
    const restoreLastRoute = () => {
      try {
        const savedRoute = sessionStorage.getItem('lastRoute') || localStorage.getItem('lastRoute');
        if (savedRoute) {
          const routeData = JSON.parse(savedRoute);
          const timeDiff = Date.now() - routeData.timestamp;
          // Only restore if less than 30 minutes old and not already on that route
          if (timeDiff < 30 * 60 * 1000 && routeData.path !== location.pathname + location.search) {
            console.log('[AppState] Restoring last route:', routeData.path);
            navigate(routeData.path, { replace: true });
          }
        }
      } catch (error) {
        console.error('[AppState] Error restoring route:', error);
      }
    };

    // Only restore on initial mount
    const hasRestoredRef = sessionStorage.getItem('hasRestored');
    if (!hasRestoredRef) {
      restoreLastRoute();
      sessionStorage.setItem('hasRestored', 'true');
    }
  }, []); // Only run once on mount

  useEffect(() => {
    // Handle page visibility changes (app minimize/resume)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        // App is coming back to foreground - stay on current page
        console.log('[AppState] App resumed - staying on current page');
      } else {
        // App is going to background - save state
        console.log('[AppState] App going to background, saving state');
        const routeData = {
          path: location.pathname + location.search,
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

    // Handle freeze/resume (mobile specific)
    const handleFreeze = () => {
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

    // Add all event listeners
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pagehide', handleBeforeUnload);
    document.addEventListener('freeze', handleFreeze);

    // Cleanup
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pagehide', handleBeforeUnload);
      document.removeEventListener('freeze', handleFreeze);
    };
  }, [location]);

  return null;
};
