import { useEffect, useCallback } from 'react';

interface SavedState {
  scrollPosition: number;
  timestamp: number;
  formData?: Record<string, any>;
}

/**
 * Hook to persist and restore various app states when minimizing/resuming
 */
export const useStatePersistence = (key: string, formData?: Record<string, any>) => {
  // Save scroll position
  const saveScrollPosition = useCallback(() => {
    const scrollY = window.scrollY;
    const state: SavedState = {
      scrollPosition: scrollY,
      timestamp: Date.now(),
      formData
    };
    sessionStorage.setItem(`state_${key}`, JSON.stringify(state));
  }, [key, formData]);

  // Restore scroll position
  const restoreScrollPosition = useCallback(() => {
    const savedStateStr = sessionStorage.getItem(`state_${key}`);
    if (savedStateStr) {
      try {
        const savedState: SavedState = JSON.parse(savedStateStr);
        // Only restore if saved within last 30 minutes
        const thirtyMinutes = 30 * 60 * 1000;
        if (Date.now() - savedState.timestamp < thirtyMinutes) {
          // Restore scroll position after a small delay to ensure content is loaded
          setTimeout(() => {
            window.scrollTo({
              top: savedState.scrollPosition,
              behavior: 'smooth'
            });
          }, 100);
          return savedState.formData;
        }
      } catch (error) {
        console.error('Error restoring state:', error);
      }
    }
    return null;
  }, [key]);

  // Save state on visibility change, scroll, and page unload
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        saveScrollPosition();
      }
    };

    const handleScroll = () => {
      // Debounce scroll saves
      clearTimeout((window as any).scrollSaveTimeout);
      (window as any).scrollSaveTimeout = setTimeout(saveScrollPosition, 500);
    };

    const handleBeforeUnload = () => {
      saveScrollPosition();
    };

    // Add event listeners
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pagehide', handleBeforeUnload);

    // Restore state on mount
    const restored = restoreScrollPosition();

    return () => {
      // Save state before cleanup
      saveScrollPosition();
      
      // Remove event listeners
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pagehide', handleBeforeUnload);
    };
  }, [saveScrollPosition, restoreScrollPosition]);

  return {
    saveState: saveScrollPosition,
    restoreState: restoreScrollPosition
  };
};
