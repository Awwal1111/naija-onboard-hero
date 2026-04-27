import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { CheckCircle2, Handshake } from 'lucide-react'
import { toast } from 'sonner'

interface MarkProjectCompleteDialogProps {
  otherUserId: string
  otherUserName: string
}

type Role = 'client' | 'freelancer'

/**
 * "Mark project complete" — for informal chat-based jobs (no escrow / gig order).
 * Both parties must confirm before it shows up on profiles' "Worked With" section.
 */
export const MarkProjectCompleteDialog = ({
  otherUserId,
  otherUserName,
}: MarkProjectCompleteDialogProps) => {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [role, setRole] = useState<Role>('client')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')

  // Look for any pending completion between these two users
  const { data: pending, refetch } = useQuery({
    queryKey: ['project-completion-pending', user?.id, otherUserId],
    enabled: !!user?.id && !!otherUserId && open,
    staleTime: 30_000,
    queryFn: async () => {
      if (!user?.id) return null
      const { data, error } = await supabase
        .from('project_completions')
        .select(
          'id, client_id, freelancer_id, title, description, amount, client_confirmed, freelancer_confirmed, completed_at, initiated_by'
        )
        .or(
          `and(client_id.eq.${user.id},freelancer_id.eq.${otherUserId}),and(client_id.eq.${otherUserId},freelancer_id.eq.${user.id})`
        )
        .is('completed_at', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (error) throw error
      return data
    },
  })

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('Not signed in')
      const isClient = role === 'client'
      const payload = {
        client_id: isClient ? user.id : otherUserId,
        freelancer_id: isClient ? otherUserId : user.id,
        title: title.trim() || null,
        description: description.trim() || null,
        amount: amount ? Number(amount) : 0,
        initiated_by: user.id,
        client_confirmed: isClient,
        freelancer_confirmed: !isClient,
        client_confirmed_at: isClient ? new Date().toISOString() : null,
        freelancer_confirmed_at: !isClient ? new Date().toISOString() : null,
      }
      const { error } = await supabase.from('project_completions').insert(payload)
      if (error) throw error
    },
    onSuccess: () => {
      toast.success(`Sent! ${otherUserName} needs to confirm to finalize.`)
      queryClient.invalidateQueries({ queryKey: ['project-completion-pending'] })
      queryClient.invalidateQueries({ queryKey: ['collaborations'] })
      setTitle('')
      setDescription('')
      setAmount('')
      setOpen(false)
    },
    onError: (e: any) => toast.error(e?.message || 'Could not send request'),
  })

  const confirmMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc('confirm_project_completion', {
        p_completion_id: id,
      })
      if (error) throw error
    },
    onSuccess: () => {
      toast.success('Project marked complete! ✓')
      queryClient.invalidateQueries({ queryKey: ['project-completion-pending'] })
      queryClient.invalidateQueries({ queryKey: ['collaborations'] })
      refetch()
      setOpen(false)
    },
    onError: (e: any) => toast.error(e?.message || 'Could not confirm'),
  })

  if (!user?.id) return null

  // If a pending completion exists initiated by the other user → show "Confirm" prompt
  const needsMyConfirmation =
    pending &&
    pending.initiated_by !== user.id &&
    ((pending.client_id === user.id && !pending.client_confirmed) ||
      (pending.freelancer_id === user.id && !pending.freelancer_confirmed))

  const waitingOnOther =
    pending &&
    pending.initiated_by === user.id &&
    !(pending.client_confirmed && pending.freelancer_confirmed)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Handshake className="h-4 w-4" />
          Mark project complete
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-primary" />
            Project completion
          </DialogTitle>
          <DialogDescription>
            Both you and {otherUserName} need to confirm. Once confirmed, this project
            will show on your profile's "Worked With" section.
          </DialogDescription>
        </DialogHeader>

        {needsMyConfirmation ? (
          <div className="space-y-3">
            <div className="rounded-lg bg-muted p-3 text-sm">
              <p className="font-medium text-foreground">{pending?.title || 'Untitled project'}</p>
              {pending?.description && (
                <p className="text-muted-foreground mt-1">{pending.description}</p>
              )}
              <p className="text-xs text-muted-foreground mt-2">
                {otherUserName} marked this project as complete. Confirm to finalize.
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Not yet
              </Button>
              <Button
                onClick={() => pending && confirmMutation.mutate(pending.id)}
                disabled={confirmMutation.isPending}
              >
                Confirm complete
              </Button>
            </DialogFooter>
          </div>
        ) : waitingOnOther ? (
          <div className="rounded-lg bg-muted p-3 text-sm space-y-1">
            <p className="font-medium text-foreground">Waiting on {otherUserName}</p>
            <p className="text-muted-foreground">
              You've confirmed your side. Once {otherUserName} confirms, the project
              will appear on both your profiles.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Your role in this project</Label>
              <RadioGroup value={role} onValueChange={(v) => setRole(v as Role)}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="client" id="role-client" />
                  <Label htmlFor="role-client" className="font-normal cursor-pointer">
                    I hired {otherUserName} (I'm the client)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="freelancer" id="role-freelancer" />
                  <Label htmlFor="role-freelancer" className="font-normal cursor-pointer">
                    I worked for {otherUserName} (I'm the freelancer)
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label htmlFor="proj-title">Project title</Label>
              <Input
                id="proj-title"
                placeholder="e.g. Logo design"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={100}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="proj-desc">Short description (optional)</Label>
              <Textarea
                id="proj-desc"
                placeholder="What was delivered?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={300}
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="proj-amount">Amount (NC, optional)</Label>
              <Input
                id="proj-amount"
                type="number"
                inputMode="decimal"
                placeholder="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min="0"
              />
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => createMutation.mutate()}
                disabled={createMutation.isPending}
              >
                Send for confirmation
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
