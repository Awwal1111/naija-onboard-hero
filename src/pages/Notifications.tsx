import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Bell, Check, CheckCheck, Trash2, MessageCircle, Users, Briefcase, Wallet, Star, Heart, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { formatDistanceToNow } from 'date-fns'

interface Notification {
  id: string
  type: string
  title: string
  message: string
  read_at: string | null
  created_at: string
  metadata?: any
}

const Notifications = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { toast } = useToast()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('all')

  useEffect(() => {
    if (user) {
      fetchNotifications()
      
      // Subscribe to real-time notifications
      const channel = supabase
        .channel('notifications-realtime')
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        }, (payload) => {
          setNotifications(prev => [payload.new as Notification, ...prev])
        })
        .subscribe()

      return () => {
        supabase.removeChannel(channel)
      }
    }
  }, [user])

  const fetchNotifications = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user?.id)
      .order('created_at', { ascending: false })
      .limit(100)

    if (!error && data) {
      setNotifications(data)
    }
    setLoading(false)
  }

  const markAsRead = async (id: string) => {
    const now = new Date().toISOString()
    await supabase
      .from('notifications')
      .update({ read_at: now })
      .eq('id', id)

    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, read_at: now } : n)
    )
  }

  const markAllAsRead = async () => {
    const now = new Date().toISOString()
    await supabase
      .from('notifications')
      .update({ read_at: now })
      .eq('user_id', user?.id)
      .is('read_at', null)

    setNotifications(prev => prev.map(n => ({ ...n, read_at: now })))
    toast({ title: "All notifications marked as read" })
  }

  const deleteNotification = async (id: string) => {
    await supabase
      .from('notifications')
      .delete()
      .eq('id', id)

    setNotifications(prev => prev.filter(n => n.id !== id))
  }

  const clearAll = async () => {
    await supabase
      .from('notifications')
      .delete()
      .eq('user_id', user?.id)

    setNotifications([])
    toast({ title: "All notifications cleared" })
  }

  const getIcon = (type: string) => {
    switch (type) {
      case 'message': return <MessageCircle className="h-5 w-5 text-blue-500" />
      case 'connection': case 'connection_request': return <Users className="h-5 w-5 text-green-500" />
      case 'job': case 'job_application': return <Briefcase className="h-5 w-5 text-purple-500" />
      case 'transaction': case 'wallet': return <Wallet className="h-5 w-5 text-emerald-500" />
      case 'expert_rating': case 'rating': return <Star className="h-5 w-5 text-yellow-500" />
      case 'post_comment': case 'post_reaction': case 'post_like': return <Heart className="h-5 w-5 text-red-500" />
      case 'expert_class': case 'class': return <Calendar className="h-5 w-5 text-indigo-500" />
      default: return <Bell className="h-5 w-5 text-muted-foreground" />
    }
  }

  const handleNotificationClick = (notification: Notification) => {
    markAsRead(notification.id)
    
    // Navigate based on type
    const meta = notification.metadata || {}
    switch (notification.type) {
      case 'message':
        if (meta.chat_id) navigate(`/chat/${meta.sender_id || ''}`)
        break
      case 'connection_request':
      case 'connection':
        navigate('/connections')
        break
      case 'job_application':
        if (meta.job_id) navigate(`/jobs/${meta.job_id}`)
        break
      case 'transaction':
      case 'wallet':
        navigate('/profile')
        break
      case 'post_comment':
      case 'post_reaction':
      case 'post_like':
        navigate('/feed')
        break
      case 'expert_class':
        if (meta.class_id) navigate(`/expert-class/room/${meta.class_id}`)
        else navigate('/expert-class')
        break
      case 'expert_rating':
        navigate('/profile')
        break
      default:
        break
    }
  }

  const filteredNotifications = notifications.filter(n => {
    if (activeTab === 'all') return true
    if (activeTab === 'unread') return !n.read_at
    if (activeTab === 'messages') return n.type === 'message'
    if (activeTab === 'transactions') return ['transaction', 'wallet'].includes(n.type)
    return true
  })

  const unreadCount = notifications.filter(n => !n.read_at).length

  if (loading) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <header className="bg-background border-b px-4 py-3 flex items-center gap-4 sticky top-0 z-10">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-bold">Notifications</h1>
        </header>
        <div className="p-4 space-y-3">
          {[1, 2, 3, 4, 5].map(i => (
            <Skeleton key={i} className="h-20 w-full rounded-lg" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="bg-background border-b px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold">Notifications</h1>
            {unreadCount > 0 && (
              <Badge variant="destructive" className="h-5 min-w-5 px-1.5">
                {unreadCount}
              </Badge>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" onClick={markAllAsRead}>
              <CheckCheck className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">Mark all read</span>
            </Button>
          )}
          {notifications.length > 0 && (
            <Button variant="ghost" size="sm" onClick={clearAll} className="text-destructive">
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </header>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="px-4 pt-2 border-b sticky top-[57px] bg-background z-10">
          <TabsList className="w-full justify-start h-10 bg-transparent p-0 gap-4">
            <TabsTrigger value="all" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none pb-2.5 px-0 bg-transparent">
              All
            </TabsTrigger>
            <TabsTrigger value="unread" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none pb-2.5 px-0 bg-transparent">
              Unread
            </TabsTrigger>
            <TabsTrigger value="messages" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none pb-2.5 px-0 bg-transparent">
              Messages
            </TabsTrigger>
            <TabsTrigger value="transactions" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none pb-2.5 px-0 bg-transparent">
              Wallet
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value={activeTab} className="mt-0 px-4 py-3">
          {filteredNotifications.length === 0 ? (
            <div className="text-center py-16">
              <Bell className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Notifications</h3>
              <p className="text-muted-foreground text-sm">
                {activeTab === 'unread' ? "You're all caught up!" : "You don't have any notifications yet"}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredNotifications.map(notification => (
                <Card 
                  key={notification.id} 
                  className={`cursor-pointer transition-all hover:shadow-md ${!notification.read_at ? 'bg-primary/5 border-primary/20' : ''}`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <CardContent className="p-3 flex items-start gap-3">
                    <div className={`p-2 rounded-full ${!notification.read_at ? 'bg-primary/10' : 'bg-muted'}`}>
                      {getIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className={`text-sm font-medium line-clamp-1 ${!notification.read_at ? 'text-foreground' : 'text-muted-foreground'}`}>
                          {notification.title}
                        </h4>
                        {!notification.read_at && (
                          <span className="h-2 w-2 bg-primary rounded-full shrink-0 mt-1.5" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                        {notification.message}
                      </p>
                      <span className="text-xs text-muted-foreground mt-1 block">
                        {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                      </span>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 shrink-0 opacity-0 group-hover:opacity-100"
                      onClick={(e) => {
                        e.stopPropagation()
                        deleteNotification(notification.id)
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default Notifications
