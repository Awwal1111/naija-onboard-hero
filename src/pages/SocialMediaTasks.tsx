import React, { useState, useEffect } from 'react'
import { ArrowLeft, Plus, Users, UserCheck, Star, ExternalLink } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { BottomNavBar } from '@/components/BottomNavBar'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { BrandButton } from '@/components/ui/brand-button'
import { BrandInput } from '@/components/ui/brand-input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAuth } from '@/hooks/useAuth'
import { useProfile } from '@/hooks/useProfile'
import { useSocialTasks, TaskWithStatus } from '@/hooks/useSocialTasks'
import { SocialTaskCompletionDialog } from '@/components/SocialTaskCompletionDialog'
import { ExpandableText } from '@/components/ExpandableText'
import { toast } from 'sonner'

interface CreateTaskForm {
  platform: string
  type: string
  link: string
  reward: number
  total_slots: number
}

export const SocialMediaTasks = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()
  const { profile } = useProfile()
  const { tasks, loading, claimTask, completeTask, createTask } = useSocialTasks()
  const [userRole, setUserRole] = useState<'earner' | 'tasker' | null>(null)
  const [moreMenuOpen, setMoreMenuOpen] = useState(false)
  const [createForm, setCreateForm] = useState<CreateTaskForm>({
    platform: '',
    type: '',
    link: '',
    reward: 0,
    total_slots: 0
  })
  const [completionDialogOpen, setCompletionDialogOpen] = useState(false)
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null)


  // Remove manual redirect - ProtectedRoute handles this
  // useEffect(() => {
  //   if (!user) {
  //     navigate('/login')
  //   }
  // }, [user, navigate])

  const handleTaskAction = async (taskId: number, action: 'claim' | 'complete') => {
    try {
      if (action === 'claim') {
        const result = await claimTask(taskId)
        if (result.success) {
          toast.success('Task claimed successfully!')
        } else {
          toast.error(result.error || 'Failed to claim task')
        }
      } else if (action === 'complete') {
        setSelectedTaskId(taskId)
        setCompletionDialogOpen(true)
      }
    } catch (error) {
      console.error('Task action error:', error)
      toast.error('An error occurred. Please try again.')
    }
  }

  const handleCreateTask = async () => {
    if (!createForm.platform || !createForm.type || !createForm.link || createForm.reward <= 0 || createForm.total_slots <= 0) {
      toast.error('Please fill in all fields with valid values')
      return
    }

    try {
      // Map form data to match database schema
      const taskData = {
        platform: createForm.platform,
        type: createForm.type,
        link: createForm.link,
        reward_amount: createForm.reward, // Fix: map 'reward' to 'reward_amount'
        total_slots: createForm.total_slots
      }
      
      const result = await createTask(taskData)
      if (result.success) {
        toast.success('Task created successfully!')
        setCreateForm({
          platform: '',
          type: '',
          link: '',
          reward: 0,
          total_slots: 0
        })
        setUserRole('earner') // Switch back to earner view
      } else {
        toast.error(result.error || 'Failed to create task')
      }
    } catch (error) {
      console.error('Create task error:', error)
      toast.error('Failed to create task. Please try again.')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-subtle p-4 flex items-center justify-center pb-20">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (!userRole) {
    return (
      <div className="min-h-screen bg-gradient-subtle pb-20">
        <div className="max-w-md mx-auto">
          {/* Header */}
          <header className="bg-background border-b border-border px-6 py-4 flex items-center justify-between">
            <button onClick={() => navigate('/earn')} className="flex items-center gap-2">
              <ArrowLeft className="h-5 w-5 text-text-secondary" />
            </button>
            <h1 className="text-lg font-bold text-primary">Social Media Tasks</h1>
            <div className="w-5" />
          </header>

          {/* Role Selection */}
          <div className="p-6">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-foreground mb-2">Choose Your Role</h2>
              <p className="text-muted-foreground">How would you like to participate?</p>
            </div>

            <div className="space-y-4">
              <Card className="border-primary/30 cursor-pointer hover:border-primary/50 transition-colors" 
                    onClick={() => setUserRole('earner')}>
                <CardHeader className="text-center">
                  <div className="bg-primary/10 p-4 rounded-full w-fit mx-auto mb-4">
                    <UserCheck className="h-8 w-8 text-primary" />
                  </div>
                  <CardTitle className="text-xl">Earner</CardTitle>
                  <CardDescription>Complete tasks to earn money</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="text-sm text-muted-foreground space-y-2">
                    <li>• Follow, like, subscribe to earn 20-100 NC</li>
                    <li>• Complete tasks at your own pace</li>
                    <li>• Withdraw earnings to your bank</li>
                  </ul>
                </CardContent>
              </Card>

              {/* Task Creator option removed - Only admins can create tasks now */}
              <div className="text-center pt-4 text-sm text-muted-foreground">
                <p>Tasks are created by NaijaLancers admins.</p>
                <p>Complete tasks above to earn NaijaCoin!</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (userRole === 'earner') {
    return (
      <div className="min-h-screen bg-gradient-subtle pb-20">
        <div className="max-w-md mx-auto">
          {/* Header */}
          <header className="bg-background border-b border-border px-6 py-4 flex items-center justify-between">
            <button onClick={() => setUserRole(null)} className="flex items-center gap-2">
              <ArrowLeft className="h-5 w-5 text-text-secondary" />
            </button>
            <h1 className="text-lg font-bold text-primary">Available Tasks</h1>
            <div className="w-12" /> {/* Spacer - removed task creation for users */}
          </header>

          {/* Task Feed */}
          <div className="p-6">
            <div className="space-y-4">
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
                  <p className="text-muted-foreground">Loading tasks...</p>
                </div>
              ) : tasks.length === 0 ? (
                <div className="text-center py-8">
                  <Star className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No tasks available right now</p>
                </div>
              ) : (
                tasks.map((task) => (
                  <Card key={task.id} className="border-accent/20">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between mb-2">
                        <Badge variant="outline" className="text-xs">
                          {task.platform}
                        </Badge>
                        <div className="text-right">
                          <p className="text-lg font-bold text-green-600">{task.reward} NC</p>
                          <p className="text-xs text-muted-foreground">per task</p>
                        </div>
                      </div>
                      <CardTitle className="text-base flex items-center gap-2">
                        {task.type} Task
                        <Badge variant="secondary" className="text-xs">
                          {task.total_slots - task.done_slots} left
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between mb-4">
                        <div className="text-sm text-muted-foreground">
                          Progress: {task.done_slots}/{task.total_slots}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Task #{task.id}
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                        <BrandButton 
                          className="w-full" 
                          onClick={() => {
                            if (task.link && task.link !== '#') {
                              window.open(task.link, '_blank', 'noopener,noreferrer')
                              toast.success(`Opened ${task.platform} link. Complete the task and come back to mark it as done.`)
                            } else {
                              toast.error('Task link not available')
                            }
                          }}
                          disabled={task.done_slots >= task.total_slots || task.userSubmission?.status === 'pending'}
                        >
                          <ExternalLink className="h-4 w-4 mr-2" />
                          {task.userSubmission?.status === 'pending' 
                            ? 'Pending Approval' 
                            : task.done_slots >= task.total_slots 
                            ? 'Task Completed' 
                            : `Open ${task.platform}`}
                        </BrandButton>
                        
                        {task.userSubmission?.status === 'pending' ? (
                          <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-lg">
                            <p className="text-sm text-amber-800 dark:text-amber-200 text-center">
                              ✓ Submitted! Wait for admin approval
                            </p>
                          </div>
                        ) : task.done_slots < task.total_slots ? (
                          <div className="flex gap-2">
                            <Button 
                              variant="outline" 
                              className="flex-1" 
                              onClick={() => handleTaskAction(task.id, 'claim')}
                            >
                              Claim Task
                            </Button>
                            <Button 
                              className="flex-1" 
                              onClick={() => handleTaskAction(task.id, 'complete')}
                            >
                              Submit Proof
                            </Button>
                          </div>
                        ) : null}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        </div>

        <BottomNavBar />

        {/* Completion Dialog */}
        {selectedTaskId && (
          <SocialTaskCompletionDialog
            open={completionDialogOpen}
            onOpenChange={setCompletionDialogOpen}
            taskId={selectedTaskId}
            onSubmit={completeTask}
          />
        )}
      </div>
    )
  }

  // Task Creator View
  return (
    <div className="min-h-screen bg-gradient-subtle pb-20">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <header className="bg-background border-b border-border px-6 py-4 flex items-center justify-between">
          <button onClick={() => setUserRole(null)} className="flex items-center gap-2">
            <ArrowLeft className="h-5 w-5 text-text-secondary" />
          </button>
          <h1 className="text-lg font-bold text-primary">Create Task</h1>
          <button onClick={() => setUserRole('earner')} className="text-sm text-primary">
            Browse
          </button>
        </header>

        <div className="p-6">
          <Card>
            <CardHeader>
              <CardTitle>Create New Task</CardTitle>
              <CardDescription>Create social media tasks for others to complete and help grow your online presence.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Platform</label>
                <Select value={createForm.platform} onValueChange={(value) => setCreateForm({...createForm, platform: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select platform" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Instagram">Instagram</SelectItem>
                    <SelectItem value="YouTube">YouTube</SelectItem>
                    <SelectItem value="TikTok">TikTok</SelectItem>
                    <SelectItem value="Facebook">Facebook</SelectItem>
                    <SelectItem value="Twitter">Twitter</SelectItem>
                    <SelectItem value="LinkedIn">LinkedIn</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Task Type</label>
                <Select value={createForm.type} onValueChange={(value) => setCreateForm({...createForm, type: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select task type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Follow">Follow</SelectItem>
                    <SelectItem value="Like">Like</SelectItem>
                    <SelectItem value="Subscribe">Subscribe</SelectItem>
                    <SelectItem value="Share">Share</SelectItem>
                    <SelectItem value="Comment">Comment</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Link</label>
                <BrandInput
                  placeholder="https://instagram.com/yourpage"
                  value={createForm.link}
                  onChange={(e) => setCreateForm({...createForm, link: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Reward (NC)</label>
                <BrandInput
                  type="number"
                  placeholder="50"
                  value={createForm.reward || ''}
                  onChange={(e) => setCreateForm({...createForm, reward: Number(e.target.value)})}
                />
              </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">Total Slots</label>
                  <BrandInput
                    type="number"
                    placeholder="100"
                    value={createForm.total_slots || ''}
                    onChange={(e) => setCreateForm({...createForm, total_slots: Number(e.target.value)})}
                  />
                </div>
              </div>

              <BrandButton 
                className="w-full" 
                onClick={handleCreateTask}
                disabled={!createForm.platform || !createForm.type || !createForm.link || createForm.reward <= 0 || createForm.total_slots <= 0}
              >
                Create Task ({(createForm.reward * createForm.total_slots) || 0} NC total)
              </BrandButton>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Completion Dialog */}
      {selectedTaskId && (
        <SocialTaskCompletionDialog
          open={completionDialogOpen}
          onOpenChange={setCompletionDialogOpen}
          taskId={selectedTaskId}
          onSubmit={completeTask}
        />
      )}
    </div>
  )
}