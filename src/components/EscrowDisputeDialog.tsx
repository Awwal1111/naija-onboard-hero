import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { AlertTriangle, Shield } from 'lucide-react';
import { useDisputes } from '@/hooks/useDisputes';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  orderId: string;
  onRaised?: () => void;
}

const REASONS = [
  'Work not delivered',
  'Work delivered is incomplete',
  'Work delivered is wrong / poor quality',
  'Buyer refusing to release after delivery',
  'Communication breakdown',
  'Suspected fraud',
  'Other',
];

export default function EscrowDisputeDialog({ open, onOpenChange, orderId, onRaised }: Props) {
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const { createDispute, isCreatingDispute, getDisputeForTransaction } = useDisputes();
  const existing = getDisputeForTransaction(orderId);

  const submit = () => {
    if (!reason) return;
    createDispute(
      { transactionId: orderId, reason, details },
      {
        onSuccess: () => {
          onOpenChange(false);
          onRaised?.();
          setReason('');
          setDetails('');
        },
      } as any
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-amber-500" />
            Raise Escrow Dispute
          </DialogTitle>
          <DialogDescription>
            Funds remain locked in escrow while an admin reviews your case (usually within 24–48 hours).
          </DialogDescription>
        </DialogHeader>

        {existing ? (
          <div className="rounded-lg border bg-muted/40 p-4 text-sm space-y-2">
            <div className="flex items-center gap-2 font-medium">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Dispute already submitted
            </div>
            <p className="text-muted-foreground">
              Status: <span className="font-medium capitalize">{existing.status}</span>
            </p>
            {existing.admin_response && (
              <p className="text-muted-foreground">Admin: {existing.admin_response}</p>
            )}
            <Button className="w-full mt-2" variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-1">
              <Label>Reason</Label>
              <Select value={reason} onValueChange={setReason}>
                <SelectTrigger>
                  <SelectValue placeholder="Pick a reason" />
                </SelectTrigger>
                <SelectContent>
                  {REASONS.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Details</Label>
              <Textarea
                rows={4}
                value={details}
                onChange={(e) => setDetails(e.target.value.slice(0, 1000))}
                placeholder="Describe what happened so the admin can decide fairly…"
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button className="flex-1" disabled={isCreatingDispute || !reason} onClick={submit}>
                {isCreatingDispute ? 'Submitting…' : 'Raise Dispute'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
