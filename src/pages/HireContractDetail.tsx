import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Download, FileSignature, ShieldCheck, CheckCircle2, XCircle, History, Send, PencilLine } from 'lucide-react';
import { useHireContracts, HireContract, ContractRevision, ReviseContractInput } from '@/hooks/useHireContracts';
import { buildContractPdf, downloadContractPdf } from '@/lib/contractPdf';
import { uploadToCatbox } from '@/lib/catbox';
import { toast } from 'sonner';
import { DepositDialog } from '@/components/DepositDialog';

export default function HireContractDetail() {
  const [showFundDialog, setShowFundDialog] = useState(false);
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { sign, complete, cancel, requestChanges, revise, updatePdf, notifyExpert } = useHireContracts();
  const [c, setC] = useState<HireContract | null>(null);
  const [client, setClient] = useState<any>(null);
  const [expert, setExpert] = useState<any>(null);
  const [sig, setSig] = useState('');
  const [reason, setReason] = useState('');
  const [changeReason, setChangeReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [revisions, setRevisions] = useState<ContractRevision[]>([]);
  const [edit, setEdit] = useState(false);
  const [draft, setDraft] = useState<ReviseContractInput | null>(null);

  const load = async () => {
    if (!id) { setLoadError('Contract ID is missing.'); setLoading(false); return; }
    setLoading(true); setLoadError(null);
    const { data, error } = await supabase.from('hire_contracts').select('*').eq('id', id).maybeSingle();
    if (error) { setLoadError(error.message); setLoading(false); return; }
    if (!data) { setC(null); setLoadError('Contract not found, or you do not have permission to view it.'); setLoading(false); return; }
    setC(data as HireContract);
    const { data: profs, error: profileError } = await supabase.from('profiles').select('user_id,full_name,profile_picture_url,telegram_user_id').in('user_id', [data.client_id, data.expert_id]);
    if (profileError) console.warn('[hire-contract] profile lookup failed', profileError);
    const map = new Map((profs || []).map((p: any) => [p.user_id, p]));
    setClient(map.get(data.client_id)); setExpert(map.get(data.expert_id));
    const { data: history, error: historyError } = await supabase.from('hire_contract_revisions').select('*').eq('contract_id', id).order('revision_number', { ascending: false });
    if (historyError && !/does not exist|schema cache/i.test(historyError.message)) {
      console.warn('[hire-contract] revision history unavailable', historyError);
    }
    setRevisions((history || []) as ContractRevision[]);
    setLoading(false);
  };
  useEffect(() => { void load(); }, [id]);

  if (loading) return <div className="container max-w-3xl mx-auto p-6">Loading contract…</div>;
  if (!c) return <div className="container max-w-3xl mx-auto p-6 space-y-3"><p className="text-sm text-destructive">{loadError || 'Contract unavailable.'}</p><Button variant="outline" onClick={() => navigate(-1)}>Go back</Button></div>;
  const isClient = user?.id === c.client_id;
  const isExpert = user?.id === c.expert_id;
  const canSign = ['pending_expert_signature', 'pending_client_signature'].includes(c.status) &&
    ((isClient && !c.client_signed_at) || (isExpert && !c.expert_signed_at));
  const hold = Number(c.contract_type === 'fixed' ? c.total_amount : c.deposit_amount || 0);
  const feeEstimate = Number(c.platform_fee || (hold * 0.05));
  const netEstimate = Math.max(0, hold - feeEstimate);

  const pdfPayload = () => ({
    id: c.id, title: c.title, scope: c.scope, contract_type: c.contract_type,
    total_amount: c.total_amount, hourly_rate: c.hourly_rate, weekly_cap_hours: c.weekly_cap_hours,
    deposit_amount: c.deposit_amount, deadline: c.deadline, created_at: c.created_at,
    client_name: client?.full_name || 'Client', expert_name: expert?.full_name || 'Expert',
    client_signature: c.client_signature, expert_signature: c.expert_signature,
    client_signed_at: c.client_signed_at, expert_signed_at: c.expert_signed_at,
  });

  const handleSign = async () => {
    if (!sig.trim()) { toast.error('Type your full name to sign'); return; }
    if (!window.confirm('I have reviewed this exact contract revision and agree to its scope, payment terms and deadline. Continue to sign?')) return;
    setBusy(true);
    const r = await sign(c.id, sig.trim());
    if (!r.success && /insufficient/i.test(String(r.error))) setShowFundDialog(true);
    if (r.success) {
      await load();
      const { data: fresh } = await supabase.from('hire_contracts').select('*').eq('id', c.id).maybeSingle();
      if (fresh?.client_signed_at && fresh?.expert_signed_at && fresh.status === 'active') {
        try {
          const blob = buildContractPdf({ ...pdfPayload(), client_signature: fresh.client_signature, expert_signature: fresh.expert_signature, client_signed_at: fresh.client_signed_at, expert_signed_at: fresh.expert_signed_at });
          const file = new File([blob], `contract-${c.id}.pdf`, { type: 'application/pdf' });
          const up = await uploadToCatbox(file);
          if (up?.url) await updatePdf(c.id, up.url);
          await notifyExpert(c.id, 'signed');
        } catch (e) { console.warn('pdf/notify error', e); }
      }
    }
    setBusy(false); setSig('');
  };
  const handleRequestChanges = async () => {
    if (changeReason.trim().length < 5) { toast.error('Please explain the requested changes (at least 5 characters).'); return; }
    setBusy(true); const r = await requestChanges(c.id, changeReason.trim());
    if (r.success) { setChangeReason(''); await load(); }
    setBusy(false);
  };
  const startEdit = () => {
    setDraft({ title: c.title, scope: c.scope, contract_type: c.contract_type, total_amount: Number(c.total_amount || 0), hourly_rate: Number(c.hourly_rate || 0), weekly_cap_hours: Number(c.weekly_cap_hours || 20), deposit_amount: Number(c.deposit_amount || 0), deadline: c.deadline ? c.deadline.slice(0, 10) : null });
    setEdit(true);
  };
  const submitRevision = async () => {
    if (!draft || !draft.title.trim() || !draft.scope.trim()) return;
    if (draft.contract_type === 'fixed' && !(Number(draft.total_amount) > 0)) { toast.error('Enter a valid total amount.'); return; }
    if (draft.contract_type === 'hourly' && (!(Number(draft.hourly_rate) > 0) || !(Number(draft.deposit_amount) > 0) || !(Number(draft.weekly_cap_hours) >= 1 && Number(draft.weekly_cap_hours) <= 168))) { toast.error('Hourly contracts need a positive rate and deposit, with a weekly cap from 1 to 168 hours.'); return; }
    if (!window.confirm('Submit these changes as a new contract revision? Previous terms will remain in the revision history and both parties must sign again.')) return;
    setBusy(true);
    const r = await revise(c.id, { ...draft, title: draft.title.trim(), scope: draft.scope.trim(), deadline: draft.deadline ? new Date(draft.deadline).toISOString() : null });
    if (r.success) { setEdit(false); setDraft(null); await load(); }
    setBusy(false);
  };
  const handleComplete = async () => { if (!window.confirm('Confirm the work is complete and release the escrowed funds?')) return; setBusy(true); const r = await complete(c.id); if (r?.success) await load(); setBusy(false); };
  const handleCancel = async () => { if (!reason.trim()) { toast.error('Please give a reason'); return; } if (!window.confirm('Cancel this contract?')) return; setBusy(true); const r = await cancel(c.id, reason.trim()); if (r?.success) await load(); setBusy(false); };

  const statusColor: Record<string, string> = {
    pending_expert_signature: 'bg-amber-100 text-amber-700', pending_client_signature: 'bg-amber-100 text-amber-700',
    changes_requested: 'bg-orange-100 text-orange-700', active: 'bg-green-100 text-green-700',
    completed: 'bg-blue-100 text-blue-700', cancelled: 'bg-slate-100 text-slate-700', disputed: 'bg-red-100 text-red-700',
  };
  const updateDraft = (key: keyof ReviseContractInput, value: any) => setDraft(prev => prev ? { ...prev, [key]: value } : prev);

  return (
    <div className="container max-w-3xl mx-auto p-4 space-y-4">
      <DepositDialog open={showFundDialog} onOpenChange={setShowFundDialog} />
      <Button variant="ghost" onClick={() => navigate(-1)}><ArrowLeft className="h-4 w-4 mr-1" />Back</Button>
      <Card>
        <CardHeader><div className="flex items-start justify-between gap-2"><div>
          <CardTitle className="text-xl">{c.title}</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">Between <strong>{client?.full_name || 'Client'}</strong> and <strong>{expert?.full_name || 'Expert'}</strong></p>
          <p className="text-xs text-muted-foreground mt-1">Revision {c.revision_number || 1}</p>
        </div><Badge className={statusColor[c.status] || ''}>{c.status.replace(/_/g, ' ')}</Badge></div></CardHeader>
        <CardContent className="space-y-4">
          {c.status === 'changes_requested' && <div className="rounded-lg border border-orange-300 bg-orange-50 dark:bg-orange-950/20 p-3">
            <p className="font-semibold text-sm">Expert requested changes</p><p className="text-sm mt-1 whitespace-pre-wrap">{c.change_request || 'Please review and revise the terms.'}</p>
          </div>}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="p-3 rounded-md bg-muted"><div className="text-xs text-muted-foreground">Contract type</div><div className="font-medium capitalize">{c.contract_type}</div></div>
            <div className="p-3 rounded-md bg-muted"><div className="text-xs text-muted-foreground">Escrow currently held</div><div className="font-medium">NC {Number(c.escrow_held || 0).toLocaleString()}</div></div>
            {c.contract_type === 'fixed' ? <div className="p-3 rounded-md bg-muted col-span-2"><div className="text-xs text-muted-foreground">Agreed total</div><div className="font-medium">NC {Number(c.total_amount).toLocaleString()}</div></div> : <>
              <div className="p-3 rounded-md bg-muted"><div className="text-xs text-muted-foreground">Hourly rate</div><div className="font-medium">NC {Number(c.hourly_rate || 0).toLocaleString()}/hr</div></div>
              <div className="p-3 rounded-md bg-muted"><div className="text-xs text-muted-foreground">Weekly hour cap</div><div className="font-medium">{c.weekly_cap_hours || 'Not set'} hrs</div></div>
              <div className="p-3 rounded-md bg-muted col-span-2"><div className="text-xs text-muted-foreground">Initial deposit / escrow target</div><div className="font-medium">NC {Number(c.deposit_amount).toLocaleString()}</div></div><p className="col-span-2 text-xs text-amber-700 dark:text-amber-400">Hourly contracts currently hold an initial deposit only. Timesheet submission, client approval of hours, and automatic weekly payouts are not yet supported.</p>
            </>}
            {c.deadline && <div className="p-3 rounded-md bg-muted col-span-2"><div className="text-xs text-muted-foreground">Deadline</div><div className="font-medium">{new Date(c.deadline).toLocaleDateString()}</div></div>}
          </div>
          <section className="rounded-lg border p-3 space-y-2">
            <h3 className="text-sm font-semibold">Payment breakdown</h3>
            <div className="flex justify-between text-sm"><span>Amount intended for escrow</span><strong>NC {hold.toLocaleString()}</strong></div>
            <div className="flex justify-between text-sm"><span>Platform fee estimate (5%)</span><span>NC {feeEstimate.toLocaleString()}</span></div>
            <div className="flex justify-between text-sm border-t pt-2"><span>Estimated expert payout after platform fee</span><strong>NC {netEstimate.toLocaleString()}</strong></div>
            <p className="text-xs text-muted-foreground">The escrow target is debited from the client only when both parties sign. The platform fee is accounted for at settlement; any applicable institutional-partner commission can affect the final split. The final settlement is determined by the platform's payout calculation.</p>
          </section>
          <div><h3 className="text-sm font-semibold mb-1">Scope of work</h3><p className="text-sm whitespace-pre-wrap text-muted-foreground">{c.scope}</p></div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="p-3 rounded-md border"><div className="text-xs text-muted-foreground">Client signature</div><div className="italic font-semibold">{c.client_signature || '—'}</div>{c.client_signed_at && <div className="text-[10px] text-muted-foreground">{new Date(c.client_signed_at).toLocaleString()}</div>}</div>
            <div className="p-3 rounded-md border"><div className="text-xs text-muted-foreground">Expert signature</div><div className="italic font-semibold">{c.expert_signature || '—'}</div>{c.expert_signed_at && <div className="text-[10px] text-muted-foreground">{new Date(c.expert_signed_at).toLocaleString()}</div>}</div>
          </div>
          <div className="flex gap-2 flex-wrap"><Button variant="outline" size="sm" onClick={() => downloadContractPdf(pdfPayload())}><Download className="h-4 w-4 mr-1" />Download PDF</Button>
            {c.pdf_url && <a href={c.pdf_url} target="_blank" rel="noopener noreferrer"><Button variant="outline" size="sm">Open shared PDF</Button></a>}</div>
        </CardContent>
      </Card>

      {isExpert && ['pending_expert_signature','pending_client_signature'].includes(c.status) && !c.expert_signed_at && (
        <Card><CardHeader><CardTitle className="text-base">Review this contract</CardTitle></CardHeader><CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">If any scope, deadline or payment term is incorrect, request changes before signing. The client will edit this same contract and send a new revision.</p>
          <Label htmlFor="change-reason">What needs to change?</Label><Textarea id="change-reason" value={changeReason} onChange={e => setChangeReason(e.target.value)} placeholder="Explain the changes you need…" rows={3}/>
          <Button variant="outline" onClick={handleRequestChanges} disabled={busy || changeReason.trim().length < 5}><PencilLine className="h-4 w-4 mr-2"/>Request changes</Button>
        </CardContent></Card>
      )}

      {isClient && c.status === 'changes_requested' && (
        <Card><CardHeader><CardTitle className="text-base">Revise this contract</CardTitle></CardHeader><CardContent className="space-y-3">
          {!edit ? <Button onClick={startEdit}><PencilLine className="h-4 w-4 mr-2"/>Edit requested terms</Button> : draft && <>
            <div><Label>Contract title</Label><Input value={draft.title} onChange={e => updateDraft('title',e.target.value)}/></div>
            <div><Label>Scope of work</Label><Textarea rows={5} value={draft.scope} onChange={e => updateDraft('scope',e.target.value)}/></div>
            <div><Label>Contract type</Label><select className="w-full h-10 rounded-md border bg-background px-3 text-sm" value={draft.contract_type} onChange={e => updateDraft('contract_type',e.target.value)}><option value="fixed">Fixed price</option><option value="hourly">Hourly</option></select></div>
            {draft.contract_type === 'fixed' ? <div><Label>Total amount (NC)</Label><Input type="number" min="1" value={draft.total_amount ?? 0} onChange={e => updateDraft('total_amount',Number(e.target.value))}/></div> : <>
              <div className="grid grid-cols-2 gap-2"><div><Label>Hourly rate (NC)</Label><Input type="number" min="1" value={draft.hourly_rate ?? 0} onChange={e => updateDraft('hourly_rate',Number(e.target.value))}/></div><div><Label>Weekly cap (hours)</Label><Input type="number" min="1" max="168" value={draft.weekly_cap_hours ?? 20} onChange={e => updateDraft('weekly_cap_hours',Number(e.target.value))}/></div></div>
              <div><Label>Initial deposit (NC)</Label><Input type="number" min="1" value={draft.deposit_amount ?? 0} onChange={e => updateDraft('deposit_amount',Number(e.target.value))}/></div>
            </>}
            <div><Label>Deadline</Label><Input type="date" value={draft.deadline || ''} onChange={e => updateDraft('deadline',e.target.value || null)}/></div>
            <div className="flex gap-2"><Button onClick={submitRevision} disabled={busy || !draft.title.trim() || !draft.scope.trim()}><Send className="h-4 w-4 mr-2"/>Send revised contract</Button><Button variant="outline" onClick={() => setEdit(false)} disabled={busy}>Discard</Button></div>
          </>}
        </CardContent></Card>
      )}

      {canSign && <Card><CardHeader><CardTitle className="text-base flex items-center gap-2"><FileSignature className="h-4 w-4"/>Sign contract</CardTitle></CardHeader><CardContent className="space-y-3">
        <div><Label htmlFor="sig">Type your full name to sign</Label><Input id="sig" value={sig} onChange={e => setSig(e.target.value)} placeholder="Your full legal name"/></div>
        <div className="text-xs text-muted-foreground flex gap-2"><ShieldCheck className="h-4 w-4 text-primary shrink-0"/><span>Signing confirms acceptance of this displayed revision. If you are the client, escrow is deducted only when both parties have signed and the funding check succeeds.</span></div>
        <Button onClick={handleSign} disabled={busy || !sig.trim()}>{busy ? 'Signing…' : 'Review & sign'}</Button>
      </CardContent></Card>}

      {revisions.length > 0 && <Card><CardHeader><CardTitle className="text-base flex items-center gap-2"><History className="h-4 w-4"/>Revision history</CardTitle></CardHeader><CardContent className="space-y-3">
        {revisions.map(rev => <div key={rev.id} className="border-l-2 pl-3 py-1"><div className="flex justify-between gap-2"><strong className="text-sm">Revision {rev.revision_number}</strong><span className="text-xs text-muted-foreground">{new Date(rev.created_at).toLocaleString()}</span></div><p className="text-sm">{rev.title}</p><p className="text-xs text-muted-foreground whitespace-pre-wrap line-clamp-4">{rev.scope}</p>{rev.change_request && <p className="text-xs mt-1"><strong>Requested:</strong> {rev.change_request}</p>}</div>)}
      </CardContent></Card>}

      {c.status === 'active' && isClient && <Card><CardHeader><CardTitle className="text-base">Mark as complete</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground mb-3">Release escrowed funds to the expert.</p><Button onClick={handleComplete} disabled={busy}><CheckCircle2 className="h-4 w-4 mr-1"/>Complete & release</Button></CardContent></Card>}
      {['pending_expert_signature','pending_client_signature','active'].includes(c.status) && <Card><CardHeader><CardTitle className="text-base">Cancel contract</CardTitle></CardHeader><CardContent className="space-y-2"><Textarea value={reason} onChange={e => setReason(e.target.value)} placeholder="Reason for cancelling…"/><Button variant="destructive" onClick={handleCancel} disabled={busy || !reason.trim()}><XCircle className="h-4 w-4 mr-1"/>Cancel contract</Button></CardContent></Card>}
    </div>
  );
}
