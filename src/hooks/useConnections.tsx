import { useState } from 'react'
import { useAuth } from './useAuth'
import { useToast } from './use-toast'

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
    
    // Temporarily disabled until database types are updated
    console.log('Fetching connection requests for user:', user.id)
    setLoading(false)
  }

  const fetchConnections = async () => {
    if (!user?.id) return
    
    // Temporarily disabled until database types are updated
    console.log('Fetching connections for user:', user.id)
  }

  const sendConnectionRequest = async (targetUserId: string) => {
    if (!user?.id || user.id === targetUserId) return { error: 'Invalid request' }

    // Temporarily disabled until database types are updated
    console.log('Sending connection request to:', targetUserId)
    
    toast({
      title: "Feature coming soon!",
      description: "User connections will be available soon.",
    })
    
    return { success: true }
  }

  const respondToConnectionRequest = async (requestId: string, accept: boolean) => {
    if (!user?.id) return { error: 'Not authenticated' }

    // Temporarily disabled until database types are updated
    console.log('Responding to connection request:', requestId, accept)
    
    toast({
      title: "Feature coming soon!",
      description: "Connection management will be available soon.",
    })
    
    return { success: true }
  }

  const checkConnection = async (targetUserId: string): Promise<boolean> => {
    if (!user?.id || user.id === targetUserId) return false

    // Temporarily disabled until database types are updated
    console.log('Checking connection with:', targetUserId)
    return false
  }

  const getSuggestedUsers = async () => {
    if (!user?.id) return []

    // Temporarily disabled until database types are updated
    console.log('Getting suggested users for:', user.id)
    return []
  }

  return {
    connectionRequests,
    connections,
    loading,
    sendConnectionRequest,
    respondToConnectionRequest,
    checkConnection,
    getSuggestedUsers,
    refetch: () => {
      fetchConnectionRequests()
      fetchConnections()
    }
  }
}