import React, { useState, useEffect } from 'react'
import { Bell, MessageCircle, Briefcase, Users, DollarSign, Award, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useAuth } from '@/hooks/useAuth'
import { useProfile } from '@/hooks/useProfile'
import { supabase } from '@/integrations/supabase/client'
import { useNavigate } from 'react-router-dom'
import { useToast } from '@/hooks/use-toast'

interface Notification {
  id: string
  type: 'chat' | 'job' | 'referral' | 'task' | 'expert' | 'connection'
  title: string
  message: string
  timestamp: string
  read: boolean
  actionUrl?: string
  metadata?: any
}

const NotificationBell = () => {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { user } = useAuth()
  const { profile } = useProfile()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    if (user) {
      loadNotifications()
      // Set up real-time listener for new notifications
      setupRealtimeNotifications()
    }
  }, [user])

  const loadNotifications = async () => {
    if (!user) return

    try {
      // Generate some sample notifications based on user activity
      const sampleNotifications: Notification[] = []

      // Welcome notification for new users
      if (profile?.created_at) {
        const createdDate = new Date(profile.created_at)
        const now = new Date()
        const daysSinceJoined = Math.floor((now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24))
        
        if (daysSinceJoined === 0) {
          sampleNotifications.push({
            id: 'welcome',
            type: 'expert',
            title: 'Welcome to NaijaLancers! 🎉',
            message: 'Complete your profile to start connecting with clients and experts.',
            timestamp: profile.created_at,
            read: false,
            actionUrl: '/profile'
          })
        }
      }

      // Expert application notification
      if (profile?.is_expert) {
        sampleNotifications.push({
          id: 'expert-approved',
          type: 'expert',
          title: 'Expert Application Approved! ✅',
          message: 'Congratulations! You can now receive job applications and earn from your expertise.',
          timestamp: profile.expert_verified_at || new Date().toISOString(),
          read: false,
          actionUrl: '/expert-application'
        })
      }

      // Check for recent messages
      const { data: recentChats } = await supabase
        .from('messages')
        .select('id, chat_id, created_at, chats!inner(*)')
        .neq('sender_id', user.id)
        .order('created_at', { ascending: false })
        .limit(3)

      if (recentChats) {
        recentChats.forEach(chat => {
          sampleNotifications.push({
            id: `chat-${chat.id}`,
            type: 'chat',
            title: 'New Message 💬',
            message: 'You have a new message waiting for you.',
            timestamp: chat.created_at,
            read: false,
            actionUrl: `/chat/${chat.chat_id}`
          })
        })
      }

      // Check for new job posts (if user has skills matching)
      const { data: recentJobs } = await supabase
        .from('job_posts')
        .select('id, title, created_at')
        .neq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(2)

      if (recentJobs) {
        recentJobs.forEach(job => {
          sampleNotifications.push({
            id: `job-${job.id}`,
            type: 'job',
            title: 'New Job Posted! 💼',
            message: `"${job.title}" - Check if it matches your skills.`,
            timestamp: job.created_at,
            read: false,
            actionUrl: '/jobs'
          })
        })
      }

      // Sort by timestamp
      sampleNotifications.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      
      setNotifications(sampleNotifications.slice(0, 10))
      setUnreadCount(sampleNotifications.filter(n => !n.read).length)
      
    } catch (error) {
      console.error('Error loading notifications:', error)
    }
  }

  const setupRealtimeNotifications = () => {
    if (!user) return

    // Listen for new messages
    const messageChannel = supabase
      .channel('notifications-messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `sender_id.neq.${user.id}`
        },
        (payload) => {
          // Add new message notification
          const newNotification: Notification = {
            id: `chat-${payload.new.id}`,
            type: 'chat',
            title: 'New Message 💬',
            message: 'You have a new message waiting for you.',
            timestamp: payload.new.created_at,
            read: false,
            actionUrl: `/chat/${payload.new.chat_id}`
          }
          
          setNotifications(prev => [newNotification, ...prev].slice(0, 10))
          setUnreadCount(prev => prev + 1)
          
          // Show toast notification
          toast({
            title: "New Message",
            description: "You have received a new message"
          })
        }
      )
      .subscribe()

    // Listen for new job posts
    const jobChannel = supabase
      .channel('notifications-jobs')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'job_posts',
          filter: `user_id.neq.${user.id}`
        },
        (payload) => {
          const newNotification: Notification = {
            id: `job-${payload.new.id}`,
            type: 'job',
            title: 'New Job Posted! 💼',
            message: `"${payload.new.title}" - Check if it matches your skills.`,
            timestamp: payload.new.created_at,
            read: false,
            actionUrl: '/jobs'
          }
          
          setNotifications(prev => [newNotification, ...prev].slice(0, 10))
          setUnreadCount(prev => prev + 1)
        }
      )
      .subscribe()

    // Cleanup function
    return () => {
      supabase.removeChannel(messageChannel)
      supabase.removeChannel(jobChannel)
    }
  }

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'chat':
        return <MessageCircle className="h-4 w-4 text-blue-600" />
      case 'job':
        return <Briefcase className="h-4 w-4 text-green-600" />
      case 'referral':
        return <DollarSign className="h-4 w-4 text-yellow-600" />
      case 'expert':
        return <Award className="h-4 w-4 text-purple-600" />
      case 'connection':
        return <Users className="h-4 w-4 text-orange-600" />
      default:
        return <Bell className="h-4 w-4 text-gray-600" />
    }
  }

  const handleNotificationClick = (notification: Notification) => {
    // Mark as read
    setNotifications(prev => prev.map(n => 
      n.id === notification.id ? { ...n, read: true } : n
    ))
    setUnreadCount(prev => Math.max(0, prev - 1))
    
    // Navigate to action URL if available
    if (notification.actionUrl) {
      try {
        navigate(notification.actionUrl)
        setIsOpen(false)
      } catch (error) {
        console.error('Navigation error:', error)
        // If navigation fails, just close the notification
        setIsOpen(false)
      }
    }
  }

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    setUnreadCount(0)
  }

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date()
    const time = new Date(timestamp)
    const diffInMinutes = Math.floor((now.getTime() - time.getTime()) / (1000 * 60))
    
    if (diffInMinutes < 1) return 'Just now'
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`
    const hours = Math.floor(diffInMinutes / 60)
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    return `${days}d ago`
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs bg-red-500 text-white">
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Notifications</CardTitle>
              {unreadCount > 0 && (
                <Button variant="ghost" size="sm" onClick={markAllAsRead}>
                  Mark all read
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0 max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="text-center py-8 px-4">
                <Bell className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No notifications yet</p>
              </div>
            ) : (
              <div className="space-y-0">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={`p-4 border-b border-border hover:bg-accent cursor-pointer transition-colors ${
                      !notification.read ? 'bg-primary/5' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-1">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-medium text-text-primary leading-tight">
                            {notification.title}
                          </p>
                          {!notification.read && (
                            <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0 mt-1"></div>
                          )}
                        </div>
                        <p className="text-xs text-text-secondary mt-1 leading-relaxed">
                          {notification.message}
                        </p>
                        <p className="text-xs text-muted-foreground mt-2">
                          {formatTimeAgo(notification.timestamp)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </PopoverContent>
    </Popover>
  )
}

export default NotificationBell