import { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/use-toast'

interface Message {
  id: string
  chat_id: string
  sender_id: string
  content: string
  created_at: string
  read_at: string | null
}

interface Chat {
  id: string
  user1_id: string
  user2_id: string
  created_at: string
  updated_at: string
}

interface Profile {
  user_id: string
  full_name: string
  profession: string
}

export const useChat = (otherUserId: string) => {
  const { user } = useAuth()
  const { toast } = useToast()
  const [messages, setMessages] = useState<Message[]>([])
  const [chat, setChat] = useState<Chat | null>(null)
  const [otherUser, setOtherUser] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user || !otherUserId) return

    const initializeChat = async () => {
      try {
        // Fetch other user's profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('user_id, full_name, profession')
          .eq('user_id', otherUserId)
          .single()

        if (profile) {
          setOtherUser(profile)
        }

        // Find or create chat
        const { data: existingChat } = await supabase
          .from('chats')
          .select('*')
          .or(`and(user1_id.eq.${user.id},user2_id.eq.${otherUserId}),and(user1_id.eq.${otherUserId},user2_id.eq.${user.id})`)
          .single()

        if (existingChat) {
          setChat(existingChat)
          await fetchMessages(existingChat.id)
        } else {
          // Create new chat
          const { data: newChat, error } = await supabase
            .from('chats')
            .insert({
              user1_id: user.id,
              user2_id: otherUserId
            })
            .select()
            .single()

          if (error) throw error

          setChat(newChat)
          setMessages([])
        }
      } catch (error) {
        console.error('Error initializing chat:', error)
        toast({
          title: "Error",
          description: "Failed to load chat",
          variant: "destructive"
        })
      } finally {
        setLoading(false)
      }
    }

    initializeChat()
  }, [user, otherUserId, toast])

  const fetchMessages = async (chatId: string) => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('chat_id', chatId)
        .order('created_at', { ascending: true })

      if (error) throw error

      setMessages(data || [])
    } catch (error) {
      console.error('Error fetching messages:', error)
    }
  }

  useEffect(() => {
    if (!chat) return

    // Subscribe to new messages with a unique channel name
    const channel = supabase
      .channel(`messages-${chat.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `chat_id=eq.${chat.id}`
        },
        (payload) => {
          console.log('New message received:', payload)
          const newMessage = payload.new as Message
          setMessages(prev => {
            // Avoid duplicates
            if (prev.some(msg => msg.id === newMessage.id)) {
              return prev
            }
            return [...prev, newMessage]
          })
        }
      )
      .subscribe((status) => {
        console.log('Realtime subscription status:', status)
      })

    return () => {
      console.log('Unsubscribing from messages channel')
      supabase.removeChannel(channel)
    }
  }, [chat])

  const sendMessage = async (content: string) => {
    if (!chat || !user) return

    try {
      const { error } = await supabase
        .from('messages')
        .insert({
          chat_id: chat.id,
          sender_id: user.id,
          content
        })

      if (error) throw error
    } catch (error) {
      console.error('Error sending message:', error)
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive"
      })
    }
  }

  return {
    messages,
    chat,
    otherUser,
    loading,
    sendMessage
  }
}