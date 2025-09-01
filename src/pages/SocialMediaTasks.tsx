import React, { useState, useEffect } from 'react'
import { ArrowLeft, Plus, Users, UserCheck, Home, MessageCircle, DollarSign, User, Star } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { BrandButton } from '@/components/ui/brand-button'
import { useAuth } from '@/hooks/useAuth'
import { useProfile } from '@/hooks/useProfile'

interface SocialTask {
  id: string
  platform: string
  taskType: string
  reward: number
  slotsTotal: number
  slotsCompleted: number
  link: string
  description: string
  createdBy: string
}

export const SocialMediaTasks = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { profile } = useProfile()
  const [userRole, setUserRole] = useState<'earner' | 'tasker' | null>(null)
  const [tasks, setTasks] = useState<SocialTask[]>([])
  const [loading, setLoading] = useState(true)

  const bottomNavItems = [
    { icon: Home, label: 'Feed', path: '/feed' },
    { icon: MessageCircle, label: 'Chat', path: '/chat' },
    { icon: Users, label: 'Expert', path: '/experts' },
    { icon: DollarSign, label: 'Earn', path: '/earn', active: true },
    { icon: User, label: 'Profile', path: '/profile' }
  ]

  useEffect(() => {
    if (!user) {
      navigate('/login')
    }
    // Load tasks from database
    loadTasks()
  }, [user, navigate])

  const loadTasks = async () => {
    // Placeholder for loading tasks from database
    setTasks([
      {
        id: '1',
        platform: 'Instagram',
        taskType: 'Follow',
        reward: 30,
        slotsTotal: 100,
        slotsCompleted: 25,
        link: 'https://instagram.com/example',
        description: 'Follow our business page for latest updates',
        createdBy: 'BusinessOwner123'
      },
      {
        id: '2',
        platform: 'YouTube',
        taskType: 'Subscribe',
        reward: 50,
        slotsTotal: 50,
        slotsCompleted: 10,
        link: 'https://youtube.com/channel/example',
        description: 'Subscribe to our channel for tech tutorials',
        createdBy: 'TechGuru'
      }
    ])
    setLoading(false)
  }

  const handleTaskCompletion = async (taskId: string) => {
    // Send email notification to admin
    const task = tasks.find(t => t.id === taskId)
    if (task) {
      // Implement email notification logic here
      console.log(`Task ${taskId} completed by ${user?.email}`)
      
      // For now, just show a message
      alert('Task marked as completed! Admin will verify and credit your account.')
    }
  }

  if (!user || !profile) {
    return (
      <div className="min-h-screen bg-gradient-subtle p-4 flex items-center justify-center pb-20">
        <div className="text-center">Loading...</div>
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
                    <li>• Follow, like, subscribe to earn ₦20-100</li>
                    <li>• Complete tasks at your own pace</li>
                    <li>• Withdraw earnings to your bank</li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="border-primary/30 cursor-pointer hover:border-primary/50 transition-colors" 
                    onClick={() => setUserRole('tasker')}>
                <CardHeader className="text-center">
                  <div className="bg-primary/10 p-4 rounded-full w-fit mx-auto mb-4">
                    <Plus className="h-8 w-8 text-primary" />
                  </div>
                  <CardTitle className="text-xl">Task Creator</CardTitle>
                  <CardDescription>Create tasks for others to complete</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="text-sm text-muted-foreground space-y-2">
                    <li>• Get followers, likes, subscribers</li>
                    <li>• Set your own budget and rewards</li>
                    <li>• Track progress in real-time</li>
                  </ul>
                </CardContent>
              </Card>
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
            <button onClick={() => setUserRole('tasker')} className="text-sm text-primary">
              Create
            </button>
          </header>

          {/* Task Feed */}
          <div className="p-6">
            <div className="space-y-4">
              {tasks.map((task) => (
                <Card key={task.id} className="border-accent/20">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant="outline" className="text-xs">
                        {task.platform}
                      </Badge>
                      <div className="text-right">
                        <p className="text-lg font-bold text-green-600">₦{task.reward}</p>
                        <p className="text-xs text-muted-foreground">per task</p>
                      </div>
                    </div>
                    <CardTitle className="text-base flex items-center gap-2">
                      {task.taskType} Task
                      <Badge variant="secondary" className="text-xs">
                        {task.slotsTotal - task.slotsCompleted} left
                      </Badge>
                    </CardTitle>
                    <CardDescription>{task.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between mb-4">
                      <div className="text-sm text-muted-foreground">
                        Progress: {task.slotsCompleted}/{task.slotsTotal}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        by @{task.createdBy}
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <BrandButton 
                        className="w-full" 
                        onClick={() => window.open(task.link, '_blank')}
                        disabled={task.slotsCompleted >= task.slotsTotal}
                      >
                        {task.slotsCompleted >= task.slotsTotal ? 'Completed' : `Go to ${task.platform}`}
                      </BrandButton>
                      
                      {task.slotsCompleted < task.slotsTotal && (
                        <Button 
                          variant="outline" 
                          className="w-full" 
                          onClick={() => handleTaskCompletion(task.id)}
                        >
                          I've Done This Task
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Navigation */}
        <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border px-4 py-2">
          <div className="flex justify-around items-center">
            {bottomNavItems.map((item) => (
              <Link 
                key={item.label} 
                to={item.path}
                className={`flex flex-col items-center gap-1 py-2 px-3 rounded-xl transition-colors ${
                  item.active 
                    ? 'text-primary bg-primary/10' 
                    : 'text-text-secondary hover:text-primary hover:bg-primary/5'
                }`}
              >
                <item.icon className="h-5 w-5" />
                <span className="text-xs font-medium">{item.label}</span>
              </Link>
            ))}
          </div>
        </div>
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
              <CardTitle>Task Creator</CardTitle>
              <CardDescription>This feature is coming soon! You'll be able to create social media tasks for others to complete.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Star className="h-12 w-12 mx-auto text-primary mb-4" />
                <p className="text-sm text-muted-foreground mb-4">
                  Task creation will include:
                </p>
                <ul className="text-sm text-muted-foreground space-y-2 text-left max-w-xs mx-auto">
                  <li>• Choose platform (Instagram, YouTube, TikTok, etc.)</li>
                  <li>• Set task type (Follow, Like, Subscribe, etc.)</li>
                  <li>• Define reward amount</li>
                  <li>• Track completion progress</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}