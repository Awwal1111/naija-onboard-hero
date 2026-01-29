import { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { 
  Plus, Trash2, Edit2, ExternalLink, CheckCircle, XCircle, 
  Clock, Send, Twitter, Instagram, Youtube, Facebook, MessageCircle
} from 'lucide-react'
import { toast } from 'sonner'

const PLATFORMS = [
  { value: 'twitter', label: 'Twitter/X', icon: Twitter },
  { value: 'instagram', label: 'Instagram', icon: Instagram },
  { value: 'youtube', label: 'YouTube', icon: Youtube },
  { value: 'facebook', label: 'Facebook', icon: Facebook },
  { value: 'telegram', label: 'Telegram', icon: Send },
  { value: 'tiktok', label: 'TikTok', icon: MessageCircle },
  { value: 'linkedin', label: 'LinkedIn', icon: ExternalLink },
  { value: 'whatsapp', label: 'WhatsApp', icon: MessageCircle },
]

const TASK_TYPES = [
  { value: 'follow', label: 'Follow Account' },
  { value: 'like', label: 'Like Post' },
  { value: 'comment', label: 'Comment on Post' },
  { value: 'share', label: 'Share/Repost' },
  { value: 'subscribe', label: 'Subscribe/Join' },
  { value: 'watch', label: 'Watch Video' },
  { value: 'join_group', label: 'Join Group/Channel' },
  { value: 'custom', label: 'Custom Action' },
]

interface SocialTask {
  id: number
  platform: string
  type: string
  title?: string
  description?: string
  url?: string
  link: string
  reward: number
  total_slots: number
  done_slots: number
  status: string
  created_at: string
}

interface TaskFormData {
  platform: string
  type: string
  title: string
  description: string
  link: string
  reward: number
  total_slots: number
}

export const AdminTaskManager = () => {
  const [tasks, setTasks] = useState<SocialTask[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<SocialTask | null>(null)
  const [formData, setFormData] = useState<TaskFormData>({
    platform: 'twitter',
    type: 'follow',
    title: '',
    description: '',
    link: '',
    reward: 10,
    total_slots: 50
  })

  useEffect(() => {
    fetchTasks()
  }, [])

  const fetchTasks = async () => {
    try {
      const { data, error } = await supabase
        .from('social_tasks')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setTasks(data || [])
    } catch (error) {
      console.error('Error fetching tasks:', error)
      toast.error('Failed to load tasks')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateTask = async () => {
    if (!formData.title || !formData.link) {
      toast.error('Title and Link are required')
      return
    }

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const taskData = {
        ...formData,
        task_giver_id: user.id,
        status: 'active',
        done_slots: 0,
        reward_amount: formData.reward
      }

      if (editingTask) {
        const { error } = await supabase
          .from('social_tasks')
          .update(taskData)
          .eq('id', editingTask.id)

        if (error) throw error
        toast.success('Task updated successfully')
      } else {
        const { error } = await supabase
          .from('social_tasks')
          .insert([taskData])

        if (error) throw error
        toast.success('Task created successfully')
      }

      setIsDialogOpen(false)
      resetForm()
      fetchTasks()
    } catch (error: any) {
      console.error('Error saving task:', error)
      toast.error(error.message || 'Failed to save task')
    }
  }

  const handleDeleteTask = async (taskId: number) => {
    if (!confirm('Are you sure you want to delete this task?')) return

    try {
      // First check if task has any submissions
      const { data: submissions } = await supabase
        .from('social_tasks_progress')
        .select('id')
        .eq('task_id', taskId)
        .limit(1)

      if (submissions && submissions.length > 0) {
        // Just mark as inactive instead of deleting
        const { error } = await supabase
          .from('social_tasks')
          .update({ status: 'cancelled' })
          .eq('id', taskId)

        if (error) throw error
        toast.success('Task cancelled (has existing submissions)')
      } else {
        const { error } = await supabase
          .from('social_tasks')
          .delete()
          .eq('id', taskId)

        if (error) throw error
        toast.success('Task deleted')
      }

      fetchTasks()
    } catch (error) {
      console.error('Error deleting task:', error)
      toast.error('Failed to delete task')
    }
  }

  const handleEditTask = (task: SocialTask) => {
    setEditingTask(task)
    setFormData({
      platform: task.platform,
      type: task.type,
      title: task.title || '',
      description: task.description || '',
      link: task.link || task.url || '',
      reward: task.reward,
      total_slots: task.total_slots
    })
    setIsDialogOpen(true)
  }

  const resetForm = () => {
    setEditingTask(null)
    setFormData({
      platform: 'twitter',
      type: 'follow',
      title: '',
      description: '',
      link: '',
      reward: 10,
      total_slots: 50
    })
  }

  const getPlatformIcon = (platform: string) => {
    const platformData = PLATFORMS.find(p => p.value === platform)
    if (!platformData) return <ExternalLink className="h-4 w-4" />
    const Icon = platformData.icon
    return <Icon className="h-4 w-4" />
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500'
      case 'finished': return 'bg-blue-500'
      case 'cancelled': return 'bg-red-500'
      default: return 'bg-gray-500'
    }
  }

  if (loading) {
    return <div className="text-center py-8">Loading tasks...</div>
  }

  return (
    <div className="space-y-4">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Social Media Tasks ({tasks.length})
        </CardTitle>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open)
          if (!open) resetForm()
        }}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Create Task
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingTask ? 'Edit Task' : 'Create New Task'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Platform</Label>
                  <Select 
                    value={formData.platform} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, platform: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-background border z-[60]">
                      {PLATFORMS.map(platform => (
                        <SelectItem key={platform.value} value={platform.value}>
                          <span className="flex items-center gap-2">
                            <platform.icon className="h-4 w-4" />
                            {platform.label}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Task Type</Label>
                  <Select 
                    value={formData.type} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, type: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-background border z-[60]">
                      {TASK_TYPES.map(type => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Title</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Follow our official Twitter account"
                />
              </div>

              <div className="space-y-2">
                <Label>Description (Optional)</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Detailed instructions for the task..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>Link</Label>
                <Input
                  value={formData.link}
                  onChange={(e) => setFormData(prev => ({ ...prev, link: e.target.value }))}
                  placeholder="https://..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Reward (NC)</Label>
                  <Input
                    type="number"
                    min={1}
                    value={formData.reward}
                    onChange={(e) => setFormData(prev => ({ ...prev, reward: parseInt(e.target.value) || 0 }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Total Slots</Label>
                  <Input
                    type="number"
                    min={1}
                    value={formData.total_slots}
                    onChange={(e) => setFormData(prev => ({ ...prev, total_slots: parseInt(e.target.value) || 0 }))}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateTask}>
                  {editingTask ? 'Update Task' : 'Create Task'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>

      <div className="space-y-3">
        {tasks.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-muted-foreground">No tasks created yet</p>
            </CardContent>
          </Card>
        ) : (
          tasks.map((task) => (
            <Card key={task.id}>
              <CardContent className="pt-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      {getPlatformIcon(task.platform)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium truncate">{task.title}</h4>
                        <Badge className={getStatusColor(task.status)} variant="secondary">
                          {task.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {PLATFORMS.find(p => p.value === task.platform)?.label} • {TASK_TYPES.find(t => t.value === task.type)?.label}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <CheckCircle className="h-3 w-3 text-primary" />
                          {task.done_slots}/{task.total_slots} completed
                        </span>
                        <Badge variant="outline">{task.reward} NC</Badge>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => handleEditTask(task)}>
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => handleDeleteTask(task.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                    <Button size="icon" variant="ghost" asChild>
                      <a href={task.url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
