import React, { useEffect, useState } from 'react'
import { Phone, Video, PhoneIncoming, PhoneOutgoing, PhoneMissed, Clock } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { Card } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { formatDistanceToNow } from 'date-fns'

interface CallRecord {
  id: string
  caller_id: string
  receiver_id: string
  call_type: 'voice' | 'video'
  status: string
  duration_seconds: number | null
  created_at: string
  ended_at: string | null
  caller?: {
    full_name: string
    profile_picture_url: string | null
  }
  receiver?: {
    full_name: string
    profile_picture_url: string | null
  }
}

const CallHistory: React.FC = () => {
  const { user } = useAuth()
  const [calls, setCalls] = useState<CallRecord[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return

    const fetchCallHistory = async () => {
      try {
        const { data: callData, error } = await supabase
          .from('call_history')
          .select('*')
          .or(`caller_id.eq.${user.id},receiver_id.eq.${user.id}`)
          .order('created_at', { ascending: false })
          .limit(50)

        if (error) {
          console.error('Error fetching call history:', error)
          setLoading(false)
          return
        }

        if (!callData || callData.length === 0) {
          setCalls([])
          setLoading(false)
          return
        }

        // Fetch user profiles separately
        const userIds = Array.from(new Set<string>(
          callData.flatMap(call => [call.caller_id, call.receiver_id])
        ))

        const { data: profiles, error: profileError } = await supabase
          .from('profiles')
          .select('id, full_name, profile_picture_url')
          .in('id', userIds)

        if (profileError) {
          console.error('Error fetching profiles:', profileError)
        }

        // Map profiles to calls
        const profileMap = new Map((profiles || []).map(p => [p.id, p]))
        
        const enrichedCalls = callData.map(call => ({
          ...call,
          call_type: call.call_type as 'voice' | 'video',
          caller: profileMap.get(call.caller_id) || { 
            full_name: 'Unknown User', 
            profile_picture_url: null 
          },
          receiver: profileMap.get(call.receiver_id) || { 
            full_name: 'Unknown User', 
            profile_picture_url: null 
          }
        }))

        setCalls(enrichedCalls)
        setLoading(false)
      } catch (err) {
        console.error('Exception in fetchCallHistory:', err)
        setLoading(false)
      }
    }

    fetchCallHistory()

    // Subscribe to real-time updates
    const channel = supabase
      .channel('call_history_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'call_history',
          filter: `caller_id=eq.${user.id}`
        },
        () => {
          fetchCallHistory()
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'call_history',
          filter: `receiver_id=eq.${user.id}`
        },
        () => {
          fetchCallHistory()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user])

  const formatDuration = (seconds: number | null): string => {
    if (!seconds) return '0:00'
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const getCallIcon = (call: CallRecord) => {
    const isOutgoing = call.caller_id === user?.id
    const isMissed = call.status === 'rejected' || 
                     (call.status === 'initiated' && call.duration_seconds === null)
    
    if (isMissed) {
      return <PhoneMissed className="h-4 w-4 text-destructive" />
    }
    
    if (call.call_type === 'video') {
      return <Video className="h-4 w-4 text-primary" />
    }
    
    return isOutgoing 
      ? <PhoneOutgoing className="h-4 w-4 text-green-500" />
      : <PhoneIncoming className="h-4 w-4 text-blue-500" />
  }

  const getCallStatus = (call: CallRecord): string => {
    const isOutgoing = call.caller_id === user?.id
    
    switch (call.status) {
      case 'ended':
        return isOutgoing ? 'Outgoing' : 'Incoming'
      case 'rejected':
        return isOutgoing ? 'Declined' : 'Missed'
      case 'initiated':
        return 'Missed'
      default:
        return call.status
    }
  }

  const getOtherUser = (call: CallRecord) => {
    return call.caller_id === user?.id ? call.receiver : call.caller
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin w-6 h-6 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    )
  }

  if (calls.length === 0) {
    return (
      <div className="text-center py-12">
        <Phone className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground">No call history yet</p>
        <p className="text-sm text-muted-foreground mt-1">
          Your voice and video calls will appear here
        </p>
      </div>
    )
  }

  return (
    <ScrollArea className="h-full">
      <div className="space-y-2 p-4">
        {calls.map((call) => {
          const otherUser = getOtherUser(call)
          const isMissed = call.status === 'rejected' || 
                          (call.status === 'initiated' && call.duration_seconds === null)
          
          return (
            <Card
              key={call.id}
              className={`p-4 hover:bg-accent/50 transition-colors ${
                isMissed ? 'border-destructive/20' : ''
              }`}
            >
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={otherUser?.profile_picture_url || undefined} />
                  <AvatarFallback>
                    {otherUser?.full_name?.charAt(0) || 'U'}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-medium truncate">
                      {otherUser?.full_name || 'Unknown User'}
                    </h3>
                    {getCallIcon(call)}
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>{getCallStatus(call)}</span>
                    {call.duration_seconds !== null && (
                      <>
                        <span>•</span>
                        <Clock className="h-3 w-3" />
                        <span>{formatDuration(call.duration_seconds)}</span>
                      </>
                    )}
                  </div>
                </div>
                
                <div className="text-xs text-muted-foreground text-right">
                  {formatDistanceToNow(new Date(call.created_at), { addSuffix: true })}
                </div>
              </div>
            </Card>
          )
        })}
      </div>
    </ScrollArea>
  )
}

export default CallHistory
