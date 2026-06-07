import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { MessageCircle, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { useUserPresence } from '@/hooks/useUserPresence'
import { useNavigate, useLocation } from 'react-router-dom'
import IntroRequestsList from './IntroRequestsList'

interface ChatPreview {
  id: string
  user1_id: string
  user2_id: string
  updated_at: string
  other_user: {
    user_id: string
    full_name: string
    profile_picture_url?: string
  }
  last_message?: string
  unread_count: number
}

const MessagesTab: React.FC = () => {
  const { user } = useAuth()
  const { isUserOnline } = useUserPresence()
  const navigate = useNavigate()
  const location = useLocation()
  const [chats, setChats] = useState<ChatPreview[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  const fetchChats = useCallback(async () => {
    if (!user) return

    try {
      const { data: chatRows, error } = await supabase
        .from('chats')
        .select('id, user1_id, user2_id, updated_at')
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
        .order('updated_at', { ascending: false })
        .limit(100)

      if (error) throw error
      if (!chatRows || chatRows.length === 0) {
        setChats([])
        return
      }

      const chatIds = chatRows.map((c) => c.id)
      const otherUserIds = Array.from(new Set(
        chatRows.map((c) => (c.user1_id === user.id ? c.user2_id : c.user1_id))
      ))

      // Batch: profiles, recent messages, unread messages — 3 queries instead of 3*N
      const [profilesRes, messagesRes, unreadRes] = await Promise.all([
        supabase
          .from('profiles')
          .select('user_id, full_name, profile_picture_url')
          .in('user_id', otherUserIds),
        supabase
          .from('messages')
          .select('chat_id, content, created_at')
          .in('chat_id', chatIds)
          .order('created_at', { ascending: false })
          .limit(chatIds.length * 4),
        supabase
          .from('messages')
          .select('chat_id, sender_id')
          .in('chat_id', chatIds)
          .neq('sender_id', user.id)
          .is('read_at', null)
          .limit(500),
      ])

      const profileMap = new Map<string, any>()
      ;(profilesRes.data || []).forEach((p: any) => profileMap.set(p.user_id, p))

      const lastMessageMap = new Map<string, string>()
      ;(messagesRes.data || []).forEach((m: any) => {
        if (!lastMessageMap.has(m.chat_id)) lastMessageMap.set(m.chat_id, m.content)
      })

      const unreadMap = new Map<string, number>()
      ;(unreadRes.data || []).forEach((m: any) => {
        unreadMap.set(m.chat_id, (unreadMap.get(m.chat_id) || 0) + 1)
      })

      const chatsWithProfiles: ChatPreview[] = chatRows.map((chat) => {
        const otherUserId = chat.user1_id === user.id ? chat.user2_id : chat.user1_id
        const profile = profileMap.get(otherUserId)
        return {
          ...chat,
          other_user: profile || { user_id: otherUserId, full_name: 'Unknown User' },
          last_message: lastMessageMap.get(chat.id),
          unread_count: unreadMap.get(chat.id) || 0,
        }
      })

      const nonEmptyChats = chatsWithProfiles.filter((chat) => chat.last_message)
      setChats(nonEmptyChats)
    } catch (error) {
      console.error('Error fetching chats:', error)
    } finally {
      setLoading(false)
    }
  }, [user])

  // Initial fetch
  useEffect(() => {
    if (user) {
      fetchChats()
    }
  }, [user, fetchChats])

  // Refresh when navigating back to this page (route change)
  useEffect(() => {
    if (user && location.pathname === '/chat') {
      fetchChats()
    }
  }, [location.pathname, user, fetchChats])

  // Refresh on visibility change (when user switches back to tab)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && user) {
        fetchChats()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [user, fetchChats])

  // Real-time subscription for message updates
  useEffect(() => {
    if (!user) return

    let pending = false
    let lastRun = 0
    const throttledFetch = () => {
      const now = Date.now()
      if (now - lastRun < 3000) {
        if (!pending) {
          pending = true
          setTimeout(() => {
            pending = false
            lastRun = Date.now()
            fetchChats()
          }, 3000 - (now - lastRun))
        }
        return
      }
      lastRun = now
      fetchChats()
    }

    const channel = supabase
      .channel(`messages-mine-${user.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          // Client-side filter: only react to messages in this user's chats
          const msg = payload.new as any
          if (!msg) return
          // Best-effort: refetch only if chat exists in current list
          if (chats.some((c) => c.id === msg.chat_id)) throttledFetch()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user, fetchChats, chats])

  const filteredChats = chats.filter(chat => 
    chat.other_user.full_name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-muted rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded w-1/3" />
                  <div className="h-3 bg-muted rounded w-2/3" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* NaijaLancers Copilot - AI Assistant */}
      <div
        onClick={() => navigate('/chat/copilot')}
        className="bg-gradient-to-r from-primary/10 via-purple-500/10 to-pink-500/10 border border-primary/20 rounded-xl p-4 cursor-pointer hover:shadow-lg transition-all flex items-center gap-4"
      >
        <div className="relative">
          <div className="w-14 h-14 bg-gradient-to-br from-primary via-purple-500 to-pink-500 rounded-full flex items-center justify-center">
            <MessageCircle className="h-7 w-7 text-white" />
          </div>
          <span className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 border-2 border-background rounded-full" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-foreground">NaijaLancers Copilot</h3>
          <p className="text-sm text-muted-foreground">Your AI Freelancing Partner • Online</p>
        </div>
        <div className="bg-gradient-to-r from-primary to-purple-500 text-white text-xs font-medium px-2 py-1 rounded-full">
          PRO
        </div>
      </div>

      <IntroRequestsList />

      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search conversations..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {filteredChats.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8">
            <MessageCircle className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-text-primary mb-2">
              No conversations yet
            </h3>
            <p className="text-text-secondary text-center">
              Start connecting with professionals to begin chatting
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filteredChats.map((chat) => (
            <Card 
              key={chat.id} 
              className={`hover:shadow-md transition-shadow cursor-pointer ${
                chat.unread_count > 0 ? 'bg-primary/5 border-primary/20' : ''
              }`}
            >
              <CardContent 
                className="p-4"
                onClick={() => navigate(`/chat/${chat.other_user.user_id}`)}
              >
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={chat.other_user.profile_picture_url} />
                      <AvatarFallback>
                        {chat.other_user.full_name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    {isUserOnline(chat.other_user.user_id) && (
                      <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-background rounded-full" />
                    )}
                    {chat.unread_count > 0 && (
                      <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-primary-foreground text-xs font-bold rounded-full flex items-center justify-center">
                        {chat.unread_count > 9 ? '9+' : chat.unread_count}
                      </span>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className={`font-medium truncate ${
                        chat.unread_count > 0 ? 'text-foreground font-semibold' : 'text-text-primary'
                      }`}>
                        {chat.other_user.full_name}
                      </h4>
                      <span className={`text-xs ${
                        chat.unread_count > 0 ? 'text-primary font-medium' : 'text-muted-foreground'
                      }`}>
                        {formatTime(chat.updated_at)}
                      </span>
                    </div>
                    
                    {chat.last_message && (
                      <p className={`text-sm truncate mt-1 ${
                        chat.unread_count > 0 ? 'text-foreground font-medium' : 'text-text-secondary'
                      }`}>
                        {chat.last_message}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

export default MessagesTab