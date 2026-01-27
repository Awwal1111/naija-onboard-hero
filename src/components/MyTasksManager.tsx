import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Task, TaskSubmission } from '@/hooks/useTasks'
import { Check, X, Clock, Users, Eye, MessageCircle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { formatDistanceToNow } from 'date-fns'

interface MyTasksManagerProps {
  tasks: Task[]
  submissions: TaskSubmission[]
  onApprove: (submissionId: string) => Promise<{ success: boolean }>
  onReject: (submissionId: string, reason: string) => Promise<{ success: boolean }>
  onChatWithSubmitter?: (userId: string) => Promise<string | null>
}

export const MyTasksManager = ({
  tasks,
  submissions,
  onApprove,
  onReject,
  onChatWithSubmitter
}: MyTasksManagerProps) => {
  const navigate = useNavigate()
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false)
  const [selectedSubmission, setSelectedSubmission] = useState<TaskSubmission | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [processing, setProcessing] = useState<string | null>(null)
  const [viewingProof, setViewingProof] = useState<string | null>(null)

  const pendingSubmissions = submissions.filter(s => s.status === 'pending')

  const handleApprove = async (submission: TaskSubmission) => {
    setProcessing(submission.id)
    await onApprove(submission.id)
    setProcessing(null)
  }

  const handleReject = async () => {
    if (!selectedSubmission || !rejectReason.trim()) return
    
    setProcessing(selectedSubmission.id)
    await onReject(selectedSubmission.id, rejectReason)
    setProcessing(null)
    setRejectDialogOpen(false)
    setRejectReason('')
    setSelectedSubmission(null)
  }

  const handleChat = async (userId: string) => {
    if (!onChatWithSubmitter) return
    const chatId = await onChatWithSubmitter(userId)
    if (chatId) {
      navigate(`/chat/${chatId}`)
    }
  }

  if (tasks.length === 0) {
    return (
      <div className="text-center py-8">
        <Users className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground">You haven't created any tasks yet</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Pending Submissions Alert */}
      {pendingSubmissions.length > 0 && (
        <Card className="border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-5 w-5 text-amber-600" />
              {pendingSubmissions.length} Pending Submission{pendingSubmissions.length > 1 ? 's' : ''}
            </CardTitle>
            <CardDescription>
              Review and approve/reject submissions. Auto-approval in 24h if not reviewed.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingSubmissions.map((submission) => (
              <Card key={submission.id} className="bg-background">
                <CardContent className="p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={submission.user?.profile_picture_url} />
                        <AvatarFallback>
                          {submission.user?.full_name?.charAt(0) || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">
                          {submission.user?.full_name || 'Unknown User'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Task: {submission.task?.title}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(submission.created_at), { addSuffix: true })}
                        </p>
                        
                        {/* Proof preview */}
                        {submission.proof_url && (
                          <Button
                            variant="link"
                            size="sm"
                            className="h-auto p-0 text-xs"
                            onClick={() => setViewingProof(submission.proof_url!)}
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            View Screenshot
                          </Button>
                        )}
                        {submission.text_explanation && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            "{submission.text_explanation}"
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex gap-1.5">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0"
                        onClick={() => handleChat(submission.user_id)}
                      >
                        <MessageCircle className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="default"
                        className="h-8 w-8 p-0 bg-green-600 hover:bg-green-700"
                        disabled={processing === submission.id}
                        onClick={() => handleApprove(submission)}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        className="h-8 w-8 p-0"
                        disabled={processing === submission.id}
                        onClick={() => {
                          setSelectedSubmission(submission)
                          setRejectDialogOpen(true)
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </CardContent>
        </Card>
      )}

      {/* My Tasks List */}
      <div>
        <h3 className="text-lg font-semibold mb-3">Your Tasks</h3>
        <div className="grid gap-3">
          {tasks.map((task) => (
            <Card key={task.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-medium">{task.title}</h4>
                    <p className="text-sm text-muted-foreground line-clamp-1">
                      {task.description}
                    </p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                      <span>{task.reward} NC/slot</span>
                      <span>•</span>
                      <span>{task.done_slots}/{task.total_slots} completed</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge 
                      variant={task.done_slots >= task.total_slots ? 'secondary' : 'default'}
                    >
                      {task.done_slots >= task.total_slots ? 'Completed' : 'Active'}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Submission</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this submission.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Textarea
              placeholder="Reason for rejection..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
            />
            <div className="flex gap-2">
              <Button
                onClick={handleReject}
                disabled={!rejectReason.trim() || processing === selectedSubmission?.id}
                variant="destructive"
                className="flex-1"
              >
                Reject
              </Button>
              <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Proof Viewer Dialog */}
      <Dialog open={!!viewingProof} onOpenChange={() => setViewingProof(null)}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Submission Proof</DialogTitle>
          </DialogHeader>
          {viewingProof && (
            <img 
              src={viewingProof} 
              alt="Submission proof" 
              className="w-full rounded-lg"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
