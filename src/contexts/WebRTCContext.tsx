import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/use-toast'

// ICE servers configuration with STUN servers for NAT traversal
const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
  ],
  iceCandidatePoolSize: 10
}

// Call timeout in milliseconds (30 seconds)
const CALL_TIMEOUT = 30000

interface CallState {
  isInCall: boolean
  callType: 'voice' | 'video' | null
  isCaller: boolean
  remoteUserId: string | null
  callId: string | null
  status: 'idle' | 'calling' | 'ringing' | 'connected' | 'ending'
}

interface IncomingCall {
  callId: string
  callerId: string
  callerName: string
  callerAvatar?: string
  callType: 'voice' | 'video'
  offer: RTCSessionDescriptionInit
}

interface WebRTCContextType {
  callState: CallState
  localStream: MediaStream | null
  remoteStream: MediaStream | null
  screenStream: MediaStream | null
  isMuted: boolean
  isVideoOff: boolean
  isScreenSharing: boolean
  incomingCall: IncomingCall | null
  startCall: (remoteUserId: string, callType: 'voice' | 'video') => Promise<void>
  answerCall: () => Promise<void>
  rejectCall: () => void
  endCall: () => Promise<void>
  toggleMute: () => void
  toggleVideo: () => void
  switchToAudioOnly: () => void
  startScreenShare: () => Promise<void>
  stopScreenShare: () => Promise<void>
  dismissIncomingCall: () => void
  canScreenShare: boolean
}

const WebRTCContext = createContext<WebRTCContextType | null>(null)

export const useWebRTCContext = () => {
  const context = useContext(WebRTCContext)
  if (!context) {
    throw new Error('useWebRTCContext must be used within WebRTCProvider')
  }
  return context
}

