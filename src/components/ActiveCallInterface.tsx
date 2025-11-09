import React, { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Phone, Mic, MicOff, Video, VideoOff, PhoneOff } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ActiveCallInterfaceProps {
  localStream: MediaStream | null
  remoteStream: MediaStream | null
  callType: 'voice' | 'video'
  isMuted: boolean
  isVideoOff: boolean
  remoteUserName: string
  remoteUserAvatar?: string
  onEndCall: () => void
  onToggleMute: () => void
  onToggleVideo: () => void
  onSwitchToAudioOnly: () => void
  callStatus: string
}

const ActiveCallInterface: React.FC<ActiveCallInterfaceProps> = ({
  localStream,
  remoteStream,
  callType,
  isMuted,
  isVideoOff,
  remoteUserName,
  remoteUserAvatar,
  onEndCall,
  onToggleMute,
  onToggleVideo,
  onSwitchToAudioOnly,
  callStatus
}) => {
  const localVideoRef = useRef<HTMLVideoElement>(null)
  const remoteVideoRef = useRef<HTMLVideoElement>(null)
  const [callDuration, setCallDuration] = useState(0)

  // Setup video streams
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream
    }
  }, [localStream])

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream
    }
  }, [remoteStream])

  // Track call duration
  useEffect(() => {
    if (callStatus === 'connected') {
      const interval = setInterval(() => {
        setCallDuration(prev => prev + 1)
      }, 1000)
      return () => clearInterval(interval)
    }
  }, [callStatus])

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
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
              {callStatus === 'connected' ? formatDuration(callDuration) : 'Connecting...'}
            </p>
          </div>
        )}

        {/* Local Video Preview (for video calls) */}
        {callType === 'video' && localStream && (
          <div className="absolute top-4 right-4 w-32 h-44 rounded-lg overflow-hidden bg-black shadow-lg">
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
          <div className="absolute top-4 left-4 bg-background/80 px-4 py-2 rounded-full">
            <p className="text-sm font-medium">
              {callStatus === 'calling' ? 'Calling...' : 
               callStatus === 'ringing' ? 'Ringing...' : 'Connecting...'}
            </p>
          </div>
        )}

        {/* Connection Quality Indicator */}
        {callStatus === 'connected' && callType === 'video' && (
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
        <div className="max-w-md mx-auto flex items-center justify-center gap-4">
          {/* Mute Button */}
          <Button
            size="lg"
            variant={isMuted ? "destructive" : "secondary"}
            className="rounded-full h-14 w-14"
            onClick={onToggleMute}
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
            >
              {isVideoOff ? <VideoOff className="h-6 w-6" /> : <Video className="h-6 w-6" />}
            </Button>
          )}

          {/* End Call Button */}
          <Button
            size="lg"
            variant="destructive"
            className="rounded-full h-16 w-16"
            onClick={onEndCall}
          >
            <PhoneOff className="h-7 w-7" />
          </Button>
        </div>

        {callStatus === 'connected' && (
          <p className="text-center text-sm text-muted-foreground mt-4">
            {formatDuration(callDuration)}
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
