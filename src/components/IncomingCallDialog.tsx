import React, { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Phone, PhoneOff, Video, History } from 'lucide-react'

interface IncomingCall {
  callId: string
  callerId: string
  callerName: string
  callerAvatar?: string
  callType: 'voice' | 'video'
  offer: RTCSessionDescriptionInit
}

interface IncomingCallDialogProps {
  onAnswer: (offer: RTCSessionDescriptionInit, callerId: string, callId: string, callType: 'voice' | 'video') => void
  onReject: (callerId: string, callId: string) => void
  isInCall?: boolean
}

const IncomingCallDialog: React.FC<IncomingCallDialogProps> = ({ onAnswer, onReject, isInCall = false }) => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null)
  const isInCallRef = useRef(isInCall)
  
  // Keep ref in sync with prop
  useEffect(() => {
    isInCallRef.current = isInCall
  }, [isInCall])

  const [ringtone] = useState(() => {
    const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBCuFzfLaizsIGGS56+OYSg==')
    audio.loop = true
    return audio
  })

  useEffect(() => {
    if (!user) return

    console.log('Setting up incoming call listener for user:', user.id)

    // Listen for incoming calls via Supabase Realtime
    const channel = supabase
      .channel(`user-${user.id}-calls`)
      .on('broadcast', { event: 'offer' }, async ({ payload }: any) => {
        if (payload.to === user.id) {
          console.log('Incoming call offer received:', payload.callType, 'from', payload.from)
          
          // If already in a call, auto-reject using ref for immediate value
          if (isInCallRef.current) {
            console.log('Auto-rejecting call - already in call')
            const rejectChannel = supabase.channel(`call-${payload.callId}`)
            await rejectChannel.subscribe()
            rejectChannel.send({
              type: 'broadcast',
              event: 'call-rejected',
              payload: {
                from: user.id,
                to: payload.from,
                reason: 'busy'
              }
            })
            // Update call status
            await supabase
              .from('call_history')
              .update({ status: 'rejected', ended_at: new Date().toISOString() })
              .eq('id', payload.callId)
            setTimeout(() => supabase.removeChannel(rejectChannel), 1000)
            return
          }
          
          // Fetch caller profile
          const { data: callerProfile } = await supabase
            .from('profiles')
            .select('full_name, profile_picture_url')
            .eq('user_id', payload.from)
            .single()

          setIncomingCall({
            callId: payload.callId,
            callerId: payload.from,
            callerName: callerProfile?.full_name || 'Unknown',
            callerAvatar: callerProfile?.profile_picture_url,
            callType: payload.callType,
            offer: payload.offer
          })

          // Play ringtone
          ringtone.play().catch(err => console.error('Ringtone play error:', err))
        }
      })
      .subscribe((status) => {
        console.log('Incoming call channel status:', status)
      })

    return () => {
      supabase.removeChannel(channel)
      ringtone.pause()
      ringtone.currentTime = 0
    }
  }, [user, ringtone])

  const handleAnswer = () => {
    if (incomingCall) {
      ringtone.pause()
      ringtone.currentTime = 0
      onAnswer(incomingCall.offer, incomingCall.callerId, incomingCall.callId, incomingCall.callType)
      setIncomingCall(null)
    }
  }

  const handleReject = () => {
    if (incomingCall) {
      ringtone.pause()
      ringtone.currentTime = 0
      onReject(incomingCall.callerId, incomingCall.callId)
      setIncomingCall(null)
    }
  }

  const goToCallHistory = () => {
    ringtone.pause()
    ringtone.currentTime = 0
    if (incomingCall) {
      onReject(incomingCall.callerId, incomingCall.callId)
    }
    setIncomingCall(null)
    navigate('/call-history')
  }

  return (
    <Dialog open={!!incomingCall} onOpenChange={(open) => {
      if (!open && incomingCall) {
        handleReject()
      }
    }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">
            {incomingCall?.callType === 'video' ? 'Incoming Video Call' : 'Incoming Voice Call'}
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex flex-col items-center gap-6 py-6">
          <Avatar className="h-24 w-24">
            <AvatarImage src={incomingCall?.callerAvatar} />
            <AvatarFallback className="text-2xl">
              {incomingCall?.callerName.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          
          <div className="text-center">
            <h3 className="text-xl font-semibold">{incomingCall?.callerName}</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {incomingCall?.callType === 'video' ? 'wants to video call' : 'is calling...'}
            </p>
          </div>

          <div className="flex gap-4">
            <Button
              size="lg"
              variant="destructive"
              className="rounded-full h-16 w-16"
              onClick={handleReject}
            >
              <PhoneOff className="h-6 w-6" />
            </Button>
            
            <Button
              size="lg"
              className="rounded-full h-16 w-16 bg-green-500 hover:bg-green-600"
              onClick={handleAnswer}
            >
              {incomingCall?.callType === 'video' ? (
                <Video className="h-6 w-6" />
              ) : (
                <Phone className="h-6 w-6" />
              )}
            </Button>
          </div>

          {/* Call History Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={goToCallHistory}
            className="text-muted-foreground"
          >
            <History className="h-4 w-4 mr-2" />
            View Call History
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default IncomingCallDialog
