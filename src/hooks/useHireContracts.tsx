import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export type ContractType = 'fixed' | 'hourly';
export type ContractStatus =
  | 'pending_expert_signature'
  | 'pending_client_signature'
  | 'active'
  | 'completed'
  | 'cancelled'
  | 'disputed';

export interface HireContract {
  id: string;
  client_id: string;
  expert_id: string;
  contract_type: ContractType;
  title: string;
  scope: string;
  total_amount: number;
  hourly_rate: number | null;
  weekly_cap_hours: number | null;
  deposit_amount: number;
  escrow_held: number;
  platform_fee: number;
  deadline: string | null;
  status: ContractStatus;
  client_signature: string | null;
  expert_signature: string | null;
  client_signed_at: string | null;
  expert_signed_at: string | null;
  pdf_url: string | null;
  cancellation_reason: string | null;
  created_at: string;
  completed_at: string | null;
  cancelled_at: string | null;
}

export interface CreateContractInput {
  expert_id: string;
  contract_type: ContractType;
  title: string;
  scope: string;
  total_amount?: number;
  hourly_rate?: number;
  weekly_cap_hours?: number;
  deposit_amount?: number;
  deadline?: string | null;
}

export function useHireContracts() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [contracts, setContracts] = useState<HireContract[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    const { data } = await supabase
      .from('hire_contracts')
      .select('*')
      .or(`client_id.eq.${user.id},expert_id.eq.${user.id}`)
      .order('created_at', { ascending: false })
      .limit(100);
    setContracts((data || []) as HireContract[]);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const create = async (input: CreateContractInput): Promise<{ success?: boolean; id?: string; error?: string }> => {
    if (!user) return { error: 'Not authenticated' };
    const { data, error } = await supabase
      .from('hire_contracts')
      .insert({
        client_id: user.id,
        expert_id: input.expert_id,
        contract_type: input.contract_type,
        title: input.title,
        scope: input.scope,
        total_amount: input.total_amount ?? 0,
        hourly_rate: input.hourly_rate ?? null,
        weekly_cap_hours: input.weekly_cap_hours ?? null,
        deposit_amount: input.deposit_amount ?? 0,
        deadline: input.deadline ?? null,
        status: 'pending_expert_signature',
      })
      .select('id')
      .single();
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return { error: error.message };
    }
    toast({ title: 'Contract created', description: 'Sign it to send to the expert.' });
    await fetchAll();
    return { success: true, id: data.id };
  };

  const sign = async (contractId: string, signature: string) => {
    const { data, error } = await supabase.rpc('sign_hire_contract', {
      p_contract_id: contractId, p_signature: signature,
    });
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return { error: error.message }; }
    const r: any = data;
    if (!r?.success) { toast({ title: 'Failed', description: r?.error, variant: 'destructive' }); return { error: r?.error }; }
    toast({ title: 'Signed' });
    await fetchAll();
    return { success: true };
  };

  const complete = async (id: string) => {
    const { data, error } = await supabase.rpc('complete_hire_contract', { p_contract_id: id });
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return { error: error.message }; }
    const r: any = data;
    if (!r?.success) { toast({ title: 'Failed', description: r?.error, variant: 'destructive' }); return { error: r?.error }; }
    toast({ title: 'Contract completed', description: `Released NC ${Number(r.paid).toLocaleString()}` });
    await fetchAll();
    return { success: true };
  };

  const cancel = async (id: string, reason: string) => {
    const { data, error } = await supabase.rpc('cancel_hire_contract', { p_contract_id: id, p_reason: reason });
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return { error: error.message }; }
    const r: any = data;
    if (!r?.success) { toast({ title: 'Failed', description: r?.error, variant: 'destructive' }); return { error: r?.error }; }
    toast({ title: 'Contract cancelled' });
    await fetchAll();
    return { success: true };
  };

  const updatePdf = async (id: string, pdfUrl: string) => {
    await supabase.from('hire_contracts').update({ pdf_url: pdfUrl }).eq('id', id);
    await fetchAll();
  };

  const notifyExpert = async (contractId: string, event: string) => {
    try {
      await supabase.functions.invoke('notify-hire-contract', { body: { contract_id: contractId, event } });
    } catch (e) { console.warn('[hire-contract] notify failed', e); }
  };

  return { contracts, loading, create, sign, complete, cancel, updatePdf, notifyExpert, refetch: fetchAll };
}
