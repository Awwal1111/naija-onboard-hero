import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export interface MyGig {
  id: string;
  title: string;
  description: string;
  price: number;
  category: string;
  photo_urls: string[];
  status: string;
  boost_amount: number;
  delivery_days: number;
  order_queue: number;
  response_time: string;
  created_at: string;
  updated_at: string;
  review_count?: number;
  average_rating?: number;
}

export const useMyGigs = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [gigs, setGigs] = useState<MyGig[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    paused: 0,
    totalViews: 0,
    totalOrders: 0
  });

  const fetchMyGigs = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('jobs_services')
        .select('id, user_id, title, description, category, price, photo_urls, status, applications_count, average_rating, review_count, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get review counts for each gig
      const gigsWithReviews = await Promise.all(
        (data || []).map(async (gig) => {
          const { data: reviews, count } = await supabase
            .from('gig_reviews')
            .select('rating', { count: 'exact' })
            .eq('gig_id', gig.id);

          const avgRating = reviews && reviews.length > 0
            ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
            : 0;

          return {
            ...gig,
            review_count: count || 0,
            average_rating: Math.round(avgRating * 10) / 10
          };
        })
      );

      setGigs(gigsWithReviews);
      
      // Calculate stats
      setStats({
        total: gigsWithReviews.length,
        active: gigsWithReviews.filter(g => g.status === 'active').length,
        paused: gigsWithReviews.filter(g => g.status === 'paused').length,
        totalViews: 0, // Would need views tracking
        totalOrders: gigsWithReviews.reduce((sum, g) => sum + (g.order_queue || 0), 0)
      });
    } catch (error) {
      console.error('Error fetching my gigs:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateGig = async (gigId: string, updates: Partial<MyGig>) => {
    if (!user) return { error: 'Not authenticated' };

    try {
      const { error } = await supabase
        .from('jobs_services')
        .update(updates)
        .eq('id', gigId)
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: 'Gig Updated',
        description: 'Your gig has been updated successfully'
      });

      fetchMyGigs();
      return { success: true };
    } catch (error: any) {
      console.error('Error updating gig:', error);
      toast({
        title: 'Error',
        description: 'Failed to update gig',
        variant: 'destructive'
      });
      return { error: error.message };
    }
  };

  const toggleGigStatus = async (gigId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'paused' : 'active';
    return updateGig(gigId, { status: newStatus } as any);
  };

  const deleteGig = async (gigId: string) => {
    if (!user) return { error: 'Not authenticated' };

    try {
      const { error } = await supabase
        .from('jobs_services')
        .delete()
        .eq('id', gigId)
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: 'Gig Deleted',
        description: 'Your gig has been deleted'
      });

      fetchMyGigs();
      return { success: true };
    } catch (error: any) {
      console.error('Error deleting gig:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete gig',
        variant: 'destructive'
      });
      return { error: error.message };
    }
  };

  useEffect(() => {
    fetchMyGigs();
  }, [user]);

  return {
    gigs,
    loading,
    stats,
    updateGig,
    toggleGigStatus,
    deleteGig,
    refetch: fetchMyGigs
  };
};

export default useMyGigs;
