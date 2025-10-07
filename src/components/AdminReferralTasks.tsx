import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAdminReferralTasks, ReferralTask } from '@/hooks/useReferralTasks'
import { Plus, Edit, Trash2, Eye, Check, X } from 'lucide-react'

export const AdminReferralTasks = () => {
  const { tasks, submissions, loading, createTask, updateTask, deleteTask, approveSubmission, rejectSubmission } = useAdminReferralTasks()
  const [createOpen, setCreateOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<ReferralTask | null>(null)
  const [rejectOpen, setRejectOpen] = useState(false)
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    reward: '',
    status: 'active'
  })

  const resetForm = () => {
    setFormData({ title: '', description: '', reward: '', status: 'active' })
  }

  const handleCreate = async () => {
    if (!formData.title || !formData.description || !formData.reward) return

    const result = await createTask({
      title: formData.title,
      description: formData.description,
      reward: parseFloat(formData.reward),
      status: formData.status
    })

    if (result.success) {
      setCreateOpen(false)
      resetForm()
    }
  }

  const handleEdit = async () => {
    if (!editingTask || !formData.title || !formData.description || !formData.reward) return

    const result = await updateTask(editingTask.id, {
      title: formData.title,
      description: formData.description,
      reward: parseFloat(formData.reward),
      status: formData.status
    })

    if (result.success) {
      setEditOpen(false)
      setEditingTask(null)
      resetForm()
    }
  }

  const openEdit = (task: ReferralTask) => {
    setEditingTask(task)
    setFormData({
      title: task.title,
      description: task.description,
      reward: task.reward.toString(),
      status: task.status
    })
    setEditOpen(true)
  }

  const handleReject = async () => {
    if (!rejectingId || !rejectReason) return

    const result = await rejectSubmission(rejectingId, rejectReason)
    if (result.success) {
      setRejectOpen(false)
      setRejectingId(null)
      setRejectReason('')
    }
  }

  const openReject = (submissionId: string) => {
    setRejectingId(submissionId)
    setRejectOpen(true)
  }

  if (loading) {
    return <div className="flex justify-center p-8">Loading...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Referral Tasks Management</h2>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Referral Task
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Create Referral Task</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. Opay Referral – Earn ₦1,000"
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Steps users must follow..."
                  rows={3}
                />
              </div>
              <div>
                <Label htmlFor="reward">Reward Amount (₦)</Label>
                <Input
                  id="reward"
                  type="number"
                  value={formData.reward}
                  onChange={(e) => setFormData({ ...formData, reward: e.target.value })}
                  placeholder="1000"
                />
              </div>
              <div>
                <Label htmlFor="status">Status</Label>
                <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleCreate} className="flex-1">Create Task</Button>
                <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="tasks" className="w-full">
        <TabsList>
          <TabsTrigger value="tasks">Tasks ({tasks.length})</TabsTrigger>
          <TabsTrigger value="submissions">Submissions ({submissions.filter(s => s.status === 'pending').length} pending)</TabsTrigger>
        </TabsList>

        <TabsContent value="tasks" className="space-y-4">
          <div className="grid gap-4">
            {tasks.map((task) => (
              <Card key={task.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{task.title}</CardTitle>
                      <CardDescription>
                        Reward: ₦{task.reward.toLocaleString()} • {task.status}
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => openEdit(task)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => deleteTask(task.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {task.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="submissions" className="space-y-4">
          <div className="grid gap-4">
            {submissions.map((submission) => (
              <Card key={submission.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{submission.task?.title}</CardTitle>
                      <CardDescription>
                        Submitted {new Date(submission.created_at).toLocaleDateString()}
                        • Reward: ₦{submission.task?.reward.toLocaleString()}
                      </CardDescription>
                    </div>
                    <Badge 
                      variant={
                        submission.status === 'approved' ? 'default' : 
                        submission.status === 'rejected' ? 'destructive' : 
                        'secondary'
                      }
                    >
                      {submission.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {submission.proof_url && (
                    <div>
                      <Label>Proof Screenshot:</Label>
                      <div className="mt-2">
                        <img 
                          src={submission.proof_url} 
                          alt="Proof screenshot" 
                          className="max-w-full h-auto max-h-64 rounded border"
                        />
                        <Button variant="outline" size="sm" className="mt-2" asChild>
                          <a href={submission.proof_url} target="_blank" rel="noopener noreferrer">
                            <Eye className="h-4 w-4 mr-2" />
                            View Full Size
                          </a>
                        </Button>
                      </div>
                    </div>
                  )}

                  {submission.text_explanation && (
                    <div>
                      <Label>Text Explanation:</Label>
                      <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{submission.text_explanation}</p>
                    </div>
                  )}
                  
                  {submission.admin_comment && (
                    <div>
                      <Label>Admin Comment:</Label>
                      <p className="text-sm text-muted-foreground mt-1">{submission.admin_comment}</p>
                    </div>
                  )}

                  {submission.status === 'pending' && (
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        onClick={() => approveSubmission(submission.id, submission.task?.reward || 0)}
                      >
                        <Check className="h-4 w-4 mr-2" />
                        Approve & Credit ₦{submission.task?.reward.toLocaleString()}
                      </Button>
                      <Button 
                        size="sm" 
                        variant="destructive"
                        onClick={() => openReject(submission.id)}
                      >
                        <X className="h-4 w-4 mr-2" />
                        Reject
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Referral Task</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-title">Title</Label>
              <Input
                id="edit-title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="edit-reward">Reward Amount (₦)</Label>
              <Input
                id="edit-reward"
                type="number"
                value={formData.reward}
                onChange={(e) => setFormData({ ...formData, reward: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="edit-status">Status</Label>
              <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleEdit} className="flex-1">Update Task</Button>
              <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reject Submission</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="reject-reason">Rejection Reason</Label>
              <Textarea
                id="reject-reason"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Please provide a reason for rejection..."
                rows={3}
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleReject} variant="destructive" className="flex-1">
                Reject Submission
              </Button>
              <Button variant="outline" onClick={() => setRejectOpen(false)}>Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}