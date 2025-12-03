import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/use-toast'

// ICE servers configuration with STUN and TURN support
const ICE_SERVERS = {
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

  // Clear call timeout
  const clearCallTimeout = () => {
    if (callTimeoutRef.current) {
      clearTimeout(callTimeoutRef.current)
      callTimeoutRef.current = null
    }
  }

  // Initialize peer connection
  const initializePeerConnection = useCallback(() => {
    if (peerConnection.current) {
      peerConnection.current.close()
    }

    peerConnection.current = new RTCPeerConnection(ICE_SERVERS)

    // Handle ICE candidates
    peerConnection.current.onicecandidate = (event) => {
      if (event.candidate && signalingChannel.current) {
        console.log('Sending ICE candidate')
        signalingChannel.current.send({
          type: 'broadcast',
          event: 'ice-candidate',
          payload: {
            candidate: event.candidate,
            from: user?.id,
            to: callState.remoteUserId
          }
        })
      }
    }

    // Handle remote stream
    peerConnection.current.ontrack = (event) => {
      console.log('Received remote track:', event.track.kind)
      if (event.streams && event.streams[0]) {
        setRemoteStream(event.streams[0])
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
      } else if (state === 'disconnected' || state === 'failed') {
        toast({
          title: "Call Disconnected",
          description: "The call has ended",
          variant: "destructive"
        })
        endCall()
      }
    }

    // Handle ICE connection state
    peerConnection.current.oniceconnectionstatechange = () => {
      console.log('ICE connection state:', peerConnection.current?.iceConnectionState)
    }
  }, [user?.id, callState.remoteUserId])

  // Request media permissions with proper error handling
  const getMediaStream = async (callType: 'voice' | 'video'): Promise<MediaStream | null> => {
    try {
      const constraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        },
        video: callType === 'video' ? {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        } : false
      }
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints)
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

  // Note: Online check would require a last_seen column in profiles
  // For now, we rely on the call timeout to handle offline users

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

    // Check if already in a call
    if (callState.isInCall) {
      toast({
        title: "Already in Call",
        description: "Please end your current call first",
        variant: "destructive"
      })
      return
    }

    try {
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
        console.log('Adding local track:', track.kind)
        peerConnection.current?.addTrack(track, stream)
      })

      // Create offer
      const offer = await peerConnection.current!.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: callType === 'video'
      })
      await peerConnection.current!.setLocalDescription(offer)

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
            } catch (err) {
              console.error('Error setting remote description:', err)
            }
          }
        })
        .on('broadcast', { event: 'ice-candidate' }, async ({ payload }: any) => {
          if (payload.to === user.id && payload.candidate) {
            try {
              await peerConnection.current?.addIceCandidate(
                new RTCIceCandidate(payload.candidate)
              )
            } catch (err) {
              console.error('Error adding ICE candidate:', err)
            }
          }
        })
        .on('broadcast', { event: 'call-rejected' }, ({ payload }: any) => {
          if (payload.to === user.id) {
            clearCallTimeout()
            toast({
              title: "Call Declined",
              description: "The user declined your call"
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
            // Send offer to receiver's listening channel
            const receiverChannel = supabase.channel(receiverChannelName)
            await receiverChannel.subscribe()
            
            // Small delay to ensure channel is ready
            await new Promise(resolve => setTimeout(resolve, 500))
            
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

    // Check if already in a call
    if (callState.isInCall) {
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
      // Get user media
      const stream = await getMediaStream(callType)
      if (!stream) return
      
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

      // Add tracks
      stream.getTracks().forEach(track => {
        console.log('Adding local track:', track.kind)
        peerConnection.current?.addTrack(track, stream)
      })

      // Set remote description
      await peerConnection.current!.setRemoteDescription(new RTCSessionDescription(offer))

      // Create answer
      const answer = await peerConnection.current!.createAnswer()
      await peerConnection.current!.setLocalDescription(answer)

      // Setup signaling channel
      const channelName = `call-${callId}`
      signalingChannel.current = supabase.channel(channelName)

      signalingChannel.current
        .on('broadcast', { event: 'ice-candidate' }, async ({ payload }: any) => {
          if (payload.to === user.id && payload.candidate) {
            try {
              await peerConnection.current?.addIceCandidate(
                new RTCIceCandidate(payload.candidate)
              )
            } catch (err) {
              console.error('Error adding ICE candidate:', err)
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
      endCall()
    }
  }

  // Reject incoming call
  const rejectCall = async (callerId: string, callId: string) => {
    if (!user) return

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

    // Check if this is a voice call - screen share requires video
    if (callState.callType === 'voice') {
      toast({
        title: "Cannot Share Screen",
        description: "Screen sharing is only available for video calls",
        variant: "destructive"
      })
      return
    }

    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
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
      } else {
        // No video sender found - add screen track as new
        peerConnection.current.addTrack(screenTrack, stream)
      }

      // Handle when user stops sharing via browser UI
      screenTrack.onended = () => {
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
          title: "Permission Denied",
          description: "Screen sharing was cancelled or denied",
          variant: "destructive"
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
    clearCallTimeout()
    
    // Notify the other party
    if (signalingChannel.current && callState.remoteUserId && user) {
      signalingChannel.current.send({
        type: 'broadcast',
        event: 'call-ended',
        payload: {
          from: user.id,
          to: callState.remoteUserId
        }
      })
    }

    // Stop all tracks
    localStream?.getTracks().forEach(track => track.stop())
    remoteStream?.getTracks().forEach(track => track.stop())
    screenStream?.getTracks().forEach(track => track.stop())

    // Close peer connection
    peerConnection.current?.close()
    peerConnection.current = null

    // Remove signaling channel
    if (signalingChannel.current) {
      await supabase.removeChannel(signalingChannel.current)
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
  }, [callState.callId, callState.remoteUserId, localStream, remoteStream, screenStream, user])

  // Toggle mute
  const toggleMute = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach(track => {
        track.enabled = !track.enabled
      })
      setIsMuted(!isMuted)
    }
  }

  // Toggle video
  const toggleVideo = () => {
    if (localStream) {
      localStream.getVideoTracks().forEach(track => {
        track.enabled = !track.enabled
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
      if (callState.isInCall) {
        endCall()
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
