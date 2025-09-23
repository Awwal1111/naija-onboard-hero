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
  const [presenceData, setPresenceData] = useState<Record<string, UserPresence>>({})
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!user) return

    // Update own presence when user is active
    const updatePresence = async () => {
      await supabase
        .from('user_presence')
        .upsert({
          user_id: user.id,
          is_online: true,
          last_seen: new Date().toISOString()
        })
    }

    // Update presence immediately and then every 30 seconds
    updatePresence()
    const presenceInterval = setInterval(updatePresence, 30000)

    // Set up realtime subscription for presence updates
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
        // User is going offline
        supabase
          .from('user_presence')
          .update({
            is_online: false,
            last_seen: new Date().toISOString()
          })
          .eq('user_id', user.id)
      } else {
        // User is back online
        updatePresence()
      }
    }

    // Handle beforeunload to set offline status
    const handleBeforeUnload = () => {
      supabase
        .from('user_presence')
        .update({
          is_online: false,
          last_seen: new Date().toISOString()
        })
        .eq('user_id', user.id)
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      clearInterval(presenceInterval)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('beforeunload', handleBeforeUnload)
      supabase.removeChannel(channel)
      
      // Set offline on cleanup
      supabase
        .from('user_presence')
        .update({
          is_online: false,
          last_seen: new Date().toISOString()
        })
        .eq('user_id', user.id)
    }
  }, [user])

  const isUserOnline = (userId: string): boolean => {
    return onlineUsers.has(userId)
  }

  const getUserLastSeen = (userId: string): string | null => {
    const presence = presenceData[userId]
    return presence?.last_seen || null
  }

  const getOnlineStatus = (userId: string): 'online' | 'offline' | 'recently_active' => {
    if (isUserOnline(userId)) return 'online'
    
    const lastSeen = getUserLastSeen(userId)
    if (!lastSeen) return 'offline'
    
    const lastSeenTime = new Date(lastSeen).getTime()
    const now = Date.now()
    const fiveMinutes = 5 * 60 * 1000
    
    if (now - lastSeenTime < fiveMinutes) {
      return 'recently_active'
    }
    
    return 'offline'
  }

  return {
    isUserOnline,
    getUserLastSeen,
    getOnlineStatus,
    onlineUsers: Array.from(onlineUsers)
  }
}