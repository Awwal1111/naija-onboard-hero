import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export interface GigTestimonial {
  id: string;
  gig_id: string;
  user_id: string;
  testimonial: string;
  rating: number;
  project_type?: string;
  project_date?: string;
  is_verified: boolean;
  created_at: string;
  user?: {
    full_name: string;
    profile_picture_url: string | null;
    profession?: string;
  };
}

export const useGigTestimonials = (gigId?: string) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [testimonials, setTestimonials] = useState<GigTestimonial[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTestimonials = async () => {
    if (!gigId) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('gig_testimonials')
        .select('*')
        .eq('gig_id', gigId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch user profiles
      const testimonialsWithProfiles = await Promise.all(
        (data || []).map(async (testimonial) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, profile_picture_url, profession')
            .eq('user_id', testimonial.user_id)
            .maybeSingle();

          return {
            ...testimonial,
            user: profile || undefined
          };
        })
      );

      setTestimonials(testimonialsWithProfiles);
    } catch (error) {
      console.error('Error fetching testimonials:', error);
    } finally {
      setLoading(false);
    }
  };

  const addTestimonial = async (
    testimonial: string, 
    rating: number, 
    projectType?: string
  ) => {
    if (!user || !gigId) {
      toast({
        title: 'Error',
        description: 'Please log in to leave a testimonial',
        variant: 'destructive'
      });
      return { error: 'Not authenticated' };
    }

    try {
      const { data, error } = await supabase
        .from('gig_testimonials')
        .insert({
          gig_id: gigId,
          user_id: user.id,
          testimonial,
          rating,
          project_type: projectType || null,
          project_date: new Date().toISOString().split('T')[0]
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          toast({
            title: 'Already Added',
            description: 'You have already left a testimonial for this service',
            variant: 'destructive'
          });
          return { error: 'Already exists' };
        }
        throw error;
      }

      toast({
        title: 'Testimonial Added',
        description: 'Thank you for your testimonial!'
      });

      fetchTestimonials();
      return { data };
    } catch (error: any) {
      console.error('Error adding testimonial:', error);
      toast({
        title: 'Error',
        description: 'Failed to add testimonial',
        variant: 'destructive'
      });
      return { error: error.message };
    }
  };

  const deleteTestimonial = async (testimonialId: string) => {
    if (!user) return { error: 'Not authenticated' };

    try {
      const { error } = await supabase
        .from('gig_testimonials')
        .delete()
        .eq('id', testimonialId)
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: 'Testimonial Deleted',
        description: 'Your testimonial has been removed'
      });

      fetchTestimonials();
      return { success: true };
    } catch (error: any) {
      console.error('Error deleting testimonial:', error);
      return { error: error.message };
    }
  };

  useEffect(() => {
    fetchTestimonials();
  }, [gigId]);

  return {
    testimonials,
    loading,
    addTestimonial,
    deleteTestimonial,
    refetch: fetchTestimonials
  };
};

export default useGigTestimonials;
