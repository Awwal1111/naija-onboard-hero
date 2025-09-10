import React, { useState, useEffect } from 'react'
import { ArrowLeft, MessageCircle, Briefcase, Users, DollarSign, Calendar, Eye } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/integrations/supabase/client'
import { Logo } from '@/components/ui/logo'

interface ActivityItem {
  id: string
  type: 'post' | 'job' | 'chat' | 'referral' | 'task' | 'connection'
  description: string
  timestamp: string
  metadata?: any
}

const ActivityLog = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadActivityLog()
  }, [user])

  const loadActivityLog = async () => {
    if (!user) return
    
    try {
      setLoading(true)
      const allActivities: ActivityItem[] = []

      // Fetch posts
      const { data: posts } = await supabase
        .from('posts')
        .select('id, content_type, title, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10)

      if (posts) {
        allActivities.push(...posts.map(post => ({
          id: post.id,
          type: 'post' as const,
          description: `Posted a ${post.content_type}${post.title ? `: ${post.title}` : ''}`,
          timestamp: post.created_at,
          metadata: post
        })))
      }

      // Fetch job posts
      const { data: jobs } = await supabase
        .from('job_posts')
        .select('id, title, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10)

      if (jobs) {
        allActivities.push(...jobs.map(job => ({
          id: job.id,
          type: 'job' as const,
          description: `Posted job: ${job.title}`,
          timestamp: job.created_at,
          metadata: job
        })))
      }

      // Fetch connection requests
      const { data: connections } = await supabase
        .from('connection_requests')
        .select('id, created_at, status')
        .eq('requester_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5)

      if (connections) {
        allActivities.push(...connections.map(conn => ({
          id: conn.id,
          type: 'connection' as const,
          description: `Sent connection request (${conn.status})`,
          timestamp: conn.created_at,
          metadata: conn
        })))
      }

      // Fetch recent chats
      const { data: chats } = await supabase
        .from('chats')
        .select('id, created_at')
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
        .order('created_at', { ascending: false })
        .limit(5)

      if (chats) {
        allActivities.push(...chats.map(chat => ({
          id: chat.id,
          type: 'chat' as const,
          description: 'Started a new chat',
          timestamp: chat.created_at,
          metadata: chat
        })))
      }

      // Sort all activities by timestamp
      allActivities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      
      setActivities(allActivities)
    } catch (error) {
      console.error('Error loading activity log:', error)
    } finally {
      setLoading(false)
    }
  }

  const getActivityIcon = (type: ActivityItem['type']) => {
    switch (type) {
      case 'post':
        return <MessageCircle className="h-4 w-4" />
      case 'job':
        return <Briefcase className="h-4 w-4" />
      case 'chat':
        return <MessageCircle className="h-4 w-4" />
      case 'connection':
        return <Users className="h-4 w-4" />
      case 'referral':
        return <DollarSign className="h-4 w-4" />
      default:
        return <Eye className="h-4 w-4" />
    }
  }

  const getActivityColor = (type: ActivityItem['type']) => {
    switch (type) {
      case 'post':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
      case 'job':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
      case 'chat':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300'
      case 'connection':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300'
    }
  }

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date()
    const time = new Date(timestamp)
    const diffInHours = Math.floor((now.getTime() - time.getTime()) / (1000 * 60 * 60))
    
    if (diffInHours < 1) return 'Just now'
    if (diffInHours < 24) return `${diffInHours}h ago`
    const days = Math.floor(diffInHours / 24)
    if (days < 7) return `${days}d ago`
    return time.toLocaleDateString()
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-background border-b border-border px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)}>
            <ArrowLeft className="h-6 w-6 text-text-secondary hover:text-text-primary transition-colors" />
          </button>
          <h1 className="text-xl font-semibold text-text-primary">Activity Log</h1>
        </div>
        <Logo />
      </header>

      <div className="px-6 py-6 max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Your Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center gap-4 p-4 bg-muted rounded-lg animate-pulse">
                    <div className="w-8 h-8 bg-gray-300 rounded-lg"></div>
                    <div className="flex-1">
                      <div className="h-4 bg-gray-300 rounded mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/3"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : activities.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-semibold text-text-primary mb-2">No activity yet</h3>
                <p className="text-text-secondary text-sm">Your recent actions will appear here</p>
              </div>
            ) : (
              <div className="space-y-4">
                {activities.map((activity) => (
                  <div key={`${activity.type}-${activity.id}`} className="flex items-center gap-4 p-4 bg-muted rounded-lg hover:bg-accent transition-colors">
                    <div className={`p-2 rounded-lg ${getActivityColor(activity.type)}`}>
                      {getActivityIcon(activity.type)}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-text-primary font-medium">{activity.description}</p>
                      <p className="text-xs text-text-secondary">{formatTimeAgo(activity.timestamp)}</p>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {activity.type}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default ActivityLog