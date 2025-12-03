import React, { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Phone, Mic, MicOff, Video, VideoOff, PhoneOff, Monitor, MonitorOff } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ActiveCallInterfaceProps {
  localStream: MediaStream | null
  remoteStream: MediaStream | null
  screenStream?: MediaStream | null
  callType: 'voice' | 'video'
  isMuted: boolean
  isVideoOff: boolean
  isScreenSharing?: boolean
  remoteUserName: string
  remoteUserAvatar?: string
  onEndCall: () => void
  onToggleMute: () => void
  onToggleVideo: () => void
  onSwitchToAudioOnly: () => void
  onStartScreenShare?: () => void
  onStopScreenShare?: () => void
  callStatus: string
}

const ActiveCallInterface: React.FC<ActiveCallInterfaceProps> = ({
  localStream,
  remoteStream,
  screenStream,
  callType,
  isMuted,
  isVideoOff,
  isScreenSharing = false,
  remoteUserName,
  remoteUserAvatar,
  onEndCall,
  onToggleMute,
  onToggleVideo,
  onSwitchToAudioOnly,
  onStartScreenShare,
  onStopScreenShare,
  callStatus
}) => {
  const localVideoRef = useRef<HTMLVideoElement>(null)
  const remoteVideoRef = useRef<HTMLVideoElement>(null)
  const remoteAudioRef = useRef<HTMLAudioElement>(null)
  const screenVideoRef = useRef<HTMLVideoElement>(null)
  const [callDuration, setCallDuration] = useState(0)

  // Setup local video stream
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      console.log('Setting local video stream')
      localVideoRef.current.srcObject = localStream
    }
  }, [localStream])

  // Setup remote video/audio stream - CRITICAL for hearing audio
  useEffect(() => {
    if (!remoteStream) return
    
    console.log('Setting up remote stream with tracks:', 
      remoteStream.getTracks().map(t => `${t.kind}:${t.enabled}`).join(', ')
    )

    // Always set up audio element for remote audio playback
    if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = remoteStream
      // Ensure audio plays
      const playAudio = async () => {
        try {
          await remoteAudioRef.current?.play()
          console.log('Remote audio playing')
        } catch (err) {
          console.error('Audio play failed:', err)
          // Try again on user interaction
          document.addEventListener('click', () => {
            remoteAudioRef.current?.play().catch(console.error)
          }, { once: true })
        }
      }
      playAudio()
    }

    // Set up video element for video calls
    if (remoteVideoRef.current && callType === 'video') {
      remoteVideoRef.current.srcObject = remoteStream
    }
  }, [remoteStream, callType])

  // Setup screen share preview
  useEffect(() => {
    if (screenVideoRef.current && screenStream) {
      screenVideoRef.current.srcObject = screenStream
    }
  }, [screenStream])

  // Track call duration
  useEffect(() => {
    if (callStatus === 'connected') {
      const interval = setInterval(() => {
        setCallDuration(prev => prev + 1)
      }, 1000)
      return () => clearInterval(interval)
    } else {
      setCallDuration(0)
    }
  }, [callStatus])

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* CRITICAL: Hidden audio element for remote audio playback - MUST have autoPlay and playsInline */}
      <audio 
        ref={remoteAudioRef} 
        autoPlay 
        playsInline 
        style={{ display: 'none' }}
      />
      
      {/* Remote Video/Avatar */}
      <div className="flex-1 relative bg-muted">
        {callType === 'video' && remoteStream ? (
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center">
            <Avatar className="h-32 w-32 mb-4">
              <AvatarImage src={remoteUserAvatar} />
              <AvatarFallback className="text-4xl">
                {remoteUserName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <h2 className="text-2xl font-semibold">{remoteUserName}</h2>
            <p className="text-muted-foreground mt-2">
              {callStatus === 'connected' ? formatDuration(callDuration) : 
               callStatus === 'calling' ? 'Calling...' : 
               callStatus === 'ringing' ? 'Ringing...' : 'Connecting...'}
            </p>
          </div>
        )}

        {/* Screen Share Preview (when sharing) */}
        {isScreenSharing && screenStream && (
          <div className="absolute top-4 left-4 w-48 h-32 rounded-lg overflow-hidden bg-black shadow-lg border-2 border-primary">
            <video
              ref={screenVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-contain"
            />
            <div className="absolute bottom-1 left-1 bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded">
              You're sharing
            </div>
          </div>
        )}

        {/* Local Video Preview (for video calls) */}
        {callType === 'video' && localStream && (
          <div className={cn(
            "absolute w-32 h-44 rounded-lg overflow-hidden bg-black shadow-lg",
            isScreenSharing ? "top-4 right-4" : "top-4 right-4"
          )}>
            {!isVideoOff ? (
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover mirror"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-muted">
                <VideoOff className="h-8 w-8 text-muted-foreground" />
              </div>
            )}
          </div>
        )}

        {/* Call Status Overlay */}
        {callStatus !== 'connected' && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/50">
            <div className="text-center">
              <div className="animate-pulse mb-4">
                <Phone className="h-16 w-16 mx-auto text-primary" />
              </div>
              <p className="text-xl font-medium">
                {callStatus === 'calling' ? 'Calling...' : 
                 callStatus === 'ringing' ? 'Ringing...' : 'Connecting...'}
              </p>
            </div>
          </div>
        )}

        {/* Switch to Audio Button */}
        {callStatus === 'connected' && callType === 'video' && !isScreenSharing && (
          <div className="absolute top-4 left-4">
            <Button
              variant="secondary"
              size="sm"
              onClick={onSwitchToAudioOnly}
              className="text-xs"
            >
              Switch to Audio Only
            </Button>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="p-6 bg-background border-t">
        <div className="max-w-md mx-auto flex items-center justify-center gap-3">
          {/* Mute Button */}
          <Button
            size="lg"
            variant={isMuted ? "destructive" : "secondary"}
            className="rounded-full h-14 w-14"
            onClick={onToggleMute}
            title={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
          </Button>

          {/* Video Toggle (only for video calls) */}
          {callType === 'video' && (
            <Button
              size="lg"
              variant={isVideoOff ? "destructive" : "secondary"}
              className="rounded-full h-14 w-14"
              onClick={onToggleVideo}
              title={isVideoOff ? "Turn on camera" : "Turn off camera"}
            >
              {isVideoOff ? <VideoOff className="h-6 w-6" /> : <Video className="h-6 w-6" />}
            </Button>
          )}

          {/* Screen Share Button (only for video calls when connected) */}
          {callType === 'video' && callStatus === 'connected' && (
            <Button
              size="lg"
              variant={isScreenSharing ? "default" : "secondary"}
              className={cn(
                "rounded-full h-14 w-14",
                isScreenSharing && "bg-primary text-primary-foreground"
              )}
              onClick={isScreenSharing ? onStopScreenShare : onStartScreenShare}
              title={isScreenSharing ? "Stop sharing" : "Share screen"}
            >
              {isScreenSharing ? <MonitorOff className="h-6 w-6" /> : <Monitor className="h-6 w-6" />}
            </Button>
          )}

          {/* End Call Button */}
          <Button
            size="lg"
            variant="destructive"
            className="rounded-full h-16 w-16"
            onClick={onEndCall}
            title="End call"
          >
            <PhoneOff className="h-7 w-7" />
          </Button>
        </div>

        {callStatus === 'connected' && (
          <p className="text-center text-sm text-muted-foreground mt-4">
            {formatDuration(callDuration)}
            {isScreenSharing && " • Screen sharing"}
          </p>
        )}
      </div>

      <style>{`
        .mirror {
          transform: scaleX(-1);
        }
      `}</style>
    </div>
  )
}

export default ActiveCallInterface
