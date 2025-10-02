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
  onSubmit: (taskId: number, screenshotUrl?: string, textExplanation?: string) => Promise<{ success: boolean; error?: string }>
}

export const SocialTaskCompletionDialog = ({ open, onOpenChange, taskId, onSubmit }: SocialTaskCompletionDialogProps) => {
  const [proof, setProof] = useState('')
  const [textExplanation, setTextExplanation] = useState('')
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
    if (!proof && !textExplanation.trim()) {
      toast.error('Please provide either a screenshot or text explanation')
      return
    }

    setSubmitting(true)
    const result = await onSubmit(taskId, proof, textExplanation)
    if (result.success) {
      onOpenChange(false)
      setProof('')
      setTextExplanation('')
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
            Provide proof by uploading a screenshot OR writing a brief explanation.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="proof">Upload Screenshot Proof (Optional)</Label>
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

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">Or</span>
            </div>
          </div>

          <div>
            <Label htmlFor="textExplanation">Text Explanation (Optional)</Label>
            <Textarea
              id="textExplanation"
              value={textExplanation}
              onChange={(e) => setTextExplanation(e.target.value)}
              placeholder="Describe how you completed the task..."
              rows={4}
              className="mt-2"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Provide a brief explanation of how you completed the task
            </p>
          </div>

          <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-lg">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              📧 <strong>Alternative:</strong> support@naijalancers.name.ng
            </p>
            <p className="text-xs text-blue-600 dark:text-blue-300 mt-1">
              Status will show "Wait for approval" until admin reviews your submission.
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleSubmit}
              disabled={(!proof && !textExplanation.trim()) || submitting || uploadProgress.isUploading}
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