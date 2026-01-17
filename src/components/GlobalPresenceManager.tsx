import { useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/useAuth'

/**
 * Global Presence Manager
 * 
 * This component tracks user presence across the ENTIRE app, not just in chat.
 * It should be mounted at the app level (in App.tsx) to ensure presence is
 * tracked as long as the user has the app open, regardless of which page they're on.
 */
export const GlobalPresenceManager = () => {
  const { user } = useAuth()

  useEffect(() => {
    if (!user) return

    console.log('[Presence] Initializing global presence for user:', user.id)

    // Create a global presence channel
    const channel = supabase
      .channel('global-user-presence')
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState()
        console.log('[Presence] Sync - online users:', Object.keys(state).length)
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        console.log('[Presence] User joined:', newPresences)
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        console.log('[Presence] User left:', leftPresences)
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          console.log('[Presence] Channel subscribed, tracking user')
          await channel.track({
            user_id: user.id,
            online_at: new Date().toISOString(),
          })
        }
      })

    // Handle page visibility changes (tab switching, minimizing)
    const handleVisibilityChange = () => {
      if (document.hidden) {
        console.log('[Presence] Tab hidden, untracking')
        channel.untrack()
      } else {
        console.log('[Presence] Tab visible, tracking')
        channel.track({
          user_id: user.id,
          online_at: new Date().toISOString(),
        })
      }
    }

    // Handle before unload (closing tab/browser)
    const handleBeforeUnload = () => {
      console.log('[Presence] Page unloading, untracking')
      channel.untrack()
    }

    // Handle online/offline events
    const handleOnline = () => {
      console.log('[Presence] Browser online, tracking')
      channel.track({
        user_id: user.id,
        online_at: new Date().toISOString(),
      })
    }

    const handleOffline = () => {
      console.log('[Presence] Browser offline, untracking')
      channel.untrack()
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('beforeunload', handleBeforeUnload)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      console.log('[Presence] Cleaning up presence channel')
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('beforeunload', handleBeforeUnload)
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      channel.untrack()
      supabase.removeChannel(channel)
    }
  }, [user])

  return null // This component doesn't render anything
}

export default GlobalPresenceManager
