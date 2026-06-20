import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export interface Certificate {
  id: string;
  user_id: string;
  title: string;
  issuer: string | null;
  credential_url: string | null;
  credential_id: string | null;
  issue_date: string | null;
  expiry_date: string | null;
  created_at: string;
}

export function useCertificates(userId?: string) {
  const { user } = useAuth();
  const { toast } = useToast();
  const ownerId = userId || user?.id;
  const [items, setItems] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!ownerId) { setLoading(false); return; }
    setLoading(true);
    const { data, error } = await supabase
      .from('user_certificates')
      .select('id,user_id,title,issuer,credential_url,credential_id,issue_date,expiry_date,created_at')
      .eq('user_id', ownerId)
      .order('created_at', { ascending: false })
      .limit(50);
    if (!error) setItems((data || []) as Certificate[]);
    setLoading(false);
  }, [ownerId]);

  useEffect(() => { fetch(); }, [fetch]);

  const add = async (payload: Omit<Certificate, 'id' | 'user_id' | 'created_at'>) => {
    if (!user) return { error: 'Not authenticated' };
    const { error } = await supabase.from('user_certificates').insert({ ...payload, user_id: user.id });
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return { error: error.message };
    }
    toast({ title: 'Certificate added' });
    await fetch();
    return { success: true };
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from('user_certificates').delete().eq('id', id);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Removed' });
    await fetch();
  };

  return { items, loading, add, remove, refetch: fetch };
}
