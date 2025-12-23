import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export interface GigReview {
  id: string;
  gig_id: string;
  user_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  reviewer?: {
    full_name: string;
    profile_picture_url: string | null;
  };
}

export const useGigReviews = (gigId?: string) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [reviews, setReviews] = useState<GigReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ average: 0, count: 0 });

  const fetchReviews = async () => {
    if (!gigId) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('gig_reviews')
        .select('*')
        .eq('gig_id', gigId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch reviewer profiles
      const reviewsWithProfiles = await Promise.all(
        (data || []).map(async (review) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, profile_picture_url')
            .eq('user_id', review.user_id)
            .maybeSingle();

          return {
            ...review,
            reviewer: profile || undefined
          };
        })
      );

      setReviews(reviewsWithProfiles);

      // Calculate stats
      if (reviewsWithProfiles.length > 0) {
        const total = reviewsWithProfiles.reduce((sum, r) => sum + r.rating, 0);
        setStats({
          average: Math.round((total / reviewsWithProfiles.length) * 10) / 10,
          count: reviewsWithProfiles.length
        });
      }
    } catch (error) {
      console.error('Error fetching reviews:', error);
    } finally {
      setLoading(false);
    }
  };

  const addReview = async (rating: number, comment?: string) => {
    if (!user || !gigId) {
      toast({
        title: 'Error',
        description: 'Please log in to leave a review',
        variant: 'destructive'
      });
      return { error: 'Not authenticated' };
    }

    try {
      const { data, error } = await supabase
        .from('gig_reviews')
        .insert({
          gig_id: gigId,
          user_id: user.id,
          rating,
          comment: comment || null
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          toast({
            title: 'Already Reviewed',
            description: 'You have already reviewed this service',
            variant: 'destructive'
          });
          return { error: 'Already reviewed' };
        }
        throw error;
      }

      toast({
        title: 'Review Submitted',
        description: 'Thank you for your feedback!'
      });

      fetchReviews();
      return { data };
    } catch (error: any) {
      console.error('Error adding review:', error);
      toast({
        title: 'Error',
        description: 'Failed to submit review',
        variant: 'destructive'
      });
      return { error: error.message };
    }
  };

  const deleteReview = async (reviewId: string) => {
    if (!user) return { error: 'Not authenticated' };

    try {
      const { error } = await supabase
        .from('gig_reviews')
        .delete()
        .eq('id', reviewId)
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: 'Review Deleted',
        description: 'Your review has been removed'
      });

      fetchReviews();
      return { success: true };
    } catch (error: any) {
      console.error('Error deleting review:', error);
      return { error: error.message };
    }
  };

  useEffect(() => {
    fetchReviews();
  }, [gigId]);

  return {
    reviews,
    loading,
    stats,
    addReview,
    deleteReview,
    refetch: fetchReviews
  };
};

export default useGigReviews;
