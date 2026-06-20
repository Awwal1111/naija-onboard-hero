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
import { ArrowLeft, Download, FileSignature, ShieldCheck, CheckCircle2, XCircle } from 'lucide-react';
import { useHireContracts, HireContract } from '@/hooks/useHireContracts';
import { buildContractPdf, downloadContractPdf } from '@/lib/contractPdf';
import { uploadToCatbox } from '@/lib/catbox';
import { toast } from 'sonner';

export default function HireContractDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { sign, complete, cancel, updatePdf, notifyExpert } = useHireContracts();
  const [c, setC] = useState<HireContract | null>(null);
  const [client, setClient] = useState<any>(null);
  const [expert, setExpert] = useState<any>(null);
  const [sig, setSig] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  const load = async () => {
    if (!id) return;
    const { data } = await supabase.from('hire_contracts').select('*').eq('id', id).maybeSingle();
    if (!data) return;
    setC(data as HireContract);
    const { data: profs } = await supabase.from('profiles')
      .select('user_id,full_name,profile_picture_url,telegram_user_id')
      .in('user_id', [data.client_id, data.expert_id]);
    const map = new Map((profs || []).map((p: any) => [p.user_id, p]));
    setClient(map.get(data.client_id));
    setExpert(map.get(data.expert_id));
  };

  useEffect(() => { load(); }, [id]);

  if (!c) return <div className="container max-w-3xl mx-auto p-6">Loading…</div>;

  const isClient = user?.id === c.client_id;
  const isExpert = user?.id === c.expert_id;
  const canSign = (c.status === 'pending_expert_signature' || c.status === 'pending_client_signature') &&
    ((isClient && !c.client_signed_at) || (isExpert && !c.expert_signed_at));

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
    setBusy(true);
    const r = await sign(c.id, sig.trim());
    if (r.success) {
      await load();
      // After both signed, regenerate PDF, upload, save url, send notifications
      const after = await supabase.from('hire_contracts').select('*').eq('id', c.id).maybeSingle();
      const fresh = after.data as HireContract | null;
      if (fresh?.client_signed_at && fresh?.expert_signed_at) {
        try {
          const blob = buildContractPdf({ ...pdfPayload(),
            client_signature: fresh.client_signature, expert_signature: fresh.expert_signature,
            client_signed_at: fresh.client_signed_at, expert_signed_at: fresh.expert_signed_at });
          const file = new File([blob], `contract-${c.id}.pdf`, { type: 'application/pdf' });
          const url = await uploadToCatbox(file);
          if (url) { await updatePdf(c.id, url); }
          await notifyExpert(c.id, 'signed');
        } catch (e) { console.warn('pdf/notify error', e); }
      }
    }
    setBusy(false); setSig('');
  };

  const handleComplete = async () => { setBusy(true); await complete(c.id); await load(); setBusy(false); };
  const handleCancel = async () => {
    if (!reason.trim()) { toast.error('Please give a reason'); return; }
    setBusy(true); await cancel(c.id, reason.trim()); await load(); setBusy(false);
  };

  const statusColor: Record<string, string> = {
    pending_expert_signature: 'bg-amber-100 text-amber-700',
    pending_client_signature: 'bg-amber-100 text-amber-700',
    active: 'bg-green-100 text-green-700',
    completed: 'bg-blue-100 text-blue-700',
    cancelled: 'bg-slate-100 text-slate-700',
    disputed: 'bg-red-100 text-red-700',
  };

  return (
    <div className="container max-w-3xl mx-auto p-4 space-y-4">
      <Button variant="ghost" onClick={() => navigate(-1)}><ArrowLeft className="h-4 w-4 mr-1" />Back</Button>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <div>
              <CardTitle className="text-xl">{c.title}</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Between <strong>{client?.full_name}</strong> and <strong>{expert?.full_name}</strong>
              </p>
            </div>
            <Badge className={statusColor[c.status] || ''}>{c.status.replace(/_/g, ' ')}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="p-3 rounded-md bg-muted">
              <div className="text-xs text-muted-foreground">Type</div>
              <div className="font-medium capitalize">{c.contract_type}</div>
            </div>
            <div className="p-3 rounded-md bg-muted">
              <div className="text-xs text-muted-foreground">Escrow held</div>
              <div className="font-medium">NC {Number(c.escrow_held).toLocaleString()}</div>
            </div>
            {c.contract_type === 'fixed' ? (
              <div className="p-3 rounded-md bg-muted col-span-2">
                <div className="text-xs text-muted-foreground">Total amount</div>
                <div className="font-medium">NC {Number(c.total_amount).toLocaleString()}</div>
              </div>
            ) : (
              <>
                <div className="p-3 rounded-md bg-muted">
                  <div className="text-xs text-muted-foreground">Rate</div>
                  <div className="font-medium">NC {Number(c.hourly_rate || 0).toLocaleString()}/hr</div>
                </div>
                <div className="p-3 rounded-md bg-muted">
                  <div className="text-xs text-muted-foreground">Deposit</div>
                  <div className="font-medium">NC {Number(c.deposit_amount).toLocaleString()}</div>
                </div>
              </>
            )}
            {c.deadline && (
              <div className="p-3 rounded-md bg-muted col-span-2">
                <div className="text-xs text-muted-foreground">Deadline</div>
                <div className="font-medium">{new Date(c.deadline).toLocaleDateString()}</div>
              </div>
            )}
          </div>

          <div>
            <h3 className="text-sm font-semibold mb-1">Scope of work</h3>
            <p className="text-sm whitespace-pre-wrap text-muted-foreground">{c.scope}</p>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="p-3 rounded-md border">
              <div className="text-xs text-muted-foreground">Client signature</div>
              <div className="italic font-semibold">{c.client_signature || '—'}</div>
              {c.client_signed_at && <div className="text-[10px] text-muted-foreground">{new Date(c.client_signed_at).toLocaleString()}</div>}
            </div>
            <div className="p-3 rounded-md border">
              <div className="text-xs text-muted-foreground">Expert signature</div>
              <div className="italic font-semibold">{c.expert_signature || '—'}</div>
              {c.expert_signed_at && <div className="text-[10px] text-muted-foreground">{new Date(c.expert_signed_at).toLocaleString()}</div>}
            </div>
          </div>

          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={() => downloadContractPdf(pdfPayload())}>
              <Download className="h-4 w-4 mr-1" />Download PDF
            </Button>
            {c.pdf_url && (
              <a href={c.pdf_url} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="sm">Open shared PDF</Button>
              </a>
            )}
          </div>
        </CardContent>
      </Card>

      {canSign && (
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><FileSignature className="h-4 w-4" />Sign contract</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label htmlFor="sig">Type your full name to sign</Label>
              <Input id="sig" value={sig} onChange={(e) => setSig(e.target.value)} placeholder="Your full legal name" />
            </div>
            <div className="text-xs text-muted-foreground flex gap-2">
              <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
              <span>By signing you authorize the escrow deduction (if you're the client) and accept the terms.</span>
            </div>
            <Button onClick={handleSign} disabled={busy || !sig.trim()}>
              {busy ? 'Signing…' : 'Sign now'}
            </Button>
          </CardContent>
        </Card>
      )}

      {c.status === 'active' && isClient && (
        <Card>
          <CardHeader><CardTitle className="text-base">Mark as complete</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">Release escrowed funds to the expert.</p>
            <Button onClick={handleComplete} disabled={busy}>
              <CheckCircle2 className="h-4 w-4 mr-1" /> Complete & release
            </Button>
          </CardContent>
        </Card>
      )}

      {['pending_expert_signature','pending_client_signature','active'].includes(c.status) && (
        <Card>
          <CardHeader><CardTitle className="text-base">Cancel contract</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason for cancelling…" />
            <Button variant="destructive" onClick={handleCancel} disabled={busy || !reason.trim()}>
              <XCircle className="h-4 w-4 mr-1" /> Cancel contract
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
