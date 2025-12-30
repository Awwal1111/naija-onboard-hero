import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export interface GigFAQ {
  id: string;
  gig_id: string;
  question: string;
  answer: string;
  display_order: number;
  created_at: string;
}

export const useGigFAQs = (gigId?: string) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [faqs, setFaqs] = useState<GigFAQ[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFAQs = async () => {
    if (!gigId) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('gig_faqs')
        .select('*')
        .eq('gig_id', gigId)
        .order('display_order', { ascending: true });

      if (error) throw error;
      setFaqs(data || []);
    } catch (error) {
      console.error('Error fetching FAQs:', error);
    } finally {
      setLoading(false);
    }
  };

  const addFAQ = async (question: string, answer: string) => {
    if (!user || !gigId) return { error: 'Not authenticated' };

    try {
      const maxOrder = faqs.length > 0 ? Math.max(...faqs.map(f => f.display_order)) : 0;
      
      const { data, error } = await supabase
        .from('gig_faqs')
        .insert({
          gig_id: gigId,
          question,
          answer,
          display_order: maxOrder + 1
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'FAQ Added',
        description: 'FAQ has been added to your gig'
      });

      fetchFAQs();
      return { data };
    } catch (error: any) {
      console.error('Error adding FAQ:', error);
      toast({
        title: 'Error',
        description: 'Failed to add FAQ',
        variant: 'destructive'
      });
      return { error: error.message };
    }
  };

  const updateFAQ = async (faqId: string, question: string, answer: string) => {
    if (!user) return { error: 'Not authenticated' };

    try {
      const { error } = await supabase
        .from('gig_faqs')
        .update({ question, answer })
        .eq('id', faqId);

      if (error) throw error;

      toast({
        title: 'FAQ Updated',
        description: 'FAQ has been updated'
      });

      fetchFAQs();
      return { success: true };
    } catch (error: any) {
      console.error('Error updating FAQ:', error);
      return { error: error.message };
    }
  };

  const deleteFAQ = async (faqId: string) => {
    if (!user) return { error: 'Not authenticated' };

    try {
      const { error } = await supabase
        .from('gig_faqs')
        .delete()
        .eq('id', faqId);

      if (error) throw error;

      toast({
        title: 'FAQ Deleted',
        description: 'FAQ has been removed'
      });

      fetchFAQs();
      return { success: true };
    } catch (error: any) {
      console.error('Error deleting FAQ:', error);
      return { error: error.message };
    }
  };

  useEffect(() => {
    fetchFAQs();
  }, [gigId]);

  return {
    faqs,
    loading,
    addFAQ,
    updateFAQ,
    deleteFAQ,
    refetch: fetchFAQs
  };
};

export default useGigFAQs;
