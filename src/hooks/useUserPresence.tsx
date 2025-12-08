import { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/useAuth'

interface UserPresence {
  user_id: string
  is_online: boolean
  last_seen: string
}

/**
 * Hook to check online status of users
 * 
 * This hook subscribes to the global presence channel and provides
 * methods to check if specific users are online. The actual presence
 * tracking is done by GlobalPresenceManager at the app level.
 */
export const useUserPresence = () => {
  const { user } = useAuth()
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set())

  useEffect(() => {
    // Subscribe to the same global presence channel to listen for updates
    const channel = supabase
      .channel('global-user-presence')
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState()
        const online = new Set<string>()
        
        Object.values(state).forEach((presences: any) => {
          presences.forEach((presence: any) => {
            if (presence.user_id) {
              online.add(presence.user_id)
            }
          })
        })
        
        setOnlineUsers(online)
      })
      .on('presence', { event: 'join' }, ({ newPresences }) => {
        setOnlineUsers(prev => {
          const updated = new Set(prev)
          newPresences.forEach((p: any) => {
            if (p.user_id) updated.add(p.user_id)
          })
          return updated
        })
      })
      .on('presence', { event: 'leave' }, ({ leftPresences }) => {
        setOnlineUsers(prev => {
          const updated = new Set(prev)
          leftPresences.forEach((p: any) => {
            if (p.user_id) updated.delete(p.user_id)
          })
          return updated
        })
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

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