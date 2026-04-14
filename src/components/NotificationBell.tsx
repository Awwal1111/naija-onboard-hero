import React, { useState, useEffect } from 'react'
import { Bell, MessageCircle, Briefcase, Users, DollarSign, Award, Heart, Star, Wallet, UserPlus, TrendingUp } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/integrations/supabase/client'
import { useNavigate } from 'react-router-dom'
import { useToast } from '@/hooks/use-toast'

interface Notification {
  id: string
  user_id: string
  type: string
  title: string
  message: string
  metadata?: any
  read_at: string | null
  created_at: string
}

const NotificationBell = () => {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { user } = useAuth()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    if (user) {
      loadNotifications()
      setupRealtimeNotifications()
    }
  }, [user])

  const loadNotifications = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20)

      if (error) throw error

      setNotifications(data || [])
      setUnreadCount(data?.filter(n => !n.read_at).length || 0)
    } catch (error) {
      console.error('Error loading notifications:', error)
    }
  }

  const setupRealtimeNotifications = () => {
    if (!user) return

    const channel = supabase
      .channel('notifications-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          const newNotification = payload.new as Notification
          
          setNotifications(prev => [newNotification, ...prev].slice(0, 20))
          setUnreadCount(prev => prev + 1)
          
          // Show toast notification
          toast({
            title: newNotification.title,
            description: newNotification.message
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'message':
      case 'chat':
        return <MessageCircle className="h-4 w-4 text-blue-600" />
      case 'job':
      case 'job_application':
        return <Briefcase className="h-4 w-4 text-green-600" />
      case 'connection':
      case 'connection_request':
        return <UserPlus className="h-4 w-4 text-purple-600" />
      case 'post_reaction':
      case 'post_like':
        return <Heart className="h-4 w-4 text-red-600" />
      case 'post_comment':
        return <MessageCircle className="h-4 w-4 text-blue-600" />
      case 'expert_rating':
        return <Star className="h-4 w-4 text-yellow-600" />
      case 'wallet':
      case 'transaction':
      case 'deposit':
      case 'withdrawal':
        return <Wallet className="h-4 w-4 text-green-600" />
      case 'task_reward':
      case 'referral':
        return <DollarSign className="h-4 w-4 text-yellow-600" />
      case 'safepay':
        return <TrendingUp className="h-4 w-4 text-orange-600" />
      case 'expert':
        return <Award className="h-4 w-4 text-purple-600" />
      default:
        return <Bell className="h-4 w-4 text-gray-600" />
    }
  }

  const getNotificationActionUrl = (notification: Notification) => {
    const { type, metadata } = notification
    
    switch (type) {
      case 'message':
      case 'chat':
        return metadata?.chat_id ? `/chat/${metadata.chat_id}` : '/chat'
      
      case 'connection_request':
        return '/connection-requests'
      
      case 'connection':
        return '/connections'
      
      case 'job':
      case 'job_application':
        return metadata?.job_id ? `/jobs` : '/jobs'
      
      case 'post_reaction':
      case 'post_like':
      case 'post_comment':
        return metadata?.post_id ? `/main-feed` : '/main-feed'
      
      case 'expert_rating':
        return '/profile'
      
      case 'wallet':
      case 'transaction':
      case 'deposit':
      case 'withdrawal':
      case 'task_reward':
        return '/earn'
      
      case 'safepay':
        return '/earn'
      
      case 'referral':
        return '/referrals'
      
      case 'expert':
        return metadata?.application_id ? '/expert-application' : '/experts'
      
      default:
        return '/main-feed'
    }
  }

  const handleNotificationClick = async (notification: Notification) => {
    // Mark as read
    if (!notification.read_at) {
      const { error } = await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('id', notification.id)

      if (!error) {
        setNotifications(prev => prev.map(n => 
          n.id === notification.id ? { ...n, read_at: new Date().toISOString() } : n
        ))
        setUnreadCount(prev => Math.max(0, prev - 1))
      }
    }
    
    // Navigate to action URL
    const actionUrl = getNotificationActionUrl(notification)
    try {
      navigate(actionUrl)
      setIsOpen(false)
    } catch (error) {
      console.error('Navigation error:', error)
      setIsOpen(false)
    }
  }

  const markAllAsRead = async () => {
    if (!user) return

    const { error } = await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .is('read_at', null)

    if (!error) {
      setNotifications(prev => prev.map(n => ({ ...n, read_at: new Date().toISOString() })))
      setUnreadCount(0)
    }
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
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <Button variant="ghost" size="sm" onClick={markAllAsRead}>
                    Mark all read
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={() => { navigate('/notifications'); setIsOpen(false) }}>
                  View All
                </Button>
              </div>
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
                      !notification.read_at ? 'bg-primary/5' : ''
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
                          {!notification.read_at && (
                            <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0 mt-1"></div>
                          )}
                        </div>
                        <p className="text-xs text-text-secondary mt-1 leading-relaxed">
                          {notification.message}
                        </p>
                        <p className="text-xs text-muted-foreground mt-2">
                          {formatTimeAgo(notification.created_at)}
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
