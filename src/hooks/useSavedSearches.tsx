import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export interface SavedSearch {
  id: string;
  user_id: string;
  name: string;
  query: string;
  filters: {
    type?: string;
    minPrice?: number;
    maxPrice?: number;
    skills?: string[];
    state?: string;
    lga?: string;
    minRating?: number;
  };
  created_at: string;
}

export const useSavedSearches = () => {
  const { user } = useAuth();
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      fetchSavedSearches();
    }
  }, [user]);

  const fetchSavedSearches = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('saved_searches')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSavedSearches((data || []) as SavedSearch[]);
    } catch (error) {
      console.error('Error fetching saved searches:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveSearch = async (name: string, query: string, filters: SavedSearch['filters']) => {
    if (!user) {
      toast.error('Please login to save searches');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('saved_searches')
        .insert({
          user_id: user.id,
          name,
          query,
          filters
        })
        .select()
        .single();

      if (error) throw error;
      
      setSavedSearches(prev => [data as SavedSearch, ...prev]);
      toast.success('Search saved successfully');
      return data;
    } catch (error) {
      console.error('Error saving search:', error);
      toast.error('Failed to save search');
    }
  };

  const deleteSearch = async (id: string) => {
    try {
      const { error } = await supabase
        .from('saved_searches')
        .delete()
        .eq('id', id)
        .eq('user_id', user?.id);

      if (error) throw error;
      
      setSavedSearches(prev => prev.filter(s => s.id !== id));
      toast.success('Search deleted');
    } catch (error) {
      console.error('Error deleting search:', error);
      toast.error('Failed to delete search');
    }
  };

  return {
    savedSearches,
    loading,
    saveSearch,
    deleteSearch,
    refetch: fetchSavedSearches
  };
};
