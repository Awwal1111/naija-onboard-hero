import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { detectMiniPaySync } from '@/lib/minipay';

const isMiniPayEnv = detectMiniPaySync().isMiniPay;

/**
 * useAppState - persists navigation state for cold restarts only.
 * 
 * FIXED: No longer navigates on visibility change (warm resume).
 * The React tree stays mounted when minimizing/resuming, so the user
 * is already on the correct page. Navigation on resume was causing
 * unnecessary re-renders and "refresh" appearance.
 * 
 * Only restores route on TRUE cold start (app killed by OS).
 */
export const useAppState = () => {
  const internal = useAppStateInternal();
  if (isMiniPayEnv) return null;
  return internal;
};

const useAppStateInternal = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const hasRestoredRef = useRef(false);

  // Save current route on every navigation
  useEffect(() => {
    const routeData = {
      path: location.pathname + location.search,
      timestamp: Date.now()
    };
    try {
      sessionStorage.setItem('lastRoute', JSON.stringify(routeData));
      localStorage.setItem('lastRoute', JSON.stringify(routeData));
    } catch {}
  }, [location]);

  // Restore route ONLY on cold start (first mount, no session marker)
  useEffect(() => {
    if (hasRestoredRef.current) return;
    hasRestoredRef.current = true;

    // If sessionStorage has 'appMounted', this is a warm resume (React tree survived)
    // Only restore if sessionStorage is empty (cold start - app was killed)
    if (sessionStorage.getItem('appMounted')) return;
    sessionStorage.setItem('appMounted', 'true');

    try {
      const saved = localStorage.getItem('lastRoute');
      if (!saved) return;
      const { path, timestamp } = JSON.parse(saved);
      const age = Date.now() - timestamp;
      const currentPath = location.pathname + location.search;
      
      // Only restore if < 30 min old AND different from current route
      if (age < 30 * 60 * 1000 && path !== currentPath && path !== '/' && path !== '/login') {
        console.log('[AppState] Cold start - restoring:', path);
        navigate(path, { replace: true });
      }
    } catch (e) {
      console.error('[AppState] Restore error:', e);
    }
  }, []);

  return null;
};
