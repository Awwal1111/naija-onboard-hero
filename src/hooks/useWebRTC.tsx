import { useState, useEffect, useRef, useCallback } from 'react'
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

export const useWebRTC = () => {
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
  
  const peerConnection = useRef<RTCPeerConnection | null>(null)
  const signalingChannel = useRef<any>(null)
  const callStartTime = useRef<Date | null>(null)
  const originalVideoTrack = useRef<MediaStreamTrack | null>(null)
  const callTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const pendingCandidates = useRef<RTCIceCandidate[]>([])
  const isInCallRef = useRef(false) // Ref for immediate access to call state

  // Keep ref in sync with state
  useEffect(() => {
    isInCallRef.current = callState.isInCall
  }, [callState.isInCall])

  // Clear call timeout
  const clearCallTimeout = () => {
    if (callTimeoutRef.current) {
      clearTimeout(callTimeoutRef.current)
      callTimeoutRef.current = null
    }
  }

  // Initialize peer connection with proper event handling
  const initializePeerConnection = useCallback(() => {
    console.log('Initializing peer connection...')
    
    if (peerConnection.current) {
      peerConnection.current.close()
    }

    peerConnection.current = new RTCPeerConnection(ICE_SERVERS)
    pendingCandidates.current = []

    // Handle ICE candidates
    peerConnection.current.onicecandidate = (event) => {
      if (event.candidate && signalingChannel.current) {
        console.log('Sending ICE candidate:', event.candidate.candidate?.substring(0, 50))
        signalingChannel.current.send({
          type: 'broadcast',
          event: 'ice-candidate',
          payload: {
            candidate: event.candidate.toJSON(),
            from: user?.id,
            to: callState.remoteUserId
          }
        })
      }
    }

    // Handle remote stream - CRITICAL for audio
    peerConnection.current.ontrack = (event) => {
      console.log('Received remote track:', event.track.kind, 'enabled:', event.track.enabled)
      
      if (event.streams && event.streams[0]) {
        console.log('Setting remote stream with tracks:', event.streams[0].getTracks().map(t => `${t.kind}:${t.enabled}`))
        setRemoteStream(event.streams[0])
      } else {
        // Fallback: Create a new stream with the track
        console.log('Creating new stream for track')
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
      console.log('Connection state changed:', state)
      
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

    // Handle negotiation needed (for screen sharing)
    peerConnection.current.onnegotiationneeded = async () => {
      console.log('Negotiation needed')
      // Only renegotiate if we're already connected and in a call
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
              to: callState.remoteUserId
            }
          })
        } catch (err) {
          console.error('Renegotiation error:', err)
        }
      }
    }
  }, [user?.id, callState.remoteUserId, toast])

  // Request media permissions with proper error handling
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

  // Add ICE candidate with queueing for proper order
  const addIceCandidate = async (candidate: RTCIceCandidateInit) => {
    if (!peerConnection.current) return
    
    try {
      if (peerConnection.current.remoteDescription) {
        await peerConnection.current.addIceCandidate(new RTCIceCandidate(candidate))
        console.log('Added ICE candidate successfully')
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

    // Check if already in a call using ref for immediate value
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
      
      // Get user media first
      const stream = await getMediaStream(callType)
      if (!stream) return
      
      setLocalStream(stream)

      // Create call record in database
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

      // Set call timeout - end call if no answer
      callTimeoutRef.current = setTimeout(() => {
        toast({
          title: "No Answer",
          description: "The user did not answer your call",
          variant: "destructive"
        })
        endCall()
      }, CALL_TIMEOUT)

      // Initialize peer connection
      initializePeerConnection()

      // Add tracks to peer connection
      stream.getTracks().forEach(track => {
        console.log('Adding local track to peer connection:', track.kind)
        peerConnection.current?.addTrack(track, stream)
      })

      // Create offer
      const offer = await peerConnection.current!.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: callType === 'video'
      })
      await peerConnection.current!.setLocalDescription(offer)
      console.log('Created offer')

      // Setup signaling channels
      const callChannelName = `call-${callRecord.id}`
      const receiverChannelName = `user-${remoteUserId}-calls`
      
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
              // Process any queued ICE candidates
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
            
            // Send offer to receiver's listening channel
            const receiverChannel = supabase.channel(receiverChannelName)
            await receiverChannel.subscribe()
            
            // Delay to ensure channel is ready
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
            
            // Clean up receiver channel after sending
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
  const answerCall = async (offer: RTCSessionDescriptionInit, callerId: string, callId: string, callType: 'voice' | 'video') => {
    if (!user) return

    // Check if already in a call using ref for immediate value
    if (isInCallRef.current) {
      toast({
        title: "Already in Call",
        description: "You're already in another call",
        variant: "destructive"
      })
      // Auto-reject the incoming call
      rejectCall(callerId, callId)
      return
    }

    try {
      console.log('Answering', callType, 'call from', callerId)
      
      // Get user media
      const stream = await getMediaStream(callType)
      if (!stream) {
        rejectCall(callerId, callId)
        return
      }
      
      setLocalStream(stream)

      setCallState({
        isInCall: true,
        callType,
        isCaller: false,
        remoteUserId: callerId,
        callId,
        status: 'connected'
      })

      // Initialize peer connection
      initializePeerConnection()

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
              const answer = await peerConnection.current!.createAnswer()
              await peerConnection.current!.setLocalDescription(answer)
              
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
            
            // Small delay to ensure channel is fully ready
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
      rejectCall(callerId, callId)
    }
  }

  // Reject incoming call
  const rejectCall = async (callerId: string, callId: string) => {
    if (!user) return
    console.log('Rejecting call:', callId)

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

        // Update call status
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
        description: "Screen sharing is only available for video calls. Please start a video call.",
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

      // Get the video track from screen share
      const screenTrack = stream.getVideoTracks()[0]
      
      // Find and replace the video sender
      const senders = peerConnection.current.getSenders()
      const videoSender = senders.find(sender => sender.track?.kind === 'video')
      
      if (videoSender && localStream) {
        // Save original video track
        originalVideoTrack.current = localStream.getVideoTracks()[0] || null
        
        // Replace with screen track
        await videoSender.replaceTrack(screenTrack)
        console.log('Replaced video track with screen share')
      } else {
        console.log('No video sender found, adding screen track')
        // No video sender found - this will trigger renegotiation
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
      // Stop screen stream tracks
      screenStream.getTracks().forEach(track => track.stop())
      setScreenStream(null)
      setIsScreenSharing(false)

      // Restore original video track
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
      // Call never connected
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
        // Stop all tracks
        localStream?.getTracks().forEach(track => track.stop())
        remoteStream?.getTracks().forEach(track => track.stop())
        screenStream?.getTracks().forEach(track => track.stop())
        peerConnection.current?.close()
      }
    }
  }, [])

  return {
    callState,
    localStream,
    remoteStream,
    screenStream,
    isMuted,
    isVideoOff,
    isScreenSharing,
    startCall,
    answerCall,
    rejectCall,
    endCall,
    toggleMute,
    toggleVideo,
    switchToAudioOnly,
    startScreenShare,
    stopScreenShare
  }
}
