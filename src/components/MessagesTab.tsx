import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { MessageCircle, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { useNavigate } from 'react-router-dom'

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
}

const MessagesTab: React.FC = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [chats, setChats] = useState<ChatPreview[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    if (user) {
      fetchChats()
    }
  }, [user])

  const fetchChats = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('chats')
        .select(`
          id,
          user1_id,
          user2_id,
          updated_at
        `)
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
        .order('updated_at', { ascending: false })

      if (error) throw error

      // Fetch profiles for other users
      const chatsWithProfiles = await Promise.all(
        (data || []).map(async (chat) => {
          const otherUserId = chat.user1_id === user.id ? chat.user2_id : chat.user1_id
          
          const { data: profile } = await supabase
            .from('profiles')
            .select('user_id, full_name, profile_picture_url')
            .eq('user_id', otherUserId)
            .single()

          // Get last message
          const { data: lastMessage } = await supabase
            .from('messages')
            .select('content')
            .eq('chat_id', chat.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single()

          return {
            ...chat,
            other_user: profile || { user_id: otherUserId, full_name: 'Unknown User' },
            last_message: lastMessage?.content
          }
        })
      )

      setChats(chatsWithProfiles)
    } catch (error) {
      console.error('Error fetching chats:', error)
    } finally {
      setLoading(false)
    }
  }

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
            <Card key={chat.id} className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent 
                className="p-4"
                onClick={() => navigate(`/chat/${chat.other_user.user_id}`)}
              >
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={chat.other_user.profile_picture_url} />
                    <AvatarFallback>
                      {chat.other_user.full_name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-text-primary truncate">
                        {chat.other_user.full_name}
                      </h4>
                      <span className="text-xs text-muted-foreground">
                        {formatTime(chat.updated_at)}
                      </span>
                    </div>
                    
                    {chat.last_message && (
                      <p className="text-sm text-text-secondary truncate mt-1">
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