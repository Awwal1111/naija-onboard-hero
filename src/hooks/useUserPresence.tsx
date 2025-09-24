import { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/useAuth'

interface UserPresence {
  user_id: string
  is_online: boolean
  last_seen: string
}

export const useUserPresence = () => {
  const { user } = useAuth()
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!user) return

    // Set up realtime subscription for presence updates using channel presence
    const channel = supabase
      .channel('user-presence')
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState()
        const online = new Set<string>()
        
        Object.values(state).forEach((presences: any) => {
          presences.forEach((presence: any) => {
            online.add(presence.user_id)
          })
        })
        
        setOnlineUsers(online)
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        console.log('User joined:', key, newPresences)
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        console.log('User left:', key, leftPresences)
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            user_id: user.id,
            online_at: new Date().toISOString(),
          })
        }
      })

    // Handle page visibility changes
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // User is going offline - just untrack presence
        channel.untrack()
      } else {
        // User is back online - track again
        channel.track({
          user_id: user.id,
          online_at: new Date().toISOString(),
        })
      }
    }

    // Handle beforeunload to set offline status
    const handleBeforeUnload = () => {
      channel.untrack()
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('beforeunload', handleBeforeUnload)
      supabase.removeChannel(channel)
    }
  }, [user])

  const isUserOnline = (userId: string): boolean => {
    return onlineUsers.has(userId)
  }

  const getOnlineStatus = (userId: string): 'online' | 'offline' => {
    return isUserOnline(userId) ? 'online' : 'offline'
  }

  return {
    isUserOnline,
    getOnlineStatus,
    onlineUsers: Array.from(onlineUsers)
  }
}