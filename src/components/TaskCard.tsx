import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useSecureFileUpload } from '@/hooks/useSecureFileUpload'
import { Task } from '@/hooks/useTasks'
import { ExpandableText } from './ExpandableText'
import { MessageCircle, Clock, Users } from 'lucide-react'

interface TaskCardProps {
  task: Task
  hasSubmitted: boolean
  submissionStatus?: string
  adminComment?: string
  onSubmit: (taskId: string, proofUrl?: string, textExplanation?: string) => Promise<{ success: boolean; error?: string }>
  onChatWithCreator?: (creatorId: string) => Promise<string | null>
}

export const TaskCard = ({ 
  task, 
  hasSubmitted, 
  submissionStatus, 
  adminComment, 
  onSubmit,
  onChatWithCreator 
}: TaskCardProps) => {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [proof, setProof] = useState('')
  const [textExplanation, setTextExplanation] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { uploadFile, uploadProgress } = useSecureFileUpload()

  const storageKey = `task-proof-${task.id}`
  
  useEffect(() => {
    const saved = sessionStorage.getItem(storageKey)
    if (saved && !proof) {
      setProof(saved)
    }
  }, [storageKey])
  
  useEffect(() => {
    if (proof) {
      sessionStorage.setItem(storageKey, proof)
    }
  }, [proof, storageKey])

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setError(null)
    const result = await uploadFile(file, 'referral-tasks', undefined, 'image')
    
    if (result.url) {
      setProof(result.url)
      sessionStorage.setItem(storageKey, result.url)
    } else {
      setError(result.error || 'Upload failed')
    }
  }

  const handleSubmit = async () => {
    setError(null)
    
    if (!proof && !textExplanation.trim()) {
      setError('Please provide either a screenshot or text explanation')
      return
    }

    setSubmitting(true)
    try {
      const result = await onSubmit(task.id, proof || undefined, textExplanation || undefined)
      
      if (result.success) {
        setOpen(false)
        setProof('')
        setTextExplanation('')
        setError(null)
        sessionStorage.removeItem(storageKey)
      } else {
        setError(result.error || 'Submission failed')
      }
    } catch (error: any) {
      setError(error.message || 'An unexpected error occurred')
    } finally {
      setSubmitting(false)
    }
  }

  const handleChatWithCreator = async () => {
    if (!task.creator_id || !onChatWithCreator) return
    
    const chatId = await onChatWithCreator(task.creator_id)
    if (chatId) {
      navigate(`/chat/${chatId}`)
    }
  }

  const getStatusBadge = () => {
    if (!hasSubmitted) return null

    switch (submissionStatus) {
      case 'pending':
        return <Badge variant="secondary" className="text-xs">Pending Review</Badge>
      case 'approved':
        return <Badge variant="default" className="text-xs">Approved ✅</Badge>
      case 'rejected':
        return <Badge variant="destructive" className="text-xs">Rejected ❌</Badge>
      default:
        return null
    }
  }

  const slotsRemaining = task.total_slots - task.done_slots
  const isUserCreated = !task.is_admin_created

  return (
    <Card className="h-full">
      <CardHeader className="p-3 sm:p-6">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              {isUserCreated && task.creator && (
                <div className="flex items-center gap-1.5">
                  <Avatar className="h-5 w-5">
                    <AvatarImage src={task.creator.profile_picture_url} />
                    <AvatarFallback className="text-[10px]">
                      {task.creator.full_name?.charAt(0) || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-xs text-muted-foreground truncate max-w-[80px]">
                    {task.creator.full_name}
                  </span>
                </div>
              )}
              {!isUserCreated && (
                <Badge variant="outline" className="text-[10px]">Admin Task</Badge>
              )}
            </div>
            <CardTitle className="text-sm sm:text-lg line-clamp-2">{task.title}</CardTitle>
            <CardDescription className="mt-1 text-xs sm:text-sm flex items-center gap-2">
              <span className="text-green-600 font-semibold">{task.reward.toLocaleString()} NC</span>
              <span className="text-muted-foreground">•</span>
              <span className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                {slotsRemaining} left
              </span>
            </CardDescription>
          </div>
          <div className="flex-shrink-0">
            {getStatusBadge()}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 sm:space-y-4 p-3 sm:p-6 pt-0">
        <div>
          <ExpandableText 
            text={task.description} 
            maxLength={150}
            className="text-sm text-muted-foreground"
          />
        </div>

        {/* Show rejection reason if rejected */}
        {submissionStatus === 'rejected' && adminComment && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
            <p className="text-xs font-medium text-destructive mb-1">Rejection Reason:</p>
            <p className="text-sm text-destructive/90">{adminComment}</p>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-2">
          {/* Chat with creator for user-created tasks */}
          {isUserCreated && task.creator_id && (
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={handleChatWithCreator}
            >
              <MessageCircle className="h-4 w-4 mr-1" />
              Chat
            </Button>
          )}

          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button 
                className={`${isUserCreated ? 'flex-1' : 'w-full'} text-xs sm:text-sm h-8 sm:h-10`}
                disabled={hasSubmitted && submissionStatus !== 'rejected'}
                variant={hasSubmitted && submissionStatus === 'approved' ? 'secondary' : 'default'}
              >
                {hasSubmitted 
                  ? (submissionStatus === 'rejected' ? 'Resubmit' : 'Submitted')
                  : `Earn ${task.reward.toLocaleString()} NC`
                }
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md max-w-[95vw] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Submit Task Proof</DialogTitle>
                <DialogDescription>
                  Upload a screenshot OR provide a text explanation showing you completed this task.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor={`proof-${task.id}`}>Upload Screenshot Proof (Optional)</Label>
                  <input
                    id={`proof-${task.id}`}
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    disabled={uploadProgress.isUploading}
                    className="mt-2 block w-full text-sm text-muted-foreground
                      file:mr-4 file:py-2 file:px-4
                      file:rounded-md file:border-0
                      file:text-sm file:font-medium
                      file:bg-primary file:text-primary-foreground
                      hover:file:bg-primary/90
                      disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  {uploadProgress.isUploading && (
                    <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-950 rounded-md">
                      <p className="text-sm text-blue-800 dark:text-blue-200">
                        ⏳ Uploading proof...
                      </p>
                    </div>
                  )}
                  {proof && (
                    <div className="mt-2 p-3 bg-green-50 dark:bg-green-950 rounded-md border border-green-200 dark:border-green-800">
                      <p className="text-sm text-green-800 dark:text-green-200 font-medium mb-2">
                        ✅ Screenshot uploaded successfully!
                      </p>
                      <img 
                        src={proof} 
                        alt="Uploaded proof" 
                        className="max-h-40 rounded border border-green-200 dark:border-green-700"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none'
                        }}
                      />
                    </div>
                  )}
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
                  <Label htmlFor={`textExplanation-${task.id}`}>Text Explanation (Optional)</Label>
                  <Textarea
                    id={`textExplanation-${task.id}`}
                    value={textExplanation}
                    onChange={(e) => setTextExplanation(e.target.value)}
                    placeholder="Describe how you completed the task..."
                    rows={4}
                    className="mt-2"
                  />
                </div>

                {isUserCreated && (
                  <div className="bg-amber-50 dark:bg-amber-950 p-3 rounded-lg">
                    <p className="text-sm text-amber-800 dark:text-amber-200 font-medium flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      User Task - 24h Auto-Approval
                    </p>
                    <p className="text-xs text-amber-600 dark:text-amber-300 mt-1">
                      If the task creator doesn't respond within 24 hours, you'll be automatically credited.
                    </p>
                  </div>
                )}

                {!isUserCreated && (
                  <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-lg">
                    <p className="text-sm text-blue-800 dark:text-blue-200 font-medium">
                      📋 Admin Task
                    </p>
                    <p className="text-xs text-blue-600 dark:text-blue-300 mt-1">
                      Your submission will be reviewed by admin.
                    </p>
                  </div>
                )}

                {error && (
                  <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">
                    {error}
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    onClick={handleSubmit}
                    disabled={(!proof && !textExplanation.trim()) || submitting || uploadProgress.isUploading}
                    className="flex-1"
                  >
                    {submitting ? 'Submitting...' : 'Submit Task'}
                  </Button>
                  <Button variant="outline" onClick={() => setOpen(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardContent>
    </Card>
  )
}
