import React, { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { AlertTriangle } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { toast } from 'sonner'

interface Props {
  open: boolean
  onOpenChange: (v: boolean) => void
  safepayId: string
  onRaised?: () => void
}

const REASONS = [
  'Work not delivered',
  'Work delivered is incomplete',
  'Work delivered is wrong / poor quality',
  'Buyer refusing to release after delivery',
  'Communication breakdown',
  'Suspected fraud',
  'Other',
]

const RaiseDisputeDialog: React.FC<Props> = ({ open, onOpenChange, safepayId, onRaised }) => {
  const [reason, setReason] = useState('')
  const [details, setDetails] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const submit = async () => {
    if (!reason) {
      toast.error('Pick a reason')
      return
    }
    setSubmitting(true)
    const { error } = await supabase.rpc('raise_safepay_dispute', {
      p_safepay_id: safepayId,
      p_reason: reason,
      p_details: details || null,
    })
    setSubmitting(false)
    if (error) {
      toast.error(error.message)
      return
    }
    toast.success('Dispute raised. Admin will review shortly.')
    onOpenChange(false)
    onRaised?.()
    setReason('')
    setDetails('')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Raise SafePay Dispute
          </DialogTitle>
          <DialogDescription>
            Funds will stay locked. An admin will review and rule within 24–48 hours.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1">
            <Label>Reason</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger><SelectValue placeholder="Pick a reason" /></SelectTrigger>
              <SelectContent>
                {REASONS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Details (optional)</Label>
            <Textarea
              rows={4}
              value={details}
              onChange={(e) => setDetails(e.target.value.slice(0, 1000))}
              placeholder="Describe what happened so the admin can decide fairly…"
            />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button className="flex-1" disabled={submitting || !reason} onClick={submit}>
              {submitting ? 'Submitting…' : 'Raise Dispute'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default RaiseDisputeDialog
