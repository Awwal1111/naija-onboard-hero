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

    // Helper to send push notification with app icon
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
          body: {
            ...payload,
            icon: payload.icon || '/icon-512.png',
            badge: '/icon-512.png'
          }
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
          console.log('[Push] New message detected:', message.id, 'sender:', message.sender_id)
          
          // Skip if I sent this message
          if (message.sender_id === user.id) {
            console.log('[Push] Skipping - I sent this message')
            return
          }

          // Check if this message is in one of my chats
          const { data: chat, error: chatError } = await supabase
            .from('chats')
            .select('user1_id, user2_id')
            .eq('id', message.chat_id)
            .single()

          if (chatError || !chat) {
            console.log('[Push] Chat not found:', chatError?.message)
            return
          }

          // Am I part of this chat?
          const isMyChat = chat.user1_id === user.id || chat.user2_id === user.id
          if (!isMyChat) {
            console.log('[Push] Not my chat, skipping')
            return
          }

          console.log('[Push] This is my chat, sending notification to user:', user.id)
          
          // Get sender info
          const { data: sender } = await supabase
            .from('profiles')
            .select('full_name, profile_picture_url')
            .eq('user_id', message.sender_id)
            .single()

          const result = await sendPush({
            userId: user.id,
            title: `New message from ${sender?.full_name || 'Someone'}`,
            body: message.content?.substring(0, 100) || 'Sent you a message',
            icon: sender?.profile_picture_url || '/icon-512.png',
            url: `/chat/${message.sender_id}`,
            data: { type: 'message', messageId: message.id }
          })
          console.log('[Push] Message notification result:', result)
        }
      )
      .subscribe((status, err) => {
        console.log('[Push] Messages channel status:', status, err ? `Error: ${err.message}` : '')
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
            icon: requester?.profile_picture_url || '/icon-512.png',
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
              icon: accepter?.profile_picture_url || '/icon-512.png',
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
            icon: commenter?.profile_picture_url || '/icon-512.png',
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
            icon: liker?.profile_picture_url || '/icon-512.png',
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
            icon: applicant?.profile_picture_url || '/icon-512.png',
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
            url: '/settings',
            data: { type: 'transaction', transactionId: transaction.id }
          })
        }
      )
      .subscribe((status) => {
        console.log('[Push] Transactions channel status:', status)
      })

    // Listen for new expert classes (notify participants)
    const expertClassesChannel = supabase
      .channel('expert-classes-push')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'expert_classes'
        },
        async (payload) => {
          const expertClass = payload.new as any
          console.log('[Push] New expert class created:', expertClass.id)
          
          // Get expert info
          const { data: expert } = await supabase
            .from('profiles')
            .select('full_name, profile_picture_url')
            .eq('user_id', expertClass.expert_id)
            .single()

          // Notify all users who follow this expert (connections)
          const { data: connections } = await supabase
            .from('connections')
            .select('user1_id, user2_id')
            .or(`user1_id.eq.${expertClass.expert_id},user2_id.eq.${expertClass.expert_id}`)

          if (connections) {
            for (const conn of connections) {
              const followerId = conn.user1_id === expertClass.expert_id ? conn.user2_id : conn.user1_id
              await sendPush({
                userId: followerId,
                title: 'New Expert Class',
                body: `${expert?.full_name || 'An expert'} is hosting: ${expertClass.title}`,
                icon: expert?.profile_picture_url || '/icon-512.png',
                url: `/expert-class/${expertClass.id}`,
                data: { type: 'expert_class', classId: expertClass.id }
              })
            }
          }
        }
      )
      .subscribe((status) => {
        console.log('[Push] Expert classes channel status:', status)
      })

    // Listen for expert class status changes (live, ended)
    const expertClassStatusChannel = supabase
      .channel('expert-class-status-push')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'expert_classes'
        },
        async (payload) => {
          const expertClass = payload.new as any
          const oldClass = payload.old as any
          
          // Only notify when class goes live
          if (oldClass.status !== 'live' && expertClass.status === 'live') {
            console.log('[Push] Expert class went live:', expertClass.id)
            
            // Get expert info
            const { data: expert } = await supabase
              .from('profiles')
              .select('full_name, profile_picture_url')
              .eq('user_id', expertClass.expert_id)
              .single()

            // Notify all participants who enrolled
            const { data: participants } = await supabase
              .from('class_participants')
              .select('user_id')
              .eq('class_id', expertClass.id)

            if (participants) {
              for (const participant of participants) {
                if (participant.user_id !== expertClass.expert_id) {
                  await sendPush({
                    userId: participant.user_id,
                    title: 'Class Starting Now!',
                    body: `${expert?.full_name}'s class "${expertClass.title}" is now live!`,
                    icon: expert?.profile_picture_url || '/icon-512.png',
                    url: `/classroom/${expertClass.id}`,
                    data: { type: 'class_live', classId: expertClass.id }
                  })
                }
              }
            }
          }
        }
      )
      .subscribe((status) => {
        console.log('[Push] Expert class status channel status:', status)
      })

    // Listen for new expert ratings
    const expertRatingsChannel = supabase
      .channel('expert-ratings-push')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'expert_ratings',
          filter: `expert_id=eq.${user.id}`
        },
        async (payload) => {
          const rating = payload.new as any
          console.log('[Push] New expert rating received:', rating.id)
          
          const { data: rater } = await supabase
            .from('profiles')
            .select('full_name, profile_picture_url')
            .eq('user_id', rating.user_id)
            .single()

          await sendPush({
            userId: user.id,
            title: 'New Rating Received',
            body: `${rater?.full_name || 'Someone'} rated you ${rating.rating} stars${rating.comment ? ': "' + rating.comment.substring(0, 50) + '..."' : ''}`,
            icon: rater?.profile_picture_url || '/icon-512.png',
            url: '/profile',
            data: { type: 'expert_rating', ratingId: rating.id }
          })
        }
      )
      .subscribe((status) => {
        console.log('[Push] Expert ratings channel status:', status)
      })

    // Listen for class participant joins (notify expert)
    const classParticipantsChannel = supabase
      .channel('class-participants-push')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'class_participants'
        },
        async (payload) => {
          const participant = payload.new as any
          console.log('[Push] New class participant:', participant.id)
          
          // Get class info
          const { data: expertClass } = await supabase
            .from('expert_classes')
            .select('expert_id, title')
            .eq('id', participant.class_id)
            .single()

          // Skip if participant is the expert
          if (!expertClass || expertClass.expert_id === participant.user_id) return

          // Notify the expert
          const { data: participantProfile } = await supabase
            .from('profiles')
            .select('full_name, profile_picture_url')
            .eq('user_id', participant.user_id)
            .single()

          await sendPush({
            userId: expertClass.expert_id,
            title: 'New Class Enrollment',
            body: `${participantProfile?.full_name || 'Someone'} enrolled in your class "${expertClass.title}"`,
            icon: participantProfile?.profile_picture_url || '/icon-512.png',
            url: `/expert-class/${participant.class_id}`,
            data: { type: 'class_enrollment', classId: participant.class_id }
          })
        }
      )
      .subscribe((status) => {
        console.log('[Push] Class participants channel status:', status)
      })

    // Listen for expert application status changes
    const expertApplicationsChannel = supabase
      .channel('expert-applications-push')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'expert_applications',
          filter: `user_id=eq.${user.id}`
        },
        async (payload) => {
          const application = payload.new as any
          const oldApplication = payload.old as any
          
          // Only notify when status changes
          if (oldApplication.status === application.status) return
          
          console.log('[Push] Expert application status changed:', application.status)
          
          let title = 'Expert Application Update'
          let body = ''
          
          if (application.status === 'approved') {
            title = '🎉 Expert Application Approved!'
            body = 'Congratulations! You are now a verified expert on NaijaLancers.'
          } else if (application.status === 'rejected') {
            title = 'Expert Application Status'
            body = `Your application was not approved. ${application.admin_feedback || 'Please try again later.'}`
          } else if (application.status === 'pending_review') {
            title = 'Application Under Review'
            body = 'Your expert application is being reviewed by our team.'
          }

          if (body) {
            await sendPush({
              userId: user.id,
              title,
              body,
              url: '/expert-application',
              data: { type: 'expert_application', status: application.status }
            })
          }
        }
      )
      .subscribe((status) => {
        console.log('[Push] Expert applications channel status:', status)
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
      supabase.removeChannel(expertClassesChannel)
      supabase.removeChannel(expertClassStatusChannel)
      supabase.removeChannel(expertRatingsChannel)
      supabase.removeChannel(classParticipantsChannel)
      supabase.removeChannel(expertApplicationsChannel)
    }
  }, [user])
}
