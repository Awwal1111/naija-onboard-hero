import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { useHireContracts, ContractType } from '@/hooks/useHireContracts';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Briefcase, Clock } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  expertId: string;
  expertName: string;
}

export function HireContractDialog({ open, onOpenChange, expertId, expertName }: Props) {
  const navigate = useNavigate();
  const { create } = useHireContracts();
  const [type, setType] = useState<ContractType>('fixed');
  const [title, setTitle] = useState('');
  const [scope, setScope] = useState('');
  const [total, setTotal] = useState('');
  const [rate, setRate] = useState('');
  const [cap, setCap] = useState('20');
  const [deposit, setDeposit] = useState('');
  const [deadline, setDeadline] = useState('');
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);

  const reset = () => {
    setTitle(''); setScope(''); setTotal(''); setRate(''); setCap('20'); setDeposit(''); setDeadline(''); setAgree(false);
  };

  const submit = async () => {
    if (!title.trim() || !scope.trim()) return;
    if (!agree) return;
    setBusy(true);
    const payload: any = {
      expert_id: expertId, contract_type: type, title: title.trim(), scope: scope.trim(),
      deadline: deadline || null,
    };
    if (type === 'fixed') {
      const amt = Number(total);
      if (!amt || amt <= 0) { setBusy(false); return; }
      payload.total_amount = amt;
    } else {
      const r = Number(rate); const c = Number(cap); const d = Number(deposit);
      if (!r || r <= 0) { setBusy(false); return; }
      payload.hourly_rate = r;
      payload.weekly_cap_hours = c || null;
      payload.deposit_amount = d || (r * (c || 20));
    }
    const res = await create(payload);
    setBusy(false);
    if (res.success && res.id) {
      onOpenChange(false);
      reset();
      navigate(`/contracts/${res.id}`);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Hire {expertName}</DialogTitle>
          <DialogDescription>Draft a signed contract. Funds are held in escrow and only released to the expert when you approve completion.</DialogDescription>
        </DialogHeader>

        <Tabs value={type} onValueChange={(v) => setType(v as ContractType)} className="mt-2">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="fixed"><Briefcase className="h-4 w-4 mr-1" />Fixed Price</TabsTrigger>
            <TabsTrigger value="hourly"><Clock className="h-4 w-4 mr-1" />Hourly</TabsTrigger>
          </TabsList>

          <div className="space-y-3 mt-4">
            <div>
              <Label htmlFor="c-title">Contract title</Label>
              <Input id="c-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Brand logo design" />
            </div>
            <div>
              <Label htmlFor="c-scope">Scope of work</Label>
              <Textarea id="c-scope" value={scope} onChange={(e) => setScope(e.target.value)} placeholder="What exactly should be delivered, key milestones, expectations…" rows={4} />
            </div>

            <TabsContent value="fixed" className="space-y-3 m-0">
              <div>
                <Label htmlFor="c-total">Total amount (NC)</Label>
                <Input id="c-total" type="number" min={0} value={total} onChange={(e) => setTotal(e.target.value)} placeholder="50000" />
                <p className="text-xs text-muted-foreground mt-1">Held in escrow at signing.</p>
              </div>
            </TabsContent>

            <TabsContent value="hourly" className="space-y-3 m-0">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor="c-rate">Hourly rate (NC)</Label>
                  <Input id="c-rate" type="number" min={0} value={rate} onChange={(e) => setRate(e.target.value)} placeholder="2000" />
                </div>
                <div>
                  <Label htmlFor="c-cap">Weekly cap (hrs)</Label>
                  <Input id="c-cap" type="number" min={1} value={cap} onChange={(e) => setCap(e.target.value)} />
                </div>
              </div>
              <div>
                <Label htmlFor="c-dep">Initial deposit (NC)</Label>
                <Input id="c-dep" type="number" min={0} value={deposit} onChange={(e) => setDeposit(e.target.value)}
                  placeholder={String(Number(rate || 0) * Number(cap || 0))} />
                <p className="text-xs text-muted-foreground mt-1">Defaults to one week (rate × cap). Held in escrow at signing.</p>
              </div>
            </TabsContent>

            <div>
              <Label htmlFor="c-deadline">Deadline (optional)</Label>
              <Input id="c-deadline" type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
            </div>

            <Card className="p-3 bg-muted/40 border-primary/30">
              <div className="flex gap-2 text-xs text-muted-foreground">
                <ShieldCheck className="h-4 w-4 shrink-0 text-primary" />
                <span>Escrow holds funds until you approve completion. A 5% platform fee is applied on release. Cancellations refund remaining escrow.</span>
              </div>
            </Card>

            <label className="flex items-start gap-2 text-sm">
              <Checkbox checked={agree} onCheckedChange={(v) => setAgree(!!v)} />
              <span>I agree to the contract terms and authorize escrow deduction from my NC wallet upon both parties signing.</span>
            </label>
          </div>
        </Tabs>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={busy || !agree || !title.trim() || !scope.trim()}>
            {busy ? 'Creating…' : 'Create & sign'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
