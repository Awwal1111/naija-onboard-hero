import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect } from 'react';

export interface Ad {
  id: string;
  title: string;
  description?: string;
  image_url: string;
  link_url: string;
  placement: 'banner' | 'feed' | 'sidebar' | 'popup';
  is_active: boolean;
  priority: number;
  click_count: number;
  impression_count: number;
  start_date?: string;
  end_date?: string;
  target_pages?: string[];
  created_at: string;
}

export const useAds = (placement?: 'banner' | 'feed' | 'sidebar' | 'popup') => {
  const queryClient = useQueryClient();

  const { data: ads = [], isLoading } = useQuery({
    queryKey: ['ads', placement],
    queryFn: async () => {
      let query = supabase
        .from('ads')
        .select('*')
        .eq('is_active', true)
        .order('priority', { ascending: false });

      if (placement) {
        query = query.eq('placement', placement);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Ad[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const trackImpression = async (adId: string) => {
    try {
      await supabase.rpc('track_ad_impression', { ad_id: adId });
    } catch (error) {
      console.error('Failed to track impression:', error);
    }
  };

  const trackClick = async (adId: string) => {
    try {
      await supabase.rpc('track_ad_click', { ad_id: adId });
    } catch (error) {
      console.error('Failed to track click:', error);
    }
  };

  return {
    ads,
    isLoading,
    trackImpression,
    trackClick,
  };
};

export const useAdminAds = () => {
  const queryClient = useQueryClient();

  const { data: ads = [], isLoading } = useQuery({
    queryKey: ['admin-ads'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ads')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Ad[];
    },
  });

  const createAd = useMutation({
    mutationFn: async (ad: Omit<Ad, 'id' | 'click_count' | 'impression_count' | 'created_at'>) => {
      const { data: user } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('ads')
        .insert({ ...ad, created_by: user.user?.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-ads'] });
      queryClient.invalidateQueries({ queryKey: ['ads'] });
    },
  });

  const updateAd = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Ad> & { id: string }) => {
      const { data, error } = await supabase
        .from('ads')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-ads'] });
      queryClient.invalidateQueries({ queryKey: ['ads'] });
    },
  });

  const deleteAd = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('ads')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-ads'] });
      queryClient.invalidateQueries({ queryKey: ['ads'] });
    },
  });

  return {
    ads,
    isLoading,
    createAd,
    updateAd,
    deleteAd,
  };
};
