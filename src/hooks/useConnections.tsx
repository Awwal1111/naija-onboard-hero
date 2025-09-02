import { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from './useAuth'
import { useToast } from './use-toast'

export interface ConnectionRequest {
  id: string
  requester_id: string
  requested_id: string
  status: 'pending' | 'accepted' | 'declined'
  created_at: string
  requester_profile?: {
    full_name: string
    profession: string
    profile_picture_url: string
  }
}

export const useConnections = () => {
  const { user } = useAuth()
  const { toast } = useToast()
  const [connectionRequests, setConnectionRequests] = useState<ConnectionRequest[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      fetchConnectionRequests()
      subscribeToConnectionRequests()
    }
  }, [user])

  const fetchConnectionRequests = async () => {
    if (!user) return

    try {
      // Get pending connection requests for the current user
      const { data, error } = await supabase
        .from('connection_requests')
        .select(`
          *,
          requester_profile:profiles!connection_requests_requester_id_fkey(
            full_name,
            profession,
            profile_picture_url
          )
        `)
        .eq('requested_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })

      if (error) throw error
      setConnectionRequests(data || [])
    } catch (error) {
      console.error('Error fetching connection requests:', error)
    } finally {
      setLoading(false)
    }
  }

  const subscribeToConnectionRequests = () => {
    if (!user) return

    const subscription = supabase
      .channel('connection_requests')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'connection_requests',
          filter: `requested_id=eq.${user.id}`
        },
        (payload) => {
          // Fetch the complete request with profile data
          fetchConnectionRequests()
          
          // Show notification
          toast({
            title: "New Connection Request",
            description: "Someone wants to connect with you!"
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(subscription)
    }
  }

  const sendConnectionRequest = async (targetUserId: string) => {
    if (!user) return { success: false, error: 'Not authenticated' }

    try {
      // Check if request already exists
      const { data: existing } = await supabase
        .from('connection_requests')
        .select('id')
        .eq('requester_id', user.id)
        .eq('requested_id', targetUserId)
        .single()

      if (existing) {
        return { success: false, error: 'Connection request already sent' }
      }

      // Create connection request
      const { error } = await supabase
        .from('connection_requests')
        .insert({
          requester_id: user.id,
          requested_id: targetUserId,
          status: 'pending'
        })

      if (error) throw error

      toast({
        title: "Connection Request Sent",
        description: "Your connection request has been sent!"
      })

      return { success: true }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to send connection request",
        variant: "destructive"
      })
      return { success: false, error: error.message }
    }
  }

  const respondToConnectionRequest = async (requestId: string, action: 'accepted' | 'declined') => {
    if (!user) return { success: false, error: 'Not authenticated' }

    try {
      const { error } = await supabase
        .from('connection_requests')
        .update({ status: action })
        .eq('id', requestId)

      if (error) throw error

      // Remove from local state
      setConnectionRequests(prev => prev.filter(req => req.id !== requestId))

      toast({
        title: action === 'accepted' ? "Connection Accepted" : "Request Declined",
        description: action === 'accepted' ? "You are now connected!" : "Request declined"
      })

      return { success: true }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to respond to request",
        variant: "destructive"
      })
      return { success: false, error: error.message }
    }
  }

  return {
    connectionRequests,
    loading,
    sendConnectionRequest,
    respondToConnectionRequest,
    refetch: fetchConnectionRequests
  }
}