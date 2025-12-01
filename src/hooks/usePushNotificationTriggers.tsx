import { useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/useAuth'

export const usePushNotificationTriggers = () => {
  const { user } = useAuth()

  useEffect(() => {
    if (!user) return

    // Listen for new messages
    const messagesChannel = supabase
      .channel('new-messages-push')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `receiver_id=eq.${user.id}`
        },
        async (payload) => {
          const message = payload.new
          
          // Get sender info
          const { data: sender } = await supabase
            .from('profiles')
            .select('full_name, profile_picture_url')
            .eq('user_id', message.sender_id)
            .single()

          // Trigger push notification
          await supabase.functions.invoke('send-push-notification', {
            body: {
              userId: user.id,
              title: `New message from ${sender?.full_name || 'Someone'}`,
              body: message.content?.substring(0, 100) || 'Sent you a message',
              icon: sender?.profile_picture_url || '/logo.png',
              url: `/chat/${message.sender_id}`,
              data: { type: 'message', messageId: message.id }
            }
          })
        }
      )
      .subscribe()

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
          const request = payload.new
          
          // Get requester info
          const { data: requester } = await supabase
            .from('profiles')
            .select('full_name, profile_picture_url')
            .eq('user_id', request.requester_id)
            .single()

          await supabase.functions.invoke('send-push-notification', {
            body: {
              userId: user.id,
              title: 'New Connection Request',
              body: `${requester?.full_name || 'Someone'} wants to connect with you`,
              icon: requester?.profile_picture_url || '/logo.png',
              url: '/connections/requests',
              data: { type: 'connection_request', requestId: request.id }
            }
          })
        }
      )
      .subscribe()

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
          const request = payload.new
          
          if (request.status === 'accepted') {
            const { data: accepter } = await supabase
              .from('profiles')
              .select('full_name, profile_picture_url')
              .eq('user_id', request.requested_id)
              .single()

            await supabase.functions.invoke('send-push-notification', {
              body: {
                userId: user.id,
                title: 'Connection Accepted',
                body: `${accepter?.full_name || 'Someone'} accepted your connection request`,
                icon: accepter?.profile_picture_url || '/logo.png',
                url: `/profile/${request.requested_id}`,
                data: { type: 'connection_accepted', userId: request.requested_id }
              }
            })
          }
        }
      )
      .subscribe()

    // Listen for new comments on user's posts
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
          const comment = payload.new
          
          // Check if comment is on user's post
          const { data: post } = await supabase
            .from('posts')
            .select('user_id, title, content')
            .eq('id', comment.post_id)
            .single()

          if (post?.user_id === user.id && comment.user_id !== user.id) {
            const { data: commenter } = await supabase
              .from('profiles')
              .select('full_name, profile_picture_url')
              .eq('user_id', comment.user_id)
              .single()

            await supabase.functions.invoke('send-push-notification', {
              body: {
                userId: user.id,
                title: 'New Comment',
                body: `${commenter?.full_name || 'Someone'} commented on your post`,
                icon: commenter?.profile_picture_url || '/logo.png',
                url: `/post/${comment.post_id}`,
                data: { type: 'comment', postId: comment.post_id, commentId: comment.id }
              }
            })
          }
        }
      )
      .subscribe()

    // Listen for new likes on user's posts
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
          const like = payload.new
          
          // Check if like is on user's post
          const { data: post } = await supabase
            .from('posts')
            .select('user_id, title, content')
            .eq('id', like.post_id)
            .single()

          if (post?.user_id === user.id && like.user_id !== user.id) {
            const { data: liker } = await supabase
              .from('profiles')
              .select('full_name, profile_picture_url')
              .eq('user_id', like.user_id)
              .single()

            await supabase.functions.invoke('send-push-notification', {
              body: {
                userId: user.id,
                title: 'New Like',
                body: `${liker?.full_name || 'Someone'} liked your post`,
                icon: liker?.profile_picture_url || '/logo.png',
                url: `/post/${like.post_id}`,
                data: { type: 'like', postId: like.post_id }
              }
            })
          }
        }
      )
      .subscribe()

    // Listen for new job applications
    const jobApplicationsChannel = supabase
      .channel('new-job-applications-push')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'job_applications'
        },
        async (payload) => {
          const application = payload.new
          
          // Check if this is for user's job
          const { data: job } = await supabase
            .from('job_posts')
            .select('user_id, title')
            .eq('id', application.job_id)
            .single()

          if (job?.user_id === user.id) {
            const { data: applicant } = await supabase
              .from('profiles')
              .select('full_name, profile_picture_url')
              .eq('user_id', application.applicant_id)
              .single()

            await supabase.functions.invoke('send-push-notification', {
              body: {
                userId: user.id,
                title: 'New Job Application',
                body: `${applicant?.full_name || 'Someone'} applied for ${job.title}`,
                icon: applicant?.profile_picture_url || '/logo.png',
                url: `/jobs/${application.job_id}`,
                data: { type: 'job_application', jobId: application.job_id, applicationId: application.id }
              }
            })
          }
        }
      )
      .subscribe()

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
          const transaction = payload.new
          
          const isCredit = transaction.amount > 0
          const title = isCredit ? 'Money Received' : 'Money Sent'
          const body = `NC ${Math.abs(transaction.amount).toLocaleString()} ${isCredit ? 'credited to' : 'debited from'} your wallet`

          await supabase.functions.invoke('send-push-notification', {
            body: {
              userId: user.id,
              title,
              body: `${body} - ${transaction.description || 'Transaction completed'}`,
              icon: '/logo.png',
              url: '/settings',
              data: { type: 'transaction', transactionId: transaction.id }
            }
          })
        }
      )
      .subscribe()

    return () => {
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
