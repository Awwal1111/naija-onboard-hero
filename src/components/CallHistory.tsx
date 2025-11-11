import React, { useEffect, useState } from 'react'
import { Phone, Video, PhoneIncoming, PhoneOutgoing, PhoneMissed, Info } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { formatDistanceToNow, format, isToday, isYesterday } from 'date-fns'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'

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
  const navigate = useNavigate()
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
    if (!seconds) return ''
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const formatCallTime = (date: string): string => {
    const callDate = new Date(date)
    if (isToday(callDate)) {
      return format(callDate, 'HH:mm')
    }
    if (isYesterday(callDate)) {
      return 'Yesterday'
    }
    return format(callDate, 'dd/MM/yyyy')
  }

  const getCallIcon = (call: CallRecord) => {
    const isOutgoing = call.caller_id === user?.id
    const isMissed = call.status === 'rejected' || 
                     (call.status === 'initiated' && call.duration_seconds === null)
    
    if (call.call_type === 'video') {
      return isOutgoing 
        ? <Video className={`h-5 w-5 ${isMissed ? 'text-destructive' : 'text-green-600'}`} />
        : <Video className={`h-5 w-5 ${isMissed ? 'text-destructive' : 'text-green-600'}`} />
    }
    
    if (isMissed) {
      return <PhoneMissed className="h-5 w-5 text-destructive" />
    }
    
    return isOutgoing 
      ? <PhoneOutgoing className="h-5 w-5 text-green-600" />
      : <PhoneIncoming className="h-5 w-5 text-green-600" />
  }

  const handleCallBack = (call: CallRecord) => {
    const otherUserId = call.caller_id === user?.id ? call.receiver_id : call.caller_id
    navigate(`/chat/${otherUserId}`)
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
        <Phone className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
        <p className="text-lg font-medium text-foreground">No calls yet</p>
        <p className="text-sm text-muted-foreground mt-1">
          Your voice and video calls will appear here
        </p>
      </div>
    )
  }

  // Group calls by date
  const groupedCalls: { [key: string]: CallRecord[] } = {}
  calls.forEach(call => {
    const date = new Date(call.created_at)
    let key = format(date, 'yyyy-MM-dd')
    if (isToday(date)) {
      key = 'Today'
    } else if (isYesterday(date)) {
      key = 'Yesterday'
    } else {
      key = format(date, 'EEEE, MMMM d, yyyy')
    }
    
    if (!groupedCalls[key]) {
      groupedCalls[key] = []
    }
    groupedCalls[key].push(call)
  })

  return (
    <ScrollArea className="h-full">
      <div className="divide-y divide-border">
        {Object.entries(groupedCalls).map(([date, dateCalls]) => (
          <div key={date}>
            {/* Date header */}
            <div className="px-4 py-2 bg-muted/30 sticky top-0 z-10">
              <h3 className="text-sm font-semibold text-foreground">{date}</h3>
            </div>
            
            {/* Calls for this date */}
            <div>
              {dateCalls.map((call) => {
                const otherUser = getOtherUser(call)
                const isMissed = call.status === 'rejected' || 
                                (call.status === 'initiated' && call.duration_seconds === null)
                
                return (
                  <div
                    key={call.id}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-accent/30 transition-colors cursor-pointer"
                    onClick={() => handleCallBack(call)}
                  >
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={otherUser?.profile_picture_url || undefined} />
                      <AvatarFallback>
                        {otherUser?.full_name?.charAt(0) || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0">
                      <h3 className={`font-medium truncate ${isMissed ? 'text-destructive' : 'text-foreground'}`}>
                        {otherUser?.full_name || 'Unknown User'}
                      </h3>
                      
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mt-0.5">
                        {getCallIcon(call)}
                        <span className={isMissed ? 'text-destructive' : ''}>
                          {isMissed ? 'Missed' : formatCallTime(call.created_at)}
                        </span>
                        {call.duration_seconds !== null && !isMissed && (
                          <>
                            <span>•</span>
                            <span>{formatDuration(call.duration_seconds)}</span>
                          </>
                        )}
                      </div>
                    </div>
                    
                    <Button
                      variant="ghost"
                      size="icon"
                      className="flex-shrink-0"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleCallBack(call)
                      }}
                    >
                      {call.call_type === 'video' ? (
                        <Video className="h-5 w-5 text-primary" />
                      ) : (
                        <Phone className="h-5 w-5 text-primary" />
                      )}
                    </Button>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  )
}

export default CallHistory
