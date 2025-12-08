import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export type BookmarkType = 'job' | 'expert' | 'course' | 'product' | 'gig';

interface Bookmark {
  id: string;
  type: BookmarkType;
  itemId: string;
  createdAt: string;
}

export const useBookmarks = () => {
  const { user } = useAuth();
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadBookmarks();
    } else {
      setBookmarks([]);
      setLoading(false);
    }
  }, [user]);

  const loadBookmarks = async () => {
    if (!user) return;

    try {
      // Load from localStorage for now (can be migrated to database later)
      const stored = localStorage.getItem(`bookmarks_${user.id}`);
      if (stored) {
        setBookmarks(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Error loading bookmarks:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveToStorage = (newBookmarks: Bookmark[]) => {
    if (!user) return;
    localStorage.setItem(`bookmarks_${user.id}`, JSON.stringify(newBookmarks));
    setBookmarks(newBookmarks);
  };

  const addBookmark = (type: BookmarkType, itemId: string) => {
    if (!user) {
      toast.error('Please log in to save items');
      return false;
    }

    const exists = bookmarks.some(b => b.type === type && b.itemId === itemId);
    if (exists) {
      toast.info('Item already saved');
      return false;
    }

    const newBookmark: Bookmark = {
      id: `${type}_${itemId}_${Date.now()}`,
      type,
      itemId,
      createdAt: new Date().toISOString()
    };

    const newBookmarks = [newBookmark, ...bookmarks];
    saveToStorage(newBookmarks);
    toast.success('Saved to bookmarks');
    return true;
  };

  const removeBookmark = (type: BookmarkType, itemId: string) => {
    const newBookmarks = bookmarks.filter(
      b => !(b.type === type && b.itemId === itemId)
    );
    saveToStorage(newBookmarks);
    toast.success('Removed from bookmarks');
    return true;
  };

  const toggleBookmark = (type: BookmarkType, itemId: string) => {
    const isBookmarked = bookmarks.some(b => b.type === type && b.itemId === itemId);
    if (isBookmarked) {
      return removeBookmark(type, itemId);
    } else {
      return addBookmark(type, itemId);
    }
  };

  const isBookmarked = (type: BookmarkType, itemId: string) => {
    return bookmarks.some(b => b.type === type && b.itemId === itemId);
  };

  const getBookmarksByType = (type: BookmarkType) => {
    return bookmarks.filter(b => b.type === type);
  };

  return {
    bookmarks,
    loading,
    addBookmark,
    removeBookmark,
    toggleBookmark,
    isBookmarked,
    getBookmarksByType
  };
};
