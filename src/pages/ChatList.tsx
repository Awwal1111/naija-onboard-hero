import React, { useState, useEffect, useCallback } from 'react'
import { Search, MessageCircle } from 'lucide-react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/integrations/supabase/client'
import { BrandInput } from '@/components/ui/brand-input'
import { useToast } from '@/hooks/use-toast'
import { BottomNavBar } from '@/components/BottomNavBar'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import ProfilePreview from '@/components/ProfilePreview'

interface ChatWithProfile {
  id: string
  user1_id: string
  user2_id: string
  updated_at: string
  otherUser: {
    user_id: string
    full_name: string
    profession: string
    profile_picture_url: string
  }
  lastMessage?: {
    content: string
    created_at: string
    sender_id: string
  }
  unread_count: number
}

const ChatList = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()
  const { toast } = useToast()
  const [chats, setChats] = useState<ChatWithProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [profilePreview, setProfilePreview] = useState<{ isOpen: boolean; userId: string | null }>({ isOpen: false, userId: null })

  const fetchChats = useCallback(async () => {
    if (!user) return

    try {
      // Fetch the user's most recent 50 chats
      const { data: chatsData, error: chatsError } = await supabase
        .from('chats')
        .select('id, user1_id, user2_id, created_at, updated_at')
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
        .order('updated_at', { ascending: false })
        .limit(50)

      if (chatsError) throw chatsError

      if (!chatsData || chatsData.length === 0) {
        setChats([])
        setLoading(false)
        return
      }

      const chatIds = chatsData.map(c => c.id)
      const userIds = chatsData.map(chat =>
        chat.user1_id === user.id ? chat.user2_id : chat.user1_id
      )

      // Parallel: profiles + last messages + unread (single grouped query)
      const [profilesRes, lastMessagesRes, unreadRes] = await Promise.all([
        supabase
          .from('profiles')
          .select('user_id, full_name, profession, profile_picture_url')
          .in('user_id', userIds)
          .limit(50),
        // Fetch a bounded slice of recent messages and dedupe per chat client-side
        supabase
          .from('messages')
          .select('chat_id, content, created_at, sender_id')
          .in('chat_id', chatIds)
          .order('created_at', { ascending: false })
          .limit(200),
        // Single query for unread messages (group client-side)
        supabase
          .from('messages')
          .select('chat_id, sender_id')
          .in('chat_id', chatIds)
          .neq('sender_id', user.id)
          .is('read_at', null)
          .limit(500),
      ])

      const profiles = profilesRes.data || []
      const allMessages = lastMessagesRes.data || []
      const unreadRows = unreadRes.data || []

      // First occurrence per chat is the latest (ordered desc)
      const lastMessageMap = new Map<string, { content: string; created_at: string; sender_id: string }>()
      for (const m of allMessages) {
        if (!lastMessageMap.has(m.chat_id)) {
          lastMessageMap.set(m.chat_id, { content: m.content, created_at: m.created_at, sender_id: m.sender_id })
        }
      }

      const unreadCountMap = new Map<string, number>()
      for (const m of unreadRows) {
        unreadCountMap.set(m.chat_id, (unreadCountMap.get(m.chat_id) || 0) + 1)
      }

      const chatsWithProfiles: ChatWithProfile[] = chatsData.map((chat) => {
        const otherUserId = chat.user1_id === user.id ? chat.user2_id : chat.user1_id
        const otherUser = profiles.find(p => p.user_id === otherUserId)
        return {
          ...chat,
          otherUser: otherUser || {
            user_id: otherUserId,
            full_name: 'Unknown User',
            profession: '',
            profile_picture_url: ''
          },
          lastMessage: lastMessageMap.get(chat.id),
          unread_count: unreadCountMap.get(chat.id) || 0,
        }
      })

      setChats(chatsWithProfiles)
    } catch (error) {
      console.error('Error fetching chats:', error)
      toast({
        title: "Error",
        description: "Failed to load conversations",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }, [user, toast])

  // Initial fetch
  useEffect(() => {
    if (user) {
      fetchChats()
    }
  }, [user, fetchChats])

  // Realtime: debounced refetch, scoped to the user's own chats only
  useEffect(() => {
    if (!user) return

    let debounceTimer: ReturnType<typeof setTimeout> | null = null
    const scheduleRefetch = () => {
      if (debounceTimer) clearTimeout(debounceTimer)
      debounceTimer = setTimeout(() => {
        fetchChats()
      }, 1500)
    }

    const knownChatIds = new Set(chats.map(c => c.id))

    const channel = supabase
      .channel('chatlist-messages-updates')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          const chatId = (payload.new as any)?.chat_id
          if (chatId && knownChatIds.has(chatId)) scheduleRefetch()
          else if (!knownChatIds.size) scheduleRefetch() // first-ever message
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'messages' },
        (payload) => {
          const chatId = (payload.new as any)?.chat_id
          if (chatId && knownChatIds.has(chatId) && (payload.new as any).read_at) {
            scheduleRefetch()
          }
        }
      )
      .subscribe()

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer)
      supabase.removeChannel(channel)
    }
  }, [user, fetchChats, chats])


  const filteredChats = chats.filter(chat =>
    chat.otherUser.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    chat.otherUser.profession?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const formatTimeAgo = (date: string) => {
    const now = new Date()
    const messageTime = new Date(date)
    const diffInHours = Math.floor((now.getTime() - messageTime.getTime()) / (1000 * 60 * 60))
    
    if (diffInHours < 1) return 'Just now'
    if (diffInHours < 24) return `${diffInHours}h ago`
    const days = Math.floor(diffInHours / 24)
    if (days < 7) return `${days}d ago`
    return messageTime.toLocaleDateString()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center pb-20">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-text-secondary">Loading conversations...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="bg-background border-b border-border px-6 py-4 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-primary">Messages</h1>
          <div className="text-sm text-text-secondary">{filteredChats.length} chats</div>
        </div>
      </header>

      <div className="px-6 py-4">
        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-text-secondary" />
            <BrandInput
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* NaijaLancers Copilot - AI Assistant */}
        <div
          onClick={() => navigate('/chat/copilot')}
          className="bg-gradient-to-r from-primary/10 via-purple-500/10 to-pink-500/10 border border-primary/20 rounded-xl p-4 cursor-pointer hover:shadow-lg transition-all flex items-center gap-4 mb-6"
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

        {/* Conversations List */}
        {filteredChats.length === 0 ? (
          <div className="text-center py-12">
            <MessageCircle className="h-16 w-16 text-text-secondary mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-text-primary mb-2">
              {searchQuery ? 'No matching conversations' : 'No conversations yet'}
            </h3>
            <p className="text-text-secondary">
              {searchQuery 
                ? 'Try a different search term'
                : 'Start chatting with experts or job posters to see conversations here'
              }
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredChats.map((chat) => (
              <div
                key={chat.id}
                onClick={() => navigate(`/chat/${chat.otherUser.user_id}`)}
                className={`bg-card border rounded-2xl p-4 hover:shadow-md transition-all duration-200 cursor-pointer active:scale-[0.98] ${
                  chat.unread_count > 0 ? 'border-primary/30 bg-primary/5' : 'border-border'
                }`}
              >
                <div className="flex items-center gap-4">
                  {/* Profile Picture with Unread Badge */}
                  <div 
                    className="shrink-0 cursor-pointer relative"
                    onClick={(e) => {
                      e.stopPropagation()
                      setProfilePreview({ isOpen: true, userId: chat.otherUser.user_id })
                    }}
                  >
                    <Avatar className="w-12 h-12">
                      <AvatarImage 
                        src={chat.otherUser.profile_picture_url} 
                        alt={chat.otherUser.full_name}
                      />
                      <AvatarFallback className="bg-primary text-primary-foreground font-bold">
                        {chat.otherUser.full_name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    {chat.unread_count > 0 && (
                      <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-primary-foreground text-xs font-bold rounded-full flex items-center justify-center">
                        {chat.unread_count > 9 ? '9+' : chat.unread_count}
                      </span>
                    )}
                  </div>
                  
                  {/* Chat Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className={`truncate ${
                        chat.unread_count > 0 ? 'font-bold text-foreground' : 'font-semibold text-text-primary'
                      }`}>
                        {chat.otherUser.full_name}
                      </h3>
                      {chat.lastMessage && (
                        <span className={`text-xs ml-2 ${
                          chat.unread_count > 0 ? 'text-primary font-medium' : 'text-text-secondary'
                        }`}>
                          {formatTimeAgo(chat.lastMessage.created_at)}
                        </span>
                      )}
                    </div>
                    
                    {chat.otherUser.profession && (
                      <p className="text-sm text-primary mb-1">
                        {chat.otherUser.profession}
                      </p>
                    )}
                    
                    {chat.lastMessage ? (
                      <p className={`text-sm truncate ${
                        chat.unread_count > 0 ? 'text-foreground font-medium' : 'text-text-secondary'
                      }`}>
                        {chat.lastMessage.sender_id === user?.id ? 'You: ' : ''}
                        {chat.lastMessage.content}
                      </p>
                    ) : (
                      <p className="text-sm text-text-secondary italic">
                        No messages yet
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <BottomNavBar />
      
      {/* Profile Preview */}
      <ProfilePreview
        profileId={profilePreview.userId || ''}
        isOpen={profilePreview.isOpen}
        onClose={() => setProfilePreview({ isOpen: false, userId: null })}
      />
    </div>
  )
}

export default ChatList