import { useEffect, useRef } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/useAuth'

export const usePushNotificationTriggers = () => {
  const { user } = useAuth()
  const userChatsRef = useRef<string[]>([])

  // Fetch user's chats on mount
  useEffect(() => {
    if (!user) return

    const fetchUserChats = async () => {
      const { data: chats } = await supabase
        .from('chats')
        .select('id')
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
      
      if (chats) {
        userChatsRef.current = chats.map(c => c.id)
        console.log('[Push] User chats loaded:', userChatsRef.current.length)
      }
    }

    fetchUserChats()
  }, [user])

  useEffect(() => {
    if (!user) return

    console.log('[Push] Setting up notification triggers for user:', user.id)

    // Helper to send push notification
    const sendPush = async (payload: {
      userId: string
      title: string
      body: string
      icon?: string
      url?: string
      data?: any
    }) => {
      try {
        console.log('[Push] Sending notification:', payload.title)
        const result = await supabase.functions.invoke('send-push-notification', {
          body: payload
        })
        console.log('[Push] Send result:', result.data)
        return result
      } catch (error) {
        console.error('[Push] Failed to send:', error)
      }
    }

    // Listen for new messages - NO FILTER (we check in callback)
    const messagesChannel = supabase
      .channel('new-messages-push')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages'
        },
        async (payload) => {
          const message = payload.new as any
          console.log('[Push] New message detected:', message.id)
          
          // Skip if I sent this message
          if (message.sender_id === user.id) {
            console.log('[Push] Skipping - I sent this message')
            return
          }

          // Check if this message is in one of my chats
          const { data: chat } = await supabase
            .from('chats')
            .select('user1_id, user2_id')
            .eq('id', message.chat_id)
            .single()

          if (!chat) {
            console.log('[Push] Chat not found')
            return
          }

          // Am I part of this chat?
          const isMyChat = chat.user1_id === user.id || chat.user2_id === user.id
          if (!isMyChat) {
            console.log('[Push] Not my chat, skipping')
            return
          }

          console.log('[Push] This is my chat, sending notification')
          
          // Get sender info
          const { data: sender } = await supabase
            .from('profiles')
            .select('full_name, profile_picture_url')
            .eq('user_id', message.sender_id)
            .single()

          await sendPush({
            userId: user.id,
            title: `New message from ${sender?.full_name || 'Someone'}`,
            body: message.content?.substring(0, 100) || 'Sent you a message',
            icon: sender?.profile_picture_url || '/logo.png',
            url: `/chat/${message.sender_id}`,
            data: { type: 'message', messageId: message.id }
          })
        }
      )
      .subscribe((status) => {
        console.log('[Push] Messages channel status:', status)
      })

    // Listen for new connection requests
    const connectionsChannel = supabase
      .channel('new-connections-push')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'connection_requests',
          filter: `requested_id=eq.${user.id}`
        },
        async (payload) => {
          const request = payload.new as any
          console.log('[Push] New connection request:', request.id)
          
          const { data: requester } = await supabase
            .from('profiles')
            .select('full_name, profile_picture_url')
            .eq('user_id', request.requester_id)
            .single()

          await sendPush({
            userId: user.id,
            title: 'New Connection Request',
            body: `${requester?.full_name || 'Someone'} wants to connect with you`,
            icon: requester?.profile_picture_url || '/logo.png',
            url: '/connections/requests',
            data: { type: 'connection_request', requestId: request.id }
          })
        }
      )
      .subscribe((status) => {
        console.log('[Push] Connections channel status:', status)
      })

    // Listen for connection acceptance
    const connectionAcceptedChannel = supabase
      .channel('connection-accepted-push')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'connection_requests',
          filter: `requester_id=eq.${user.id}`
        },
        async (payload) => {
          const request = payload.new as any
          console.log('[Push] Connection request updated:', request.status)
          
          if (request.status === 'accepted') {
            const { data: accepter } = await supabase
              .from('profiles')
              .select('full_name, profile_picture_url')
              .eq('user_id', request.requested_id)
              .single()

            await sendPush({
              userId: user.id,
              title: 'Connection Accepted',
              body: `${accepter?.full_name || 'Someone'} accepted your connection request`,
              icon: accepter?.profile_picture_url || '/logo.png',
              url: `/profile/${request.requested_id}`,
              data: { type: 'connection_accepted', userId: request.requested_id }
            })
          }
        }
      )
      .subscribe((status) => {
        console.log('[Push] Connection accepted channel status:', status)
      })

    // Listen for new comments on user's posts - NO FILTER
    const commentsChannel = supabase
      .channel('new-comments-push')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'post_comments'
        },
        async (payload) => {
          const comment = payload.new as any
          console.log('[Push] New comment detected')
          
          // Skip my own comments
          if (comment.user_id === user.id) return
          
          // Check if comment is on user's post
          const { data: post } = await supabase
            .from('posts')
            .select('user_id, content')
            .eq('id', comment.post_id)
            .single()

          if (post?.user_id !== user.id) return

          console.log('[Push] Comment on my post, sending notification')
          
          const { data: commenter } = await supabase
            .from('profiles')
            .select('full_name, profile_picture_url')
            .eq('user_id', comment.user_id)
            .single()

          await sendPush({
            userId: user.id,
            title: 'New Comment',
            body: `${commenter?.full_name || 'Someone'} commented on your post`,
            icon: commenter?.profile_picture_url || '/logo.png',
            url: `/post/${comment.post_id}`,
            data: { type: 'comment', postId: comment.post_id, commentId: comment.id }
          })
        }
      )
      .subscribe((status) => {
        console.log('[Push] Comments channel status:', status)
      })

    // Listen for new likes on user's posts - NO FILTER
    const likesChannel = supabase
      .channel('new-likes-push')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'post_likes'
        },
        async (payload) => {
          const like = payload.new as any
          
          // Skip my own likes
          if (like.user_id === user.id) return
          
          // Check if like is on user's post
          const { data: post } = await supabase
            .from('posts')
            .select('user_id')
            .eq('id', like.post_id)
            .single()

          if (post?.user_id !== user.id) return

          console.log('[Push] Like on my post, sending notification')
          
          const { data: liker } = await supabase
            .from('profiles')
            .select('full_name, profile_picture_url')
            .eq('user_id', like.user_id)
            .single()

          await sendPush({
            userId: user.id,
            title: 'New Like',
            body: `${liker?.full_name || 'Someone'} liked your post`,
            icon: liker?.profile_picture_url || '/logo.png',
            url: `/post/${like.post_id}`,
            data: { type: 'like', postId: like.post_id }
          })
        }
      )
      .subscribe((status) => {
        console.log('[Push] Likes channel status:', status)
      })

    // Listen for new job applications
    const jobApplicationsChannel = supabase
      .channel('new-job-applications-push')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'job_post_applications'
        },
        async (payload) => {
          const application = payload.new as any
          console.log('[Push] New job application detected')
          
          // Check if this is for user's job
          const { data: job } = await supabase
            .from('job_posts')
            .select('user_id, title')
            .eq('id', application.job_post_id)
            .single()

          if (job?.user_id !== user.id) return

          console.log('[Push] Application for my job, sending notification')
          
          const { data: applicant } = await supabase
            .from('profiles')
            .select('full_name, profile_picture_url')
            .eq('user_id', application.applicant_id)
            .single()

          await sendPush({
            userId: user.id,
            title: 'New Job Application',
            body: `${applicant?.full_name || 'Someone'} applied for ${job.title}`,
            icon: applicant?.profile_picture_url || '/logo.png',
            url: `/jobs/${application.job_post_id}`,
            data: { type: 'job_application', jobId: application.job_post_id }
          })
        }
      )
      .subscribe((status) => {
        console.log('[Push] Job applications channel status:', status)
      })

    // Listen for wallet transactions
    const transactionsChannel = supabase
      .channel('wallet-transactions-push')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'wallet_transactions',
          filter: `user_id=eq.${user.id}`
        },
        async (payload) => {
          const transaction = payload.new as any
          console.log('[Push] New transaction:', transaction.id)
          
          const isCredit = transaction.amount > 0
          const title = isCredit ? 'Money Received' : 'Money Sent'
          const body = `NC ${Math.abs(transaction.amount).toLocaleString()} ${isCredit ? 'credited to' : 'debited from'} your wallet`

          await sendPush({
            userId: user.id,
            title,
            body: `${body} - ${transaction.description || 'Transaction completed'}`,
            icon: '/logo.png',
            url: '/settings',
            data: { type: 'transaction', transactionId: transaction.id }
          })
        }
      )
      .subscribe((status) => {
        console.log('[Push] Transactions channel status:', status)
      })

    return () => {
      console.log('[Push] Cleaning up notification triggers')
      supabase.removeChannel(messagesChannel)
      supabase.removeChannel(connectionsChannel)
      supabase.removeChannel(connectionAcceptedChannel)
      supabase.removeChannel(commentsChannel)
      supabase.removeChannel(likesChannel)
      supabase.removeChannel(jobApplicationsChannel)
      supabase.removeChannel(transactionsChannel)
    }
  }, [user])
}
