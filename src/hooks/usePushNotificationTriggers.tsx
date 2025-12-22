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
    const walletTransactionsChannel = supabase
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
          console.log('[Push] New wallet transaction:', transaction.id, 'kind:', transaction.kind)
          
          const isCredit = transaction.amount > 0
          let title = isCredit ? 'Money Received' : 'Money Sent'
          let body = `NC ${Math.abs(transaction.amount).toLocaleString()} ${isCredit ? 'credited to' : 'debited from'} your wallet`

          // Customize based on transaction kind
          if (transaction.kind) {
            const kindMap: Record<string, { title: string; emoji: string }> = {
              'deposit': { title: 'Deposit Successful', emoji: '💰' },
              'withdrawal': { title: 'Withdrawal Processed', emoji: '💸' },
              'transfer': { title: isCredit ? 'Transfer Received' : 'Transfer Sent', emoji: '📤' },
              'safepay': { title: 'SafePay Transaction', emoji: '🔒' },
              'escrow': { title: 'Escrow Transaction', emoji: '🤝' },
              'refund': { title: 'Refund Received', emoji: '↩️' }
            }
            const kindInfo = kindMap[transaction.kind]
            if (kindInfo) {
              title = `${kindInfo.emoji} ${kindInfo.title}`
            }
          }

          await sendPush({
            userId: user.id,
            title,
            body,
            url: '/settings',
            data: { type: 'wallet_transaction', transactionId: transaction.id, kind: transaction.kind }
          })
        }
      )
      .subscribe((status) => {
        console.log('[Push] Wallet transactions channel status:', status)
      })

    // Listen for ALL transactions (VTU, betting, etc.)
    const allTransactionsChannel = supabase
      .channel('all-transactions-push')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'transactions',
          filter: `user_id=eq.${user.id}`
        },
        async (payload) => {
          const transaction = payload.new as any
          console.log('[Push] New transaction:', transaction.id, 'type:', transaction.type)
          
          // Map transaction types to user-friendly notifications
          const typeMap: Record<string, { title: string; emoji: string; description: string }> = {
            // VTU Services
            'airtime': { title: 'Airtime Purchase', emoji: '📱', description: 'Airtime recharge successful' },
            'airtime_purchase': { title: 'Airtime Purchase', emoji: '📱', description: 'Airtime recharge successful' },
            'data': { title: 'Data Purchase', emoji: '📶', description: 'Data bundle purchased successfully' },
            'data_purchase': { title: 'Data Purchase', emoji: '📶', description: 'Data bundle purchased successfully' },
            'cable_tv': { title: 'Cable TV Subscription', emoji: '📺', description: 'Cable TV subscription successful' },
            'cable': { title: 'Cable TV Subscription', emoji: '📺', description: 'Cable TV subscription successful' },
            'electricity': { title: 'Electricity Payment', emoji: '⚡', description: 'Electricity token purchased' },
            'electricity_payment': { title: 'Electricity Payment', emoji: '⚡', description: 'Electricity token purchased' },
            
            // Betting
            'betting': { title: 'Betting Account Funded', emoji: '🎲', description: 'Betting wallet funded successfully' },
            'betting_funding': { title: 'Betting Account Funded', emoji: '🎲', description: 'Betting wallet funded successfully' },
            'bet_funding': { title: 'Betting Account Funded', emoji: '🎲', description: 'Betting wallet funded successfully' },
            
            // Wallet operations
            'deposit': { title: 'Deposit Successful', emoji: '💰', description: 'Funds added to your wallet' },
            'withdrawal': { title: 'Withdrawal Processed', emoji: '💸', description: 'Withdrawal processed successfully' },
            'transfer': { title: 'Transfer Complete', emoji: '📤', description: 'Transfer completed successfully' },
            'transfer_in': { title: 'Transfer Received', emoji: '📥', description: 'You received a transfer' },
            'transfer_out': { title: 'Transfer Sent', emoji: '📤', description: 'Transfer sent successfully' },
            
            // Earnings & Rewards
            'earning': { title: 'Earnings Credited', emoji: '💵', description: 'You earned money!' },
            'reward': { title: 'Reward Received', emoji: '🎁', description: 'Reward credited to your wallet' },
            'referral_bonus': { title: 'Referral Bonus', emoji: '🎉', description: 'Referral bonus credited' },
            'daily_signin': { title: 'Daily Sign-in Reward', emoji: '📅', description: 'Daily reward credited' },
            'spin_wheel': { title: 'Spin Wheel Win', emoji: '🎰', description: 'Spin wheel reward credited' },
            'trivia_win': { title: 'Trivia Win', emoji: '🧠', description: 'Trivia reward credited' },
            'game_win': { title: 'Game Win', emoji: '🏆', description: 'Game reward credited' },
            'survey': { title: 'Survey Completed', emoji: '📋', description: 'Survey reward credited' },
            'task': { title: 'Task Completed', emoji: '✅', description: 'Task reward credited' },
            
            // Purchases
            'course_purchase': { title: 'Course Purchased', emoji: '📚', description: 'Course purchase successful' },
            'product_purchase': { title: 'Product Purchased', emoji: '🛒', description: 'Product purchase successful' },
            'class_enrollment': { title: 'Class Enrolled', emoji: '🎓', description: 'Expert class enrollment successful' },
            
            // SafePay & Escrow
            'safepay': { title: 'SafePay Transaction', emoji: '🔒', description: 'SafePay transaction processed' },
            'escrow': { title: 'Escrow Transaction', emoji: '🤝', description: 'Escrow transaction processed' },
            'escrow_funded': { title: 'Escrow Funded', emoji: '🔐', description: 'Escrow has been funded' },
            'escrow_released': { title: 'Escrow Released', emoji: '✅', description: 'Escrow funds released' },
            'escrow_refunded': { title: 'Escrow Refunded', emoji: '↩️', description: 'Escrow funds refunded' },
            
            // Donations & Fundraising
            'donation': { title: 'Donation Made', emoji: '❤️', description: 'Thank you for your donation' },
            'donation_received': { title: 'Donation Received', emoji: '💝', description: 'You received a donation' },
            'fundraising': { title: 'Fundraising Contribution', emoji: '🙏', description: 'Contribution successful' },
            
            // Refunds
            'refund': { title: 'Refund Received', emoji: '↩️', description: 'Refund processed successfully' },
            
            // Crypto
            'crypto_deposit': { title: 'Crypto Deposit', emoji: '🪙', description: 'Crypto deposit received' },
            'crypto_withdrawal': { title: 'Crypto Withdrawal', emoji: '🪙', description: 'Crypto withdrawal processed' }
          }

          const typeInfo = typeMap[transaction.type] || { 
            title: 'Transaction Complete', 
            emoji: '💳', 
            description: transaction.description || 'Transaction processed'
          }
          
          const amount = transaction.amount_nc || transaction.amount || 0
          const amountStr = Math.abs(amount).toLocaleString()

          await sendPush({
            userId: user.id,
            title: `${typeInfo.emoji} ${typeInfo.title}`,
            body: `NC ${amountStr} - ${typeInfo.description}`,
            url: '/settings',
            data: { type: 'transaction', transactionId: transaction.id, transactionType: transaction.type }
          })
        }
      )
      .subscribe((status) => {
        console.log('[Push] All transactions channel status:', status)
      })

    // Listen for crypto transactions
    const cryptoTransactionsChannel = supabase
      .channel('crypto-transactions-push')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'crypto_transactions',
          filter: `user_id=eq.${user.id}`
        },
        async (payload) => {
          const transaction = payload.new as any
          const oldTransaction = payload.old as any
          
          // Only notify when status changes to completed
          if (oldTransaction.status === transaction.status) return
          
          console.log('[Push] Crypto transaction status changed:', transaction.status)
          
          if (transaction.status === 'completed') {
            const isDeposit = transaction.transaction_type === 'deposit'
            await sendPush({
              userId: user.id,
              title: isDeposit ? '🪙 Crypto Deposit Confirmed' : '🪙 Crypto Withdrawal Sent',
              body: `${transaction.crypto_amount} ${transaction.crypto_currency} ${isDeposit ? 'deposited' : 'withdrawn'} - NC ${transaction.nc_amount?.toLocaleString() || 0}`,
              url: '/settings',
              data: { type: 'crypto_transaction', transactionId: transaction.id }
            })
          } else if (transaction.status === 'failed') {
            await sendPush({
              userId: user.id,
              title: '❌ Crypto Transaction Failed',
              body: transaction.error_message || 'Your crypto transaction could not be processed',
              url: '/settings',
              data: { type: 'crypto_transaction', transactionId: transaction.id }
            })
          }
        }
      )
      .subscribe((status) => {
        console.log('[Push] Crypto transactions channel status:', status)
      })

    // Listen for SafePay transaction updates
    const safepayChannel = supabase
      .channel('safepay-transactions-push')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'safepay_transactions'
        },
        async (payload) => {
          const safepay = payload.new as any
          const oldSafepay = payload.old as any
          
          // Only notify on status changes
          if (oldSafepay.status === safepay.status) return
          
          console.log('[Push] SafePay status changed:', safepay.status)
          
          // Determine which user to notify
          const isBuyer = safepay.buyer_id === user.id
          const isSeller = safepay.seller_id === user.id
          
          if (!isBuyer && !isSeller) return
          
          const statusMap: Record<string, { buyerTitle: string; sellerTitle: string; emoji: string }> = {
            'funded': { buyerTitle: 'Payment Secured', sellerTitle: 'Payment Received', emoji: '🔒' },
            'released': { buyerTitle: 'Payment Released', sellerTitle: 'Payment Credited', emoji: '✅' },
            'cancelled': { buyerTitle: 'Payment Cancelled', sellerTitle: 'Transaction Cancelled', emoji: '❌' },
            'disputed': { buyerTitle: 'Dispute Filed', sellerTitle: 'Dispute Filed', emoji: '⚠️' },
            'refunded': { buyerTitle: 'Refund Received', sellerTitle: 'Refund Processed', emoji: '↩️' }
          }
          
          const statusInfo = statusMap[safepay.status]
          if (!statusInfo) return
          
          await sendPush({
            userId: user.id,
            title: `${statusInfo.emoji} SafePay: ${isBuyer ? statusInfo.buyerTitle : statusInfo.sellerTitle}`,
            body: `NC ${safepay.amount?.toLocaleString() || 0} - Transaction ${safepay.status}`,
            url: '/settings',
            data: { type: 'safepay', safepayId: safepay.id, status: safepay.status }
          })
        }
      )
      .subscribe((status) => {
        console.log('[Push] SafePay channel status:', status)
      })

    // Listen for Quidax ramp transactions
    const quidaxChannel = supabase
      .channel('quidax-transactions-push')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'quidax_transactions',
          filter: `user_id=eq.${user.id}`
        },
        async (payload) => {
          const transaction = payload.new as any
          const oldTransaction = payload.old as any
          
          if (oldTransaction.status === transaction.status) return
          
          console.log('[Push] Quidax transaction status changed:', transaction.status)
          
          if (transaction.status === 'completed') {
            const isBuy = transaction.transaction_type === 'buy'
            await sendPush({
              userId: user.id,
              title: isBuy ? '💰 Deposit Confirmed' : '💸 Withdrawal Complete',
              body: isBuy 
                ? `₦${transaction.fiat_amount?.toLocaleString() || 0} converted - Check your wallet`
                : `₦${transaction.fiat_amount?.toLocaleString() || 0} sent to your bank`,
              url: '/settings',
              data: { type: 'quidax', transactionId: transaction.id }
            })
          } else if (transaction.status === 'failed') {
            await sendPush({
              userId: user.id,
              title: '❌ Transaction Failed',
              body: 'Your deposit/withdrawal could not be processed',
              url: '/settings',
              data: { type: 'quidax', transactionId: transaction.id }
            })
          }
        }
      )
      .subscribe((status) => {
        console.log('[Push] Quidax channel status:', status)
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

    // Listen for new job posts (notify experts)
    const newJobsChannel = supabase
      .channel('new-jobs-push')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'job_posts'
        },
        async (payload) => {
          const job = payload.new as any
          console.log('[Push] New job posted:', job.id)
          
          // Skip if this is the user's own job
          if (job.user_id === user.id) return
          
          // Check if user is an expert (only notify experts of new jobs)
          const { data: profile } = await supabase
            .from('profiles')
            .select('is_expert, state_name')
            .eq('user_id', user.id)
            .single()
          
          if (!profile?.is_expert) return
          
          // Check if job is in user's state or remote
          if (job.location_state && job.location_state !== profile.state_name && !job.is_remote) {
            return
          }

          const { data: poster } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('user_id', job.user_id)
            .single()

          await sendPush({
            userId: user.id,
            title: '🎯 New Gig Alert',
            body: `${job.title} - Budget: ₦${job.budget_min?.toLocaleString() || 0}-${job.budget_max?.toLocaleString() || 0}`,
            url: `/jobs/${job.id}`,
            data: { type: 'new_job', jobId: job.id }
          })
        }
      )
      .subscribe((status) => {
        console.log('[Push] New jobs channel status:', status)
      })

    // Listen for new courses (notify connections)
    const newCoursesChannel = supabase
      .channel('new-courses-push')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'courses'
        },
        async (payload) => {
          const course = payload.new as any
          console.log('[Push] New course created:', course.id)
          
          // Skip if this is the user's own course
          if (course.user_id === user.id) return
          
          // Check if user is connected to the course creator
          const { data: connection } = await supabase
            .from('connections')
            .select('id')
            .or(`and(user1_id.eq.${user.id},user2_id.eq.${course.user_id}),and(user1_id.eq.${course.user_id},user2_id.eq.${user.id})`)
            .single()
          
          if (!connection) return

          const { data: instructor } = await supabase
            .from('profiles')
            .select('full_name, profile_picture_url')
            .eq('user_id', course.user_id)
            .single()

          await sendPush({
            userId: user.id,
            title: '📚 New Course',
            body: `${instructor?.full_name || 'An expert'} published: ${course.title}`,
            icon: instructor?.profile_picture_url || '/icon-512.png',
            url: `/courses/${course.id}`,
            data: { type: 'new_course', courseId: course.id }
          })
        }
      )
      .subscribe((status) => {
        console.log('[Push] New courses channel status:', status)
      })

    // Listen for new fundraising campaigns
    const newFundraisingChannel = supabase
      .channel('new-fundraising-push')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'fundraisings'
        },
        async (payload) => {
          const fundraising = payload.new as any
          const oldFundraising = payload.old as any
          
          // Only notify when status changes to approved
          if (oldFundraising.status === fundraising.status) return
          if (fundraising.status !== 'approved') return
          
          // Skip if this is the user's own campaign
          if (fundraising.user_id === user.id) return
          
          console.log('[Push] New approved fundraising:', fundraising.id)
          
          // Check if user is connected to the campaign creator
          const { data: connection } = await supabase
            .from('connections')
            .select('id')
            .or(`and(user1_id.eq.${user.id},user2_id.eq.${fundraising.user_id}),and(user1_id.eq.${fundraising.user_id},user2_id.eq.${user.id})`)
            .single()
          
          if (!connection) return

          const { data: creator } = await supabase
            .from('profiles')
            .select('full_name, profile_picture_url')
            .eq('user_id', fundraising.user_id)
            .single()

          await sendPush({
            userId: user.id,
            title: '🙏 New Campaign',
            body: `${creator?.full_name || 'Someone'} started: ${fundraising.title}`,
            icon: creator?.profile_picture_url || '/icon-512.png',
            url: `/fundraising/${fundraising.id}`,
            data: { type: 'new_fundraising', fundraisingId: fundraising.id }
          })
        }
      )
      .subscribe((status) => {
        console.log('[Push] New fundraising channel status:', status)
      })

    return () => {
      console.log('[Push] Cleaning up notification triggers')
      supabase.removeChannel(messagesChannel)
      supabase.removeChannel(connectionsChannel)
      supabase.removeChannel(connectionAcceptedChannel)
      supabase.removeChannel(commentsChannel)
      supabase.removeChannel(likesChannel)
      supabase.removeChannel(jobApplicationsChannel)
      supabase.removeChannel(walletTransactionsChannel)
      supabase.removeChannel(allTransactionsChannel)
      supabase.removeChannel(cryptoTransactionsChannel)
      supabase.removeChannel(safepayChannel)
      supabase.removeChannel(quidaxChannel)
      supabase.removeChannel(expertClassesChannel)
      supabase.removeChannel(expertClassStatusChannel)
      supabase.removeChannel(expertRatingsChannel)
      supabase.removeChannel(classParticipantsChannel)
      supabase.removeChannel(expertApplicationsChannel)
      supabase.removeChannel(newJobsChannel)
      supabase.removeChannel(newCoursesChannel)
      supabase.removeChannel(newFundraisingChannel)
    }
  }, [user])
}
