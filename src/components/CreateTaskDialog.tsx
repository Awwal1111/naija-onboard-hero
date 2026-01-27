import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Plus, AlertCircle } from 'lucide-react'
import { useProfile } from '@/hooks/useProfile'

interface CreateTaskDialogProps {
  onCreateTask: (taskData: {
    title: string
    description: string
    reward: number
    total_slots: number
  }) => Promise<{ success: boolean; error?: string }>
}

export const CreateTaskDialog = ({ onCreateTask }: CreateTaskDialogProps) => {
  const { profile } = useProfile()
  const [open, setOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({
    title: '',
    description: '',
    reward: 20,
    total_slots: 10
  })

  const totalCost = form.reward * form.total_slots
  const hasEnoughBalance = (profile?.balance_withdrawable || 0) >= totalCost

  const handleSubmit = async () => {
    if (!form.title.trim() || !form.description.trim()) {
      return
    }

    if (form.reward < 20) {
      return
    }

    if (form.total_slots < 1) {
      return
    }

    setSubmitting(true)
    const result = await onCreateTask(form)
    
    if (result.success) {
      setOpen(false)
      setForm({
        title: '',
        description: '',
        reward: 20,
        total_slots: 10
      })
    }
    setSubmitting(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Create Task
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-w-[95vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create a New Task</DialogTitle>
          <DialogDescription>
            Create a task for others to complete. The total cost will be deducted from your withdrawable balance.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="title">Task Title</Label>
            <Input
              id="title"
              placeholder="e.g., Follow my Instagram page"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="mt-1.5"
            />
          </div>

          <div>
            <Label htmlFor="description">Task Description</Label>
            <Textarea
              id="description"
              placeholder="Describe what users need to do to complete this task..."
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3}
              className="mt-1.5"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="reward">Reward per Slot (NC)</Label>
              <Input
                id="reward"
                type="number"
                min={20}
                value={form.reward}
                onChange={(e) => setForm({ ...form, reward: Math.max(20, Number(e.target.value)) })}
                className="mt-1.5"
              />
              <p className="text-xs text-muted-foreground mt-1">Minimum: 20 NC</p>
            </div>

            <div>
              <Label htmlFor="slots">Total Slots</Label>
              <Input
                id="slots"
                type="number"
                min={1}
                value={form.total_slots}
                onChange={(e) => setForm({ ...form, total_slots: Math.max(1, Number(e.target.value)) })}
                className="mt-1.5"
              />
              <p className="text-xs text-muted-foreground mt-1">How many can complete</p>
            </div>
          </div>

          {/* Cost Summary */}
          <div className={`p-4 rounded-lg ${hasEnoughBalance ? 'bg-green-50 dark:bg-green-950' : 'bg-red-50 dark:bg-red-950'}`}>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium">Total Cost:</span>
              <span className="text-lg font-bold">
                {totalCost.toLocaleString()} NC
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {form.total_slots} slots × {form.reward} NC per slot
            </p>
            <div className="mt-2 pt-2 border-t border-border">
              <div className="flex justify-between text-sm">
                <span>Your Withdrawable Balance:</span>
                <span className={hasEnoughBalance ? 'text-green-600' : 'text-red-600'}>
                  {(profile?.balance_withdrawable || 0).toLocaleString()} NC
                </span>
              </div>
            </div>
          </div>

          {!hasEnoughBalance && (
            <div className="flex items-start gap-2 p-3 bg-destructive/10 rounded-lg">
              <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
              <p className="text-sm text-destructive">
                Insufficient withdrawable balance. You need {(totalCost - (profile?.balance_withdrawable || 0)).toLocaleString()} NC more.
              </p>
            </div>
          )}

          {/* Info Box */}
          <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-lg space-y-2">
            <p className="text-sm text-blue-800 dark:text-blue-200 font-medium">
              How it works:
            </p>
            <ul className="text-xs text-blue-600 dark:text-blue-300 space-y-1 list-disc list-inside">
              <li>Users will see your task and can submit proof of completion</li>
              <li>You can approve/reject submissions in your task management</li>
              <li>If you don't respond within 24 hours, submissions are auto-approved</li>
              <li>Amount is deducted from your withdrawable balance upfront</li>
            </ul>
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              onClick={handleSubmit}
              disabled={
                !form.title.trim() || 
                !form.description.trim() || 
                form.reward < 20 || 
                form.total_slots < 1 ||
                !hasEnoughBalance ||
                submitting
              }
              className="flex-1"
            >
              {submitting ? 'Creating...' : `Create Task (${totalCost.toLocaleString()} NC)`}
            </Button>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
