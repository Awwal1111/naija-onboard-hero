import React, { useEffect, useState } from 'react'
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
import { Phone, PhoneOff, Video } from 'lucide-react'

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
}

const IncomingCallDialog: React.FC<IncomingCallDialogProps> = ({ onAnswer, onReject }) => {
  const { user } = useAuth()
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null)
  const [ringtone] = useState(() => {
    const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBCuFzfLaizsIGGS56+OYSg==')
    audio.loop = true
    return audio
  })

  useEffect(() => {
    if (!user) return

    // Listen for incoming calls via Supabase Realtime
    const channels: any[] = []

    // Subscribe to potential incoming calls
    const setupCallListener = async () => {
      // Get list of users who might call (connections, etc.)
      // For now, we'll use a wildcard approach
      const channel = supabase
        .channel(`incoming-calls-${user.id}`)
        .on('broadcast', { event: 'offer' }, async ({ payload }: any) => {
          if (payload.to === user.id) {
            console.log('Incoming call offer:', payload)
            
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
            ringtone.play().catch(console.error)
          }
        })
        .subscribe()

      channels.push(channel)
    }

    setupCallListener()

    return () => {
      channels.forEach(channel => supabase.removeChannel(channel))
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
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default IncomingCallDialog
