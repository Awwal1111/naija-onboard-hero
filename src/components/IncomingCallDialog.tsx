import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useWebRTCContext } from '@/contexts/WebRTCContext'
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

/**
 * IncomingCallDialog - Uses WebRTCContext for all incoming call handling
 * The context manages the actual WebRTC signaling and state
 */
const IncomingCallDialog: React.FC = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  
  const {
    incomingCall,
    answerCall,
    rejectCall,
    dismissIncomingCall
  } = useWebRTCContext()

  const handleAnswer = () => {
    answerCall()
  }

  const handleReject = () => {
    rejectCall()
  }

  const goToCallHistory = () => {
    rejectCall()
    navigate('/call-history')
  }

  // Don't render if no user or no incoming call
  if (!user || !incomingCall) return null

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
