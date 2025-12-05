import React, { useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useWebRTCContext } from '@/contexts/WebRTCContext'
import IncomingCallDialog from '@/components/IncomingCallDialog'
import ActiveCallInterface from '@/components/ActiveCallInterface'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/integrations/supabase/client'

/**
 * GlobalCallManager - Manages incoming calls across the entire app
 * This component should be placed at the app level to handle calls from any page
 * Active calls are handled by individual chat pages
 */
const GlobalCallManager = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  
  const {
    callState,
    localStream,
    remoteStream,
    screenStream,
    isMuted,
    isVideoOff,
    isScreenSharing,
    answerCall,
    rejectCall,
    endCall,
    toggleMute,
    toggleVideo,
    switchToAudioOnly,
    startScreenShare,
    stopScreenShare,
    canScreenShare
  } = useWebRTCContext()

  const [remoteUserName, setRemoteUserName] = React.useState<string>('User')
  const [remoteUserAvatar, setRemoteUserAvatar] = React.useState<string | undefined>(undefined)

  // Fetch remote user details when in call
  useEffect(() => {
    if (callState.remoteUserId) {
      supabase
        .from('profiles')
        .select('full_name, profile_picture_url')
        .eq('user_id', callState.remoteUserId)
        .single()
        .then(({ data }) => {
          if (data) {
            setRemoteUserName(data.full_name || 'User')
            setRemoteUserAvatar(data.profile_picture_url || undefined)
          }
        })
    }
  }, [callState.remoteUserId])

  // Don't render anything if not authenticated
  if (!user) return null

  // Check if we're on a chat page - if so, let the chat page handle the call UI
  const isOnChatPage = location.pathname.includes('/chat/') || 
                       location.pathname.includes('/enhanced-chat/')

  // If in call and NOT on a chat page, show the active call interface
  if (callState.isInCall && !isOnChatPage) {
    return (
      <ActiveCallInterface
        localStream={localStream}
        remoteStream={remoteStream}
        screenStream={screenStream}
        callType={callState.callType!}
        isMuted={isMuted}
        isVideoOff={isVideoOff}
        isScreenSharing={isScreenSharing}
        remoteUserName={remoteUserName}
        remoteUserAvatar={remoteUserAvatar}
        onEndCall={endCall}
        onToggleMute={toggleMute}
        onToggleVideo={toggleVideo}
        onSwitchToAudioOnly={switchToAudioOnly}
        onStartScreenShare={canScreenShare ? startScreenShare : undefined}
        onStopScreenShare={stopScreenShare}
        callStatus={callState.status}
      />
    )
  }

  // Always show incoming call dialog (it only shows when there's an incoming call)
  return <IncomingCallDialog />
}

export default GlobalCallManager
