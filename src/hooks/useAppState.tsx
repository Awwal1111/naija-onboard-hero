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
    // Save current route and timestamp
    const saveRoute = () => {
      const routeData = {
        path: location.pathname + location.search,
        timestamp: Date.now()
      };
      sessionStorage.setItem('lastRoute', JSON.stringify(routeData));
      localStorage.setItem('lastRoute', JSON.stringify(routeData)); // Backup in localStorage
    };

    // Save route on every navigation
    saveRoute();
  }, [location]);

  useEffect(() => {
    // Handle page visibility changes (app minimize/resume)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        // App is coming back to foreground
        console.log('[AppState] App resumed from background');
        // DO NOT navigate - just log the resume event
        // This prevents the app from refreshing/reloading when minimized and reopened
      } else {
        // App is going to background - save state
        console.log('[AppState] App going to background');
        const routeData = {
          path: location.pathname + location.search,
          timestamp: Date.now()
        };
        sessionStorage.setItem('lastRoute', JSON.stringify(routeData));
        localStorage.setItem('lastRoute', JSON.stringify(routeData));
      }
    };

    // Handle page focus/blur events (window switching)
    const handleBlur = () => {
      console.log('[AppState] App lost focus');
      const routeData = {
        path: location.pathname + location.search,
        timestamp: Date.now()
      };
      sessionStorage.setItem('lastRoute', JSON.stringify(routeData));
      localStorage.setItem('lastRoute', JSON.stringify(routeData));
    };

    const handleFocus = () => {
      console.log('[AppState] App gained focus');
    };

    // Handle page freeze/resume (mobile specific)
    const handleFreeze = () => {
      console.log('[AppState] App frozen');
      const routeData = {
        path: location.pathname + location.search,
        timestamp: Date.now()
      };
      sessionStorage.setItem('lastRoute', JSON.stringify(routeData));
      localStorage.setItem('lastRoute', JSON.stringify(routeData));
    };

    const handleResume = () => {
      console.log('[AppState] App resumed from freeze');
    };

    // Add all event listeners
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);
    document.addEventListener('freeze', handleFreeze);
    document.addEventListener('resume', handleResume);

    // Cleanup
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
      document.removeEventListener('freeze', handleFreeze);
      document.removeEventListener('resume', handleResume);
    };
  }, [location, navigate]);

  return null;
};
