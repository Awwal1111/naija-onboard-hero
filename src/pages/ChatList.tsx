import React, { useState, useEffect } from 'react'
import { Search, MessageCircle, Home, Users, DollarSign, Briefcase, Menu } from 'lucide-react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/integrations/supabase/client'
import { BrandInput } from '@/components/ui/brand-input'
import { useToast } from '@/hooks/use-toast'
import { MoreMenuDrawer } from '@/components/MoreMenuDrawer'
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
}

const ChatList = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()
  const { toast } = useToast()
  const [chats, setChats] = useState<ChatWithProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [moreMenuOpen, setMoreMenuOpen] = useState(false)
  const [profilePreview, setProfilePreview] = useState<{ isOpen: boolean; userId: string | null }>({ isOpen: false, userId: null })

  const bottomNavItems = [
    { icon: Home, label: 'Feed', path: '/feed' },
    { icon: MessageCircle, label: 'Chat', path: '/chat' },
    { icon: Users, label: 'Expert', path: '/experts' },
    { icon: Briefcase, label: 'Gig', path: '/jobs' },
    { icon: DollarSign, label: 'Earn', path: '/earn' }
  ]

  const handleNavigation = (path: string) => {
    navigate(path)
  }

  useEffect(() => {
    if (user) {
      fetchChats()
    }
  }, [user])

  const fetchChats = async () => {
    if (!user) return

    try {
      // Fetch all chats for the current user
      const { data: chatsData, error: chatsError } = await supabase
        .from('chats')
        .select('*')
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
        .order('updated_at', { ascending: false })

      if (chatsError) throw chatsError

      if (!chatsData || chatsData.length === 0) {
        setChats([])
        setLoading(false)
        return
      }

      // Get all user IDs to fetch profiles
      const userIds = chatsData.map(chat => 
        chat.user1_id === user.id ? chat.user2_id : chat.user1_id
      )

      // Fetch profiles for other users
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, full_name, profession, profile_picture_url')
        .in('user_id', userIds)

      if (profilesError) throw profilesError

      // Get last messages for each chat
      const { data: lastMessages, error: messagesError } = await supabase
        .from('messages')
        .select('chat_id, content, created_at, sender_id')
        .in('chat_id', chatsData.map(chat => chat.id))
        .order('created_at', { ascending: false })

      if (messagesError) throw messagesError

      // Combine data
      const chatsWithProfiles: ChatWithProfile[] = chatsData.map(chat => {
        const otherUserId = chat.user1_id === user.id ? chat.user2_id : chat.user1_id
        const otherUser = profiles?.find(p => p.user_id === otherUserId)
        const lastMessage = lastMessages?.find(m => m.chat_id === chat.id)

        return {
          ...chat,
          otherUser: otherUser || {
            user_id: otherUserId,
            full_name: 'Unknown User',
            profession: '',
            profile_picture_url: ''
          },
          lastMessage
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
  }

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

        {/* AI Assistant - Special Chat Option */}
        <div
          onClick={() => navigate('/chat/ai')}
          className="bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 rounded-xl p-4 cursor-pointer hover:shadow-md transition-all flex items-center gap-4 mb-6"
        >
          <div className="w-14 h-14 bg-gradient-to-br from-primary to-primary/60 rounded-full flex items-center justify-center">
            <MessageCircle className="h-7 w-7 text-primary-foreground" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-foreground">AI Assistant</h3>
            <p className="text-sm text-muted-foreground">Chat & Generate Images • Powered by Gemini</p>
          </div>
          <div className="bg-primary/20 text-primary text-xs font-medium px-2 py-1 rounded-full">
            NEW
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
                className="bg-card border border-border rounded-2xl p-4 hover:shadow-md transition-all duration-200 cursor-pointer active:scale-[0.98]"
              >
                <div className="flex items-center gap-4">
                  {/* Profile Picture */}
                  <div 
                    className="shrink-0 cursor-pointer"
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
                  </div>
                  
                  {/* Chat Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-semibold text-text-primary truncate">
                        {chat.otherUser.full_name}
                      </h3>
                      {chat.lastMessage && (
                        <span className="text-xs text-text-secondary ml-2">
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
                      <p className="text-sm text-text-secondary truncate">
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

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t border-border px-1 sm:px-4 py-1.5 sm:py-2 safe-area-bottom z-50">
        <div className="flex justify-around items-center max-w-md mx-auto">
          {bottomNavItems.map((item) => (
            <button
              key={item.label}
              onClick={() => handleNavigation(item.path)}
              className={`flex flex-col items-center gap-0.5 sm:gap-1 py-1.5 sm:py-2 px-2 sm:px-3 rounded-xl transition-colors ${
                location.pathname === item.path
                  ? 'text-primary bg-primary/10'
                  : 'text-text-secondary hover:text-primary hover:bg-primary/5'
              }`}
            >
              <item.icon className="h-5 w-5 sm:h-6 sm:w-6" />
              <span className="text-[10px] sm:text-xs font-medium">{item.label}</span>
            </button>
          ))}
          <button
            onClick={() => setMoreMenuOpen(true)}
            className="flex flex-col items-center gap-0.5 sm:gap-1 py-1.5 sm:py-2 px-2 sm:px-3 rounded-xl transition-colors text-text-secondary hover:text-primary hover:bg-primary/5"
          >
            <Menu className="h-5 w-5 sm:h-6 sm:w-6" />
            <span className="text-[10px] sm:text-xs font-medium">More</span>
          </button>
        </div>
      </div>
      <MoreMenuDrawer open={moreMenuOpen} onOpenChange={setMoreMenuOpen} />
      
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