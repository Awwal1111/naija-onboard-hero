import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useSecureFileUpload } from '@/hooks/useSecureFileUpload'
import { toast } from 'sonner'

interface SocialTaskCompletionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  taskId: number
  onSubmit: (taskId: number, screenshotUrl?: string) => Promise<{ success: boolean; error?: string }>
}

export const SocialTaskCompletionDialog = ({ open, onOpenChange, taskId, onSubmit }: SocialTaskCompletionDialogProps) => {
  const [proof, setProof] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const { uploadFile, uploadProgress } = useSecureFileUpload()

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const result = await uploadFile(file, 'chat-uploads')
    if (result.url) {
      setProof(result.url)
    }
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    const result = await onSubmit(taskId, proof)
    if (result.success) {
      onOpenChange(false)
      setProof('')
      toast.success('Task submitted successfully! Wait for admin approval.')
    }
    setSubmitting(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Complete Social Media Task</DialogTitle>
          <DialogDescription>
            Upload a screenshot as proof that you completed this task. 
            <br />
            <strong>For proof submission, email: support@naijalancers.name.ng</strong>
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="proof">Upload Screenshot Proof</Label>
            <input
              id="proof"
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="mt-2 block w-full text-sm text-muted-foreground
                file:mr-4 file:py-2 file:px-4
                file:rounded-md file:border-0
                file:text-sm file:font-medium
                file:bg-primary file:text-primary-foreground
                hover:file:bg-primary/90"
            />
            {uploadProgress.isUploading && <p className="text-sm text-muted-foreground mt-1">Uploading...</p>}
            {proof && <p className="text-sm text-green-600 mt-1">✅ Screenshot uploaded</p>}
          </div>

          <div className="bg-blue-50 p-3 rounded-lg">
            <p className="text-sm text-blue-800">
              📧 <strong>Email for proof submission:</strong> support@naijalancers.name.ng
            </p>
            <p className="text-xs text-blue-600 mt-1">
              Status will show "Wait for approval" until admin reviews your submission.
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleSubmit}
              disabled={!proof || submitting || uploadProgress.isUploading}
              className="flex-1"
            >
              {submitting ? 'Submitting...' : 'Submit Task'}
            </Button>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}