export const WebRTCProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth()
  const { toast } = useToast()
  
  const [callState, setCallState] = useState<CallState>({
    isInCall: false,
    callType: null,
    isCaller: false,
    remoteUserId: null,
    callId: null,
    status: 'idle'
  })
  
  const [localStream, setLocalStream] = useState<MediaStream | null>(null)
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null)
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null)
  const [isMuted, setIsMuted] = useState(false)
  const [isVideoOff, setIsVideoOff] = useState(false)
  const [isScreenSharing, setIsScreenSharing] = useState(false)
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null)
  
  // Check if screen sharing is available
  const canScreenShare = typeof navigator !== 'undefined' && 
    navigator.mediaDevices && 
    typeof navigator.mediaDevices.getDisplayMedia === 'function'
  
  const peerConnection = useRef<RTCPeerConnection | null>(null)
  const signalingChannel = useRef<any>(null)
  const incomingCallChannel = useRef<any>(null)
  const callStartTime = useRef<Date | null>(null)
  const originalVideoTrack = useRef<MediaStreamTrack | null>(null)
  const callTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const pendingCandidates = useRef<RTCIceCandidate[]>([])
  const isInCallRef = useRef(false)
  const ringtone = useRef<HTMLAudioElement | null>(null)

  // Keep ref in sync with state
  useEffect(() => {
    isInCallRef.current = callState.isInCall
  }, [callState.isInCall])

  // Initialize ringtone
  useEffect(() => {
    ringtone.current = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBCuFzfLaizsIGGS56+OYSg==')
    ringtone.current.loop = true
    
    return () => {
      ringtone.current?.pause()
    }
  }, [])

  // Clear call timeout
  const clearCallTimeout = () => {
    if (callTimeoutRef.current) {
      clearTimeout(callTimeoutRef.current)
      callTimeoutRef.current = null
    }
  }

  // Stop ringtone
  const stopRingtone = () => {
    if (ringtone.current) {
      ringtone.current.pause()
      ringtone.current.currentTime = 0
    }
  }

  // Initialize peer connection
  const initializePeerConnection = useCallback((remoteUserId: string) => {
    console.log('Initializing peer connection...')
    
    if (peerConnection.current) {
      peerConnection.current.close()
    }

    peerConnection.current = new RTCPeerConnection(ICE_SERVERS)
    pendingCandidates.current = []

    // Handle ICE candidates
    peerConnection.current.onicecandidate = (event) => {
      if (event.candidate && signalingChannel.current) {
        console.log('Sending ICE candidate')
        signalingChannel.current.send({
          type: 'broadcast',
          event: 'ice-candidate',
          payload: {
            candidate: event.candidate.toJSON(),
            from: user?.id,
            to: remoteUserId
          }
        })
      }
    }

    // Handle remote stream
    peerConnection.current.ontrack = (event) => {
      console.log('Received remote track:', event.track.kind, 'enabled:', event.track.enabled)
      
      if (event.streams && event.streams[0]) {
        console.log('Setting remote stream')
        setRemoteStream(event.streams[0])
      } else {
        setRemoteStream(prev => {
          const newStream = prev || new MediaStream()
          newStream.addTrack(event.track)
          return newStream
        })
      }
    }

    // Handle connection state changes
    peerConnection.current.onconnectionstatechange = () => {
      const state = peerConnection.current?.connectionState
      console.log('Connection state:', state)
      
      if (state === 'connected') {
        clearCallTimeout()
        setCallState(prev => ({ ...prev, status: 'connected' }))
        callStartTime.current = new Date()
        toast({
          title: "Call Connected",
          description: "You are now connected"
        })
      } else if (state === 'disconnected') {
        toast({
          title: "Connection Lost",
          description: "Trying to reconnect...",
          variant: "destructive"
        })
      } else if (state === 'failed') {
        toast({
          title: "Call Failed",
          description: "Connection could not be established",
          variant: "destructive"
        })
        endCall()
      }
    }

    // Handle ICE connection state
    peerConnection.current.oniceconnectionstatechange = () => {
      console.log('ICE connection state:', peerConnection.current?.iceConnectionState)
    }

    // Handle negotiation needed (for screen sharing renegotiation)
    peerConnection.current.onnegotiationneeded = async () => {
      console.log('Negotiation needed')
      if (peerConnection.current?.connectionState === 'connected' && signalingChannel.current) {
        try {
          const offer = await peerConnection.current.createOffer()
          await peerConnection.current.setLocalDescription(offer)
          
          signalingChannel.current.send({
            type: 'broadcast',
            event: 'renegotiate-offer',
            payload: {
              offer: peerConnection.current.localDescription,
              from: user?.id,
              to: remoteUserId
            }
          })
        } catch (err) {
          console.error('Renegotiation error:', err)
        }
      }
    }
  }, [user?.id, toast])

  // Get media stream
  const getMediaStream = async (callType: 'voice' | 'video'): Promise<MediaStream | null> => {
    try {
      console.log('Requesting media for:', callType)
      const constraints: MediaStreamConstraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        },
        video: callType === 'video' ? {
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 },
          facingMode: 'user',
          frameRate: { ideal: 30 }
        } : false
      }
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      console.log('Got media stream:', stream.getTracks().map(t => `${t.kind}:${t.enabled}`))
      return stream
    } catch (error: any) {
      console.error('Media error:', error)
      
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        toast({
          title: "Permission Denied",
          description: "Please allow camera/microphone access in your browser settings",
          variant: "destructive"
        })
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        toast({
          title: "Device Not Found",
          description: "No camera or microphone found on your device",
          variant: "destructive"
        })
      } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
        toast({
          title: "Device Busy",
          description: "Your camera or microphone is being used by another app",
          variant: "destructive"
        })
      } else {
        toast({
          title: "Media Error",
          description: error.message || "Failed to access media devices",
          variant: "destructive"
        })
      }
      return null
    }
  }

  // Add ICE candidate with queueing
  const addIceCandidate = async (candidate: RTCIceCandidateInit) => {
    if (!peerConnection.current) return
    
    try {
      if (peerConnection.current.remoteDescription) {
        await peerConnection.current.addIceCandidate(new RTCIceCandidate(candidate))
        console.log('Added ICE candidate')
      } else {
        console.log('Queueing ICE candidate')
        pendingCandidates.current.push(new RTCIceCandidate(candidate))
      }
    } catch (err) {
      console.error('Error adding ICE candidate:', err)
    }
  }

  // Process queued ICE candidates
  const processPendingCandidates = async () => {
    if (!peerConnection.current) return
    
    console.log('Processing', pendingCandidates.current.length, 'pending candidates')
    for (const candidate of pendingCandidates.current) {
      try {
        await peerConnection.current.addIceCandidate(candidate)
      } catch (err) {
        console.error('Error adding queued candidate:', err)
      }
    }
    pendingCandidates.current = []
  }

  // Listen for incoming calls
  useEffect(() => {
    if (!user) return

    console.log('Setting up incoming call listener for user:', user.id)

    incomingCallChannel.current = supabase
      .channel(`user-${user.id}-calls`)
      .on('broadcast', { event: 'offer' }, async ({ payload }: any) => {
        if (payload.to === user.id) {
          console.log('Incoming call offer received:', payload.callType, 'from', payload.from)
          
          // If already in a call, auto-reject
          if (isInCallRef.current) {
            console.log('Auto-rejecting call - already in call')
            const rejectChannel = supabase.channel(`call-${payload.callId}-reject`)
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
          ringtone.current?.play().catch(err => console.error('Ringtone play error:', err))
        }
      })
      .subscribe((status) => {
        console.log('Incoming call channel status:', status)
      })

    return () => {
      if (incomingCallChannel.current) {
        supabase.removeChannel(incomingCallChannel.current)
      }
      stopRingtone()
    }
  }, [user])

  // Start a call
  const startCall = async (remoteUserId: string, callType: 'voice' | 'video') => {
    if (!user) {
      toast({
        title: "Not Logged In",
        description: "Please log in to make calls",
        variant: "destructive"
      })
      return
    }

    if (isInCallRef.current) {
      toast({
        title: "Already in Call",
        description: "Please end your current call first",
        variant: "destructive"
      })
      return
    }

    try {
      console.log('Starting', callType, 'call to', remoteUserId)
      
      const stream = await getMediaStream(callType)
      if (!stream) return
      
      setLocalStream(stream)

      // Create call record
      const { data: callRecord, error } = await supabase
        .from('call_history')
        .insert({
          caller_id: user.id,
          receiver_id: remoteUserId,
          call_type: callType,
          status: 'initiated'
        })
        .select()
        .single()

      if (error) {
        console.error('Call record error:', error)
        toast({
          title: "Call Failed",
          description: "Failed to initiate call. Please try again.",
          variant: "destructive"
        })
        stream.getTracks().forEach(track => track.stop())
        return
      }

      setCallState({
        isInCall: true,
        callType,
        isCaller: true,
        remoteUserId,
        callId: callRecord.id,
        status: 'calling'
      })

      // Set call timeout
      callTimeoutRef.current = setTimeout(() => {
        toast({
          title: "No Answer",
          description: "The user did not answer your call",
          variant: "destructive"
        })
        endCall()
      }, CALL_TIMEOUT)

      // Initialize peer connection
      initializePeerConnection(remoteUserId)

      // Add tracks to peer connection
      stream.getTracks().forEach(track => {
        console.log('Adding local track:', track.kind)
        peerConnection.current?.addTrack(track, stream)
      })

      // Create offer
      const offer = await peerConnection.current!.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: callType === 'video'
      })
      await peerConnection.current!.setLocalDescription(offer)
      console.log('Created offer')

      // Setup signaling channel
      const callChannelName = `call-${callRecord.id}`
      signalingChannel.current = supabase.channel(callChannelName)

      signalingChannel.current
        .on('broadcast', { event: 'answer' }, async ({ payload }: any) => {
          if (payload.to === user.id && payload.answer) {
            console.log('Received answer')
            clearCallTimeout()
            try {
              await peerConnection.current?.setRemoteDescription(
                new RTCSessionDescription(payload.answer)
              )
              await processPendingCandidates()
            } catch (err) {
              console.error('Error setting remote description:', err)
            }
          }
        })
        .on('broadcast', { event: 'ice-candidate' }, async ({ payload }: any) => {
          if (payload.to === user.id && payload.candidate) {
            await addIceCandidate(payload.candidate)
          }
        })
        .on('broadcast', { event: 'renegotiate-answer' }, async ({ payload }: any) => {
          if (payload.to === user.id && payload.answer) {
            console.log('Received renegotiate answer')
            try {
              await peerConnection.current?.setRemoteDescription(
                new RTCSessionDescription(payload.answer)
              )
            } catch (err) {
              console.error('Error setting renegotiate answer:', err)
            }
          }
        })
        .on('broadcast', { event: 'call-rejected' }, ({ payload }: any) => {
          if (payload.to === user.id) {
            clearCallTimeout()
            const reason = payload.reason === 'busy' ? 'The user is busy on another call' : 'The user declined your call'
            toast({
              title: "Call Declined",
              description: reason
            })
            endCall()
          }
        })
        .on('broadcast', { event: 'call-ended' }, ({ payload }: any) => {
          if (payload.to === user.id) {
            clearCallTimeout()
            toast({
              title: "Call Ended",
              description: "The other user ended the call"
            })
            endCall()
          }
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            console.log('Subscribed to call channel')
            
            // Send offer to receiver's channel
            const receiverChannelName = `user-${remoteUserId}-calls`
            const receiverChannel = supabase.channel(receiverChannelName)
            await receiverChannel.subscribe()
            
            // Small delay to ensure channel is ready
            await new Promise(resolve => setTimeout(resolve, 500))
            
            console.log('Sending offer to receiver')
            receiverChannel.send({
              type: 'broadcast',
              event: 'offer',
              payload: {
                offer: peerConnection.current?.localDescription,
                from: user.id,
                to: remoteUserId,
                callType,
                callId: callRecord.id
              }
            })

            // Update call status
            await supabase
              .from('call_history')
              .update({ status: 'ringing' })
              .eq('id', callRecord.id)
            
            setCallState(prev => ({ ...prev, status: 'ringing' }))
            
            // Clean up receiver channel
            setTimeout(() => {
              supabase.removeChannel(receiverChannel)
            }, 2000)
          }
        })

    } catch (error: any) {
      console.error('Error starting call:', error)
      clearCallTimeout()
      toast({
        title: "Call Failed",
        description: error.message || "Failed to start call",
        variant: "destructive"
      })
      endCall()
    }
  }

  // Answer incoming call
  const answerCall = async () => {
    if (!user || !incomingCall) return

    if (isInCallRef.current) {
      toast({
        title: "Already in Call",
        description: "You're already in another call",
        variant: "destructive"
      })
      rejectCall()
      return
    }

    try {
      const { callId, callerId, callType, offer } = incomingCall
      console.log('Answering', callType, 'call from', callerId)
      
      stopRingtone()
      
      const stream = await getMediaStream(callType)
      if (!stream) {
        rejectCall()
        return
      }
      
      setLocalStream(stream)
      setIncomingCall(null)

      setCallState({
        isInCall: true,
        callType,
        isCaller: false,
        remoteUserId: callerId,
        callId,
        status: 'connected'
      })

      // Initialize peer connection
      initializePeerConnection(callerId)

      // Add tracks BEFORE setting remote description
      stream.getTracks().forEach(track => {
        console.log('Adding local track:', track.kind)
        peerConnection.current?.addTrack(track, stream)
      })

      // Set remote description (the offer)
      await peerConnection.current!.setRemoteDescription(new RTCSessionDescription(offer))
      console.log('Set remote description (offer)')

      // Process any queued ICE candidates
      await processPendingCandidates()

      // Create answer
      const answer = await peerConnection.current!.createAnswer()
      await peerConnection.current!.setLocalDescription(answer)
      console.log('Created answer')

      // Setup signaling channel
      const channelName = `call-${callId}`
      signalingChannel.current = supabase.channel(channelName)

      signalingChannel.current
        .on('broadcast', { event: 'ice-candidate' }, async ({ payload }: any) => {
          if (payload.to === user.id && payload.candidate) {
            await addIceCandidate(payload.candidate)
          }
        })
        .on('broadcast', { event: 'renegotiate-offer' }, async ({ payload }: any) => {
          if (payload.to === user.id && payload.offer) {
            console.log('Received renegotiate offer')
            try {
              await peerConnection.current?.setRemoteDescription(
                new RTCSessionDescription(payload.offer)
              )
              const newAnswer = await peerConnection.current!.createAnswer()
              await peerConnection.current!.setLocalDescription(newAnswer)
              
              signalingChannel.current.send({
                type: 'broadcast',
                event: 'renegotiate-answer',
                payload: {
                  answer: peerConnection.current?.localDescription,
                  from: user.id,
                  to: callerId
                }
              })
            } catch (err) {
              console.error('Error handling renegotiation:', err)
            }
          }
        })
        .on('broadcast', { event: 'call-ended' }, ({ payload }: any) => {
          if (payload.to === user.id) {
            toast({
              title: "Call Ended",
              description: "The other user ended the call"
            })
            endCall()
          }
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            console.log('Subscribed to signaling channel, sending answer')
            
            // Small delay to ensure channel is ready
            await new Promise(resolve => setTimeout(resolve, 300))
            
            // Send answer
            signalingChannel.current.send({
              type: 'broadcast',
              event: 'answer',
              payload: {
                answer: peerConnection.current?.localDescription,
                from: user.id,
                to: callerId
              }
            })

            // Update call status
            await supabase
              .from('call_history')
              .update({ status: 'accepted', started_at: new Date().toISOString() })
              .eq('id', callId)

            callStartTime.current = new Date()
          }
        })

    } catch (error: any) {
      console.error('Error answering call:', error)
      toast({
        title: "Call Failed",
        description: error.message || "Failed to answer call",
        variant: "destructive"
      })
      rejectCall()
    }
  }

  // Reject incoming call
  const rejectCall = () => {
    if (!user || !incomingCall) return
    
    const { callId, callerId } = incomingCall
    console.log('Rejecting call:', callId)
    
    stopRingtone()
    setIncomingCall(null)

    const channelName = `call-${callId}`
    const channel = supabase.channel(channelName)

    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        channel.send({
          type: 'broadcast',
          event: 'call-rejected',
          payload: {
            from: user.id,
            to: callerId
          }
        })

        supabase
          .from('call_history')
          .update({ 
            status: 'rejected',
            ended_at: new Date().toISOString()
          })
          .eq('id', callId)
          .then(() => {
            setTimeout(() => {
              supabase.removeChannel(channel)
            }, 1000)
          })
      }
    })
  }

  // Dismiss incoming call (without rejecting - just close dialog)
  const dismissIncomingCall = () => {
    stopRingtone()
    setIncomingCall(null)
  }

  // Start screen sharing
  const startScreenShare = async () => {
    if (!peerConnection.current) {
      toast({
        title: "Cannot Share Screen",
        description: "No active call to share screen on",
        variant: "destructive"
      })
      return
    }

    if (callState.callType === 'voice') {
      toast({
        title: "Cannot Share Screen",
        description: "Screen sharing is only available for video calls",
        variant: "destructive"
      })
      return
    }

    // Check if screen sharing is supported
    if (!canScreenShare) {
      toast({
        title: "Screen Sharing Not Available",
        description: "Your browser or device doesn't support screen sharing. Try using Chrome or Edge on desktop.",
        variant: "destructive"
      })
      return
    }

    try {
      console.log('Starting screen share')
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: { ideal: 30 }
        },
        audio: false
      })

      setScreenStream(stream)
      setIsScreenSharing(true)

      const screenTrack = stream.getVideoTracks()[0]
      
      const senders = peerConnection.current.getSenders()
      const videoSender = senders.find(sender => sender.track?.kind === 'video')
      
      if (videoSender && localStream) {
        originalVideoTrack.current = localStream.getVideoTracks()[0] || null
        await videoSender.replaceTrack(screenTrack)
        console.log('Replaced video track with screen share')
      } else {
        console.log('No video sender found, adding screen track')
        peerConnection.current.addTrack(screenTrack, stream)
      }

      // Handle when user stops sharing via browser UI
      screenTrack.onended = () => {
        console.log('Screen share ended by browser UI')
        stopScreenShare()
      }

      toast({
        title: "Screen Sharing Started",
        description: "You are now sharing your screen"
      })
    } catch (error: any) {
      console.error('Screen share error:', error)
      
      if (error.name === 'NotAllowedError') {
        toast({
          title: "Cancelled",
          description: "Screen sharing was cancelled"
        })
      } else {
        toast({
          title: "Screen Share Failed",
          description: error.message || "Failed to start screen sharing",
          variant: "destructive"
        })
      }
    }
  }

  // Stop screen sharing
  const stopScreenShare = async () => {
    if (!screenStream || !peerConnection.current) return
    console.log('Stopping screen share')

    try {
      screenStream.getTracks().forEach(track => track.stop())
      setScreenStream(null)
      setIsScreenSharing(false)

      if (originalVideoTrack.current) {
        const senders = peerConnection.current.getSenders()
        const videoSender = senders.find(sender => sender.track?.kind === 'video')
        
        if (videoSender) {
          await videoSender.replaceTrack(originalVideoTrack.current)
          console.log('Restored original video track')
        }
        originalVideoTrack.current = null
      }

      toast({
        title: "Screen Sharing Stopped",
        description: "Returned to camera view"
      })
    } catch (error) {
      console.error('Error stopping screen share:', error)
    }
  }

  // End call
  const endCall = useCallback(async () => {
    console.log('Ending call')
    clearCallTimeout()
    stopRingtone()
    
    // Notify the other party
    if (signalingChannel.current && callState.remoteUserId && user) {
      try {
        signalingChannel.current.send({
          type: 'broadcast',
          event: 'call-ended',
          payload: {
            from: user.id,
            to: callState.remoteUserId
          }
        })
      } catch (err) {
        console.error('Error sending call-ended:', err)
      }
    }

    // Stop all tracks
    localStream?.getTracks().forEach(track => {
      track.stop()
      console.log('Stopped local track:', track.kind)
    })
    remoteStream?.getTracks().forEach(track => {
      track.stop()
      console.log('Stopped remote track:', track.kind)
    })
    screenStream?.getTracks().forEach(track => {
      track.stop()
      console.log('Stopped screen track:', track.kind)
    })

    // Close peer connection
    if (peerConnection.current) {
      peerConnection.current.close()
      peerConnection.current = null
    }

    // Remove signaling channel
    if (signalingChannel.current) {
      try {
        await supabase.removeChannel(signalingChannel.current)
      } catch (err) {
        console.error('Error removing channel:', err)
      }
      signalingChannel.current = null
    }

    // Update call record
    if (callState.callId && callStartTime.current) {
      const endTime = new Date()
      const duration = Math.floor((endTime.getTime() - callStartTime.current.getTime()) / 1000)
      
      await supabase
        .from('call_history')
        .update({ 
          status: 'ended',
          ended_at: endTime.toISOString(),
          duration_seconds: duration
        })
        .eq('id', callState.callId)
    } else if (callState.callId) {
      await supabase
        .from('call_history')
        .update({ 
          status: 'missed',
          ended_at: new Date().toISOString()
        })
        .eq('id', callState.callId)
    }

    // Reset state
    setLocalStream(null)
    setRemoteStream(null)
    setScreenStream(null)
    setIncomingCall(null)
    setCallState({
      isInCall: false,
      callType: null,
      isCaller: false,
      remoteUserId: null,
      callId: null,
      status: 'idle'
    })
    setIsMuted(false)
    setIsVideoOff(false)
    setIsScreenSharing(false)
    callStartTime.current = null
    originalVideoTrack.current = null
    pendingCandidates.current = []
  }, [callState.callId, callState.remoteUserId, localStream, remoteStream, screenStream, user])

  // Toggle mute
  const toggleMute = () => {
    if (localStream) {
      const audioTracks = localStream.getAudioTracks()
      audioTracks.forEach(track => {
        track.enabled = !track.enabled
        console.log('Audio track enabled:', track.enabled)
      })
      setIsMuted(!isMuted)
    }
  }

  // Toggle video
  const toggleVideo = () => {
    if (localStream) {
      const videoTracks = localStream.getVideoTracks()
      videoTracks.forEach(track => {
        track.enabled = !track.enabled
        console.log('Video track enabled:', track.enabled)
      })
      setIsVideoOff(!isVideoOff)
    }
  }

  // Switch to audio only
  const switchToAudioOnly = () => {
    if (localStream && callState.callType === 'video') {
      localStream.getVideoTracks().forEach(track => {
        track.stop()
        localStream.removeTrack(track)
      })
      setCallState(prev => ({ ...prev, callType: 'voice' }))
      setIsVideoOff(true)
    }
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearCallTimeout()
      if (isInCallRef.current) {
        localStream?.getTracks().forEach(track => track.stop())
        remoteStream?.getTracks().forEach(track => track.stop())
        screenStream?.getTracks().forEach(track => track.stop())
        peerConnection.current?.close()
      }
    }
  }, [])

  return (
    <WebRTCContext.Provider value={{
      callState,
      localStream,
      remoteStream,
      screenStream,
      isMuted,
      isVideoOff,
      isScreenSharing,
      incomingCall,
      startCall,
      answerCall,
      rejectCall,
      endCall,
      toggleMute,
      toggleVideo,
      switchToAudioOnly,
      startScreenShare,
      stopScreenShare,
      dismissIncomingCall,
      canScreenShare
    }}>
      {children}
    </WebRTCContext.Provider>
  )
}
