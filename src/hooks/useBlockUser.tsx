import { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/use-toast'

interface BlockedUser {
  id: string
  blocker_id: string
  blocked_id: string
  created_at: string
}

export const useBlockUser = (otherUserId: string) => {
  const { user } = useAuth()
  const { toast } = useToast()
  const [isBlocked, setIsBlocked] = useState(false)
  const [isBlockedBy, setIsBlockedBy] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!user || !otherUserId) return
    
    checkBlockStatus()
  }, [user, otherUserId])

  const checkBlockStatus = async () => {
    if (!user || !otherUserId) return

    try {
      // Check if current user blocked other user
      const { data: userBlocked, error: error1 } = await supabase
        .from('blocked_users')
        .select('id')
        .eq('blocker_id', user.id)
        .eq('blocked_id', otherUserId)
        .maybeSingle()

      if (error1 && error1.code !== 'PGRST116') throw error1

      // Check if other user blocked current user
      const { data: blockedByOther, error: error2 } = await supabase
        .from('blocked_users')
        .select('id')
        .eq('blocker_id', otherUserId)  
        .eq('blocked_id', user.id)
        .maybeSingle()

      if (error2 && error2.code !== 'PGRST116') throw error2

      setIsBlocked(!!userBlocked)
      setIsBlockedBy(!!blockedByOther)
    } catch (error) {
      console.error('Error checking block status:', error)
    }
  }

  const blockUser = async () => {
    if (!user || !otherUserId || isBlocked) return

    setLoading(true)
    try {
      const { error } = await supabase
        .from('blocked_users')
        .insert({
          blocker_id: user.id,
          blocked_id: otherUserId
        })

      if (error) throw error

      setIsBlocked(true)
      toast({
        title: "User Blocked",
        description: "You have blocked this user. They can no longer message you."
      })
    } catch (error) {
      console.error('Error blocking user:', error)
      toast({
        title: "Error",
        description: "Failed to block user",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const unblockUser = async () => {
    if (!user || !otherUserId || !isBlocked) return

    setLoading(true)
    try {
      const { error } = await supabase
        .from('blocked_users')
        .delete()
        .eq('blocker_id', user.id)
        .eq('blocked_id', otherUserId)

      if (error) throw error

      setIsBlocked(false)
      toast({
        title: "User Unblocked", 
        description: "You have unblocked this user."
      })
    } catch (error) {
      console.error('Error unblocking user:', error)
      toast({
        title: "Error",
        description: "Failed to unblock user",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const canSendMessage = !isBlocked && !isBlockedBy

  return {
    isBlocked,
    isBlockedBy,
    loading,
    canSendMessage,
    blockUser,
    unblockUser,
    checkBlockStatus
  }
}