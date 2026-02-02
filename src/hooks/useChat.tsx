import { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/use-toast'

interface ChatContext {
  context?: 'story' | 'gig' | 'expert' | 'job' | 'post' | 'profile'
  context_label?: string
  story_id?: string
  story_content?: string
  gig_id?: string
  gig_title?: string
  expert_id?: string
  job_id?: string
  job_title?: string
  post_id?: string
}

interface BaseMessage {
  id: string
  chat_id: string
  sender_id: string
  content: string
  created_at: string
  read_at: string | null
  reply_to_id?: string | null
  reply_to_content?: string | null
  reply_to_sender?: string | null
  payload?: ChatContext | null
}

interface Message extends BaseMessage {
  media_url?: string | null
  media_type?: string | null
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
  profile_picture_url?: string
  phone_number?: string | null
  whatsapp_number?: string | null
  google_meet_link?: string | null
  facebook_url?: string | null
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
        console.log('Initializing chat for user:', user.id, 'with:', otherUserId)
        
        // Validate otherUserId is a proper UUID
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
        if (!uuidRegex.test(otherUserId)) {
          console.error('Invalid UUID format for otherUserId:', otherUserId)
          throw new Error('Invalid user ID format')
        }
        
        // Fetch other user's profile with contact fields
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('user_id, full_name, profession, profile_picture_url, phone_number, whatsapp_number, google_meet_link, facebook_url')
          .eq('user_id', otherUserId)
          .maybeSingle()

        if (profileError) {
          console.error('Profile fetch error:', profileError)
          throw profileError
        }

        if (!profile) {
          throw new Error('User profile not found')
        }

        if (profile) {
          setOtherUser(profile)
          console.log('Other user profile loaded:', profile)
        }

        // Find or create chat
        const { data: existingChat, error: chatError } = await supabase
          .from('chats')
          .select('*')
          .or(`and(user1_id.eq.${user.id},user2_id.eq.${otherUserId}),and(user1_id.eq.${otherUserId},user2_id.eq.${user.id})`)
          .maybeSingle()

        if (chatError) {
          console.error('Chat fetch error:', chatError)
          throw chatError
        }

        if (existingChat) {
          console.log('Found existing chat:', existingChat.id)
          setChat(existingChat)
          await fetchMessages(existingChat.id)
        } else {
          console.log('Creating new chat')
          // Create new chat
          const { data: newChat, error } = await supabase
            .from('chats')
            .insert({
              user1_id: user.id,
              user2_id: otherUserId
            })
            .select()
            .single()

          if (error) {
            console.error('Chat creation error:', error)
            throw error
          }

          console.log('New chat created:', newChat.id)
          setChat(newChat)
          setMessages([])
        }
      } catch (error) {
        console.error('Error initializing chat:', error)
        toast({
          title: "Error",
          description: error.message || "Failed to load chat",
          variant: "destructive"
        })
      } finally {
        setLoading(false)
      }
    }

    setLoading(true)
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
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `chat_id=eq.${chat.id}`
        },
        (payload) => {
          // Handle read receipt updates
          const updatedMessage = payload.new as Message
          setMessages(prev => 
            prev.map(msg => 
              msg.id === updatedMessage.id 
                ? { ...msg, read_at: updatedMessage.read_at }
                : msg
            )
          )
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

  const sendMessage = async (
    content: string, 
    mediaUrl?: string | null, 
    mediaType?: string | null,
    replyToId?: string | null,
    chatContext?: ChatContext | null
  ) => {
    if (!chat || !user) {
      toast({
        title: "Error",
        description: "Chat not initialized",
        variant: "destructive"
      })
      return
    }

    try {
      // If replying, get the original message details
      let replyToContent = null
      let replyToSender = null
      
      if (replyToId) {
        const { data: replyMsg } = await supabase
          .from('messages')
          .select('content, sender_id')
          .eq('id', replyToId)
          .single()
        
        if (replyMsg) {
          replyToContent = replyMsg.content
          replyToSender = replyMsg.sender_id
        }
      }

      // Build message data - cast to any to bypass TypeScript schema cache issue
      // The database HAS the payload column but generated types are out of sync
      const messageData: Record<string, unknown> = {
        chat_id: chat.id,
        sender_id: user.id,
        content,
        media_url: mediaUrl || null,
        media_type: mediaType || null,
        reply_to_id: replyToId || null,
        reply_to_content: replyToContent,
        reply_to_sender: replyToSender
      }
      
      // Only add payload if context is provided (avoids schema cache issues)
      if (chatContext) {
        messageData.payload = chatContext
      }

      const { data: insertedMessage, error } = await supabase
        .from('messages')
        .insert(messageData as any)
        .select()
        .single()

      if (error) {
        console.error('Message insert error:', error)
        throw error
      }

      // Determine recipient (the other user in the chat)
      const recipientId = chat.user1_id === user.id ? chat.user2_id : chat.user1_id

      // Send Telegram notification to recipient in background (don't await)
      supabase.functions.invoke('notify-message-received', {
        body: {
          message_id: insertedMessage.id,
          sender_id: user.id,
          recipient_id: recipientId,
          content,
          media_type: mediaType
        }
      }).catch(err => {
        console.error('Failed to send message notification:', err)
        // Don't throw - this is non-critical
      })
    } catch (error: any) {
      console.error('Error sending message:', error)
      toast({
        title: "Failed to send message",
        description: error?.message || "Please try again",
        variant: "destructive"
      })
      throw error
    }
  }

  const markMessagesAsRead = async () => {
    if (!chat || !user) return

    try {
      const unreadMessages = messages.filter(
        msg => msg.sender_id !== user.id && !msg.read_at
      )

      if (unreadMessages.length === 0) return

      const messageIds = unreadMessages.map(msg => msg.id)
      const now = new Date().toISOString()

      // Update in database
      const { error } = await supabase
        .from('messages')
        .update({ read_at: now })
        .in('id', messageIds)

      if (error) {
        console.error('Error marking messages as read:', error)
        return
      }

      // Immediately update local state to reflect the change
      setMessages(prev => 
        prev.map(msg => 
          messageIds.includes(msg.id) 
            ? { ...msg, read_at: now }
            : msg
        )
      )
    } catch (error) {
      console.error('Error marking messages as read:', error)
    }
  }

  // Mark messages as read when viewing chat
  useEffect(() => {
    if (messages.length > 0 && chat && user) {
      markMessagesAsRead()
    }
  }, [messages.length, chat?.id, user?.id])

  return {
    messages,
    chat,
    otherUser,
    loading,
    sendMessage,
    markMessagesAsRead
  }
}