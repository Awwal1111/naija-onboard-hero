import { useState, useEffect } from 'react'
import { useAuth } from './useAuth'
import { useToast } from './use-toast'
import { supabase } from '@/integrations/supabase/client'
import { loadProfilesBasic } from '@/lib/profileLoader'

export interface ConnectionRequest {
  id: string
  requester_id: string
  requested_id: string
  status: string // Temporarily use string instead of union type
  created_at: string
  requester_profile?: {
    full_name: string
    profile_picture_url?: string
    profession?: string
  }
  requested_profile?: {
    full_name: string
    profile_picture_url?: string
    profession?: string
  }
}

export interface Connection {
  id: string
  user1_id: string
  user2_id: string
  created_at: string
  other_user?: {
    id: string
    full_name: string
    profile_picture_url?: string
    profession?: string
    average_rating?: number
    rating_count?: number
  }
}

export const useConnections = () => {
  const { user } = useAuth()
  const { toast } = useToast()
  const [connectionRequests, setConnectionRequests] = useState<ConnectionRequest[]>([])
  const [connections, setConnections] = useState<Connection[]>([])
  const [loading, setLoading] = useState(false)

  const fetchConnectionRequests = async () => {
    if (!user?.id) return
    
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('connection_requests')
        .select('id, requester_id, requested_id, status, created_at, updated_at')
        .or(`requester_id.eq.${user.id},requested_id.eq.${user.id}`)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) throw error
      
      // Filter out self-requests (where user sent request to themselves)
      const validRequests = (data || []).filter(
        request => request.requester_id !== request.requested_id
      )
      
      // Batch-load all involved profiles in a single deduped query (egress fix)
      const ids = Array.from(
        new Set(validRequests.flatMap(r => [r.requester_id, r.requested_id]))
      )
      const profileMap = await loadProfilesBasic(ids)
      const requestsWithProfiles = validRequests.map(request => ({
        ...request,
        requester_profile: profileMap.get(request.requester_id) || undefined,
        requested_profile: profileMap.get(request.requested_id) || undefined,
      }))
      
      setConnectionRequests(requestsWithProfiles)
    } catch (error) {
      console.error('Error fetching connection requests:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchConnections = async () => {
    if (!user?.id) return
    
    try {
      const { data, error } = await supabase
        .from('connections')
        .select('id, user1_id, user2_id, created_at')
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
        .order('created_at', { ascending: false })
        .limit(500)

      if (error) throw error
      
      // Filter out self-connections (where user connected to themselves)
      const validConnections = (data || []).filter(
        connection => connection.user1_id !== connection.user2_id
      )
      
      // Batch other-user profile lookups into a single .in() query
      const otherIds = Array.from(new Set(
        validConnections.map(c => c.user1_id === user.id ? c.user2_id : c.user1_id)
      ))
      const { data: otherProfiles } = otherIds.length
        ? await supabase
            .from('profiles')
            .select('user_id, full_name, profile_picture_url, profession, average_rating, rating_count')
            .in('user_id', otherIds)
            .limit(otherIds.length)
        : { data: [] as any[] }
      const otherMap = new Map((otherProfiles || []).map((p: any) => [p.user_id, p]))
      const connectionsWithProfiles = validConnections.map(conn => {
        const otherUserId = conn.user1_id === user.id ? conn.user2_id : conn.user1_id
        const p: any = otherMap.get(otherUserId)
        return {
          ...conn,
          other_user: p ? {
            id: p.user_id,
            full_name: p.full_name,
            profile_picture_url: p.profile_picture_url,
            profession: p.profession,
            average_rating: p.average_rating,
            rating_count: p.rating_count,
          } : undefined
        }
      })
      
      setConnections(connectionsWithProfiles)
    } catch (error) {
      console.error('Error fetching connections:', error)
    }
  }

  const sendConnectionRequest = async (targetUserId: string) => {
    if (!user?.id) return { error: 'Not authenticated' }
    if (user.id === targetUserId) {
      toast({ title: "Invalid Action", description: "You cannot send a connection request to yourself.", variant: "destructive" })
      return { error: 'Cannot connect with yourself' }
    }

    try {
      const { data, error } = await supabase.rpc('send_connection_request', {
        p_target_user_id: targetUserId
      })
      if (error) throw error
      const result = data as { success: boolean; error?: string }
      if (!result?.success) {
        toast({ title: "Request Not Sent", description: result?.error || "Could not send request.", variant: "destructive" })
        return { error: result?.error || 'Request failed' }
      }

      await supabase.from('notifications').insert({
        user_id: targetUserId,
        type: 'connection_request',
        title: 'New Connection Request',
        message: 'Someone wants to connect with you!',
        metadata: { requester_id: user.id }
      })

      toast({ title: "Connection Request Sent", description: "Your connection request has been sent successfully." })
      await fetchConnectionRequests()
      return { success: true }
    } catch (error: any) {
      console.error('Error sending connection request:', error)
      toast({ title: "Error", description: error.message || "Failed to send connection request", variant: "destructive" })
      return { error: error.message }
    }
  }

  const respondToConnectionRequest = async (requestId: string, accept: boolean) => {
    if (!user?.id) return { error: 'Not authenticated' }

    try {
      const { data, error } = await supabase.rpc('respond_to_connection_request', {
        p_request_id: requestId,
        p_accept: accept
      })
      if (error) throw error

      const result = data as { success: boolean; error?: string; requester_id?: string }
      if (!result?.success) throw new Error(result?.error || 'Could not respond to request')

      if (accept && result.requester_id) {
        await supabase.from('notifications').insert({
          user_id: result.requester_id,
          type: 'connection_accepted',
          title: 'Connection Accepted!',
          message: 'Your connection request has been accepted.',
          metadata: { connection_id: requestId }
        })
        toast({ title: "Connection Accepted", description: "You are now connected! You can start chatting." })
      } else {
        toast({ title: "Request Declined", description: "Connection request has been declined." })
      }

      await Promise.all([fetchConnections(), fetchConnectionRequests()])
      return { success: true }
    } catch (error: any) {
      console.error('Error responding to connection request:', error)
      toast({ title: "Error", description: error.message || "Failed to respond to request", variant: "destructive" })
      return { success: false, error: error.message }
    }
  }

  const checkConnection = async (targetUserId: string): Promise<boolean> => {
    if (!user?.id || user.id === targetUserId) return false

    try {
      const { data, error } = await supabase
        .from('connections')
        .select('id')
        .or(`and(user1_id.eq.${user.id},user2_id.eq.${targetUserId}),and(user1_id.eq.${targetUserId},user2_id.eq.${user.id})`)
        .maybeSingle()

      if (error && error.code !== 'PGRST116') throw error
      return !!data
    } catch (error) {
      console.error('Error checking connection:', error)
      return false
    }
  }

  const getSuggestedUsers = async () => {
    if (!user?.id) return []

    try {
      // Get users not connected to current user
      const { data: allUsers } = await supabase
        .from('profiles')
        .select('user_id, full_name, profession, profile_picture_url, state_name, lga_name')
        .neq('user_id', user.id)
        .limit(20)

      if (!allUsers) return []

      // Get existing connections
      const { data: connections } = await supabase
        .from('connections')
        .select('user1_id, user2_id')
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)

      const connectedUserIds = new Set(
        connections?.flatMap(conn => 
          [conn.user1_id, conn.user2_id].filter(id => id !== user.id)
        ) || []
      )

      // Filter out connected users
      return allUsers.filter(u => !connectedUserIds.has(u.user_id))
    } catch (error) {
      console.error('Error getting suggested users:', error)
      return []
    }
  }

  const checkPendingRequest = async (targetUserId: string): Promise<boolean> => {
    if (!user?.id) return false
    
    try {
      const { data } = await supabase
        .from('connection_requests')
        .select('id')
        .eq('requester_id', user.id)
        .eq('requested_id', targetUserId)
        .eq('status', 'pending')
        .maybeSingle()
      
      return !!data
    } catch (error) {
      console.error('Error checking pending request:', error)
      return false
    }
  }

  // Auto-fetch data on mount and when user changes
  useEffect(() => {
    if (user?.id) {
      fetchConnectionRequests()
      fetchConnections()
    }
  }, [user?.id])

  return {
    connectionRequests,
    connections,
    loading,
    sendConnectionRequest,
    respondToConnectionRequest,
    checkConnection,
    checkPendingRequest,
    getSuggestedUsers,
    refetch: () => {
      fetchConnectionRequests()
      fetchConnections()
    },
    fetchConnectionRequests,
    fetchConnections
  }
}
