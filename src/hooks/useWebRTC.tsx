import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/use-toast'

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ]
}

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
  const [isMuted, setIsMuted] = useState(false)
  const [isVideoOff, setIsVideoOff] = useState(false)
  
  const peerConnection = useRef<RTCPeerConnection | null>(null)
  const signalingChannel = useRef<any>(null)
  const callStartTime = useRef<Date | null>(null)

  // Initialize peer connection
  const initializePeerConnection = useCallback(() => {
    if (peerConnection.current) return

    peerConnection.current = new RTCPeerConnection(ICE_SERVERS)

    // Handle ICE candidates
    peerConnection.current.onicecandidate = (event) => {
      if (event.candidate && signalingChannel.current) {
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
      console.log('Received remote track:', event.streams[0])
      setRemoteStream(event.streams[0])
    }

    // Handle connection state changes
    peerConnection.current.onconnectionstatechange = () => {
      console.log('Connection state:', peerConnection.current?.connectionState)
      if (peerConnection.current?.connectionState === 'connected') {
        setCallState(prev => ({ ...prev, status: 'connected' }))
        callStartTime.current = new Date()
      } else if (peerConnection.current?.connectionState === 'disconnected' || 
                 peerConnection.current?.connectionState === 'failed') {
        endCall()
      }
    }
  }, [user?.id, callState.remoteUserId])

  // Start a call
  const startCall = async (remoteUserId: string, callType: 'voice' | 'video') => {
    if (!user) return

    try {
      // Get user media
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: callType === 'video'
      })
      
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

      if (error) throw error

      setCallState({
        isInCall: true,
        callType,
        isCaller: true,
        remoteUserId,
        callId: callRecord.id,
        status: 'calling'
      })

      // Initialize peer connection
      initializePeerConnection()

      // Add tracks to peer connection
      stream.getTracks().forEach(track => {
        peerConnection.current?.addTrack(track, stream)
      })

      // Create offer
      const offer = await peerConnection.current!.createOffer()
      await peerConnection.current!.setLocalDescription(offer)

      // Setup signaling channels - both specific call channel and receiver's listening channel
      const callChannelName = `call-${callRecord.id}`
      const receiverChannelName = `user-${remoteUserId}-calls`
      
      signalingChannel.current = supabase.channel(callChannelName)

      signalingChannel.current
        .on('broadcast', { event: 'answer' }, async ({ payload }: any) => {
          if (payload.to === user.id && payload.answer) {
            console.log('Received answer:', payload.answer)
            await peerConnection.current?.setRemoteDescription(
              new RTCSessionDescription(payload.answer)
            )
          }
        })
        .on('broadcast', { event: 'ice-candidate' }, async ({ payload }: any) => {
          if (payload.to === user.id && payload.candidate) {
            await peerConnection.current?.addIceCandidate(
              new RTCIceCandidate(payload.candidate)
            )
          }
        })
        .on('broadcast', { event: 'call-rejected' }, ({ payload }: any) => {
          if (payload.to === user.id) {
            toast({
              title: "Call Rejected",
              description: "The user declined your call",
              variant: "destructive"
            })
            endCall()
          }
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            // Send offer to receiver's listening channel
            const receiverChannel = supabase.channel(receiverChannelName)
            await receiverChannel.subscribe()
            
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
            supabase
              .from('call_history')
              .update({ status: 'ringing' })
              .eq('id', callRecord.id)
              .then()
            
            // Clean up receiver channel after sending
            setTimeout(() => {
              supabase.removeChannel(receiverChannel)
            }, 2000)
          }
        })

    } catch (error: any) {
      console.error('Error starting call:', error)
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

    try {
      // Get user media
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: callType === 'video'
      })
      
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
        peerConnection.current?.addTrack(track, stream)
      })

      // Set remote description
      await peerConnection.current!.setRemoteDescription(new RTCSessionDescription(offer))

      // Create answer
      const answer = await peerConnection.current!.createAnswer()
      await peerConnection.current!.setLocalDescription(answer)

      // Setup signaling channel - use the same call channel
      const channelName = `call-${callId}`
      signalingChannel.current = supabase.channel(channelName)

      signalingChannel.current
        .on('broadcast', { event: 'ice-candidate' }, async ({ payload }: any) => {
          if (payload.to === user.id && payload.candidate) {
            await peerConnection.current?.addIceCandidate(
              new RTCIceCandidate(payload.candidate)
            )
          }
        })
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
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
            supabase
              .from('call_history')
              .update({ status: 'accepted' })
              .eq('id', callId)
              .then()

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

  // End call
  const endCall = useCallback(async () => {
    // Stop all tracks
    localStream?.getTracks().forEach(track => track.stop())
    remoteStream?.getTracks().forEach(track => track.stop())

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
    }

    // Reset state
    setLocalStream(null)
    setRemoteStream(null)
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
    callStartTime.current = null
  }, [callState.callId, localStream, remoteStream])

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
      if (callState.isInCall) {
        endCall()
      }
    }
  }, [])

  return {
    callState,
    localStream,
    remoteStream,
    isMuted,
    isVideoOff,
    startCall,
    answerCall,
    rejectCall,
    endCall,
    toggleMute,
    toggleVideo,
    switchToAudioOnly
  }
}
