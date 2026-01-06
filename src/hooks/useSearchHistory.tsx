import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';

const SEARCH_HISTORY_KEY = 'naijalancers_search_history';
const MAX_HISTORY = 10;

export interface SearchHistoryItem {
  query: string;
  category?: string;
  timestamp: number;
}

export const useSearchHistory = () => {
  const { user } = useAuth();
  const [history, setHistory] = useState<SearchHistoryItem[]>([]);

  // Load history from localStorage
  useEffect(() => {
    try {
      const key = user ? `${SEARCH_HISTORY_KEY}_${user.id}` : SEARCH_HISTORY_KEY;
      const stored = localStorage.getItem(key);
      if (stored) {
        setHistory(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Failed to load search history:', e);
    }
  }, [user]);

  const addSearch = (query: string, category?: string) => {
    if (!query.trim()) return;
    
    const newItem: SearchHistoryItem = {
      query: query.trim().toLowerCase(),
      category,
      timestamp: Date.now()
    };

    setHistory(prev => {
      // Remove duplicate queries
      const filtered = prev.filter(item => item.query !== newItem.query);
      const updated = [newItem, ...filtered].slice(0, MAX_HISTORY);
      
      // Save to localStorage
      try {
        const key = user ? `${SEARCH_HISTORY_KEY}_${user.id}` : SEARCH_HISTORY_KEY;
        localStorage.setItem(key, JSON.stringify(updated));
      } catch (e) {
        console.error('Failed to save search history:', e);
      }
      
      return updated;
    });
  };

  const clearHistory = () => {
    setHistory([]);
    try {
      const key = user ? `${SEARCH_HISTORY_KEY}_${user.id}` : SEARCH_HISTORY_KEY;
      localStorage.removeItem(key);
    } catch (e) {
      console.error('Failed to clear search history:', e);
    }
  };

  // Get recent searches for recommendations
  const getRecentCategories = (): string[] => {
    const categories = history
      .filter(item => item.category)
      .map(item => item.category as string);
    return [...new Set(categories)];
  };

  const getRecentQueries = (): string[] => {
    return history.map(item => item.query);
  };

  return {
    history,
    addSearch,
    clearHistory,
    getRecentCategories,
    getRecentQueries
  };
};
