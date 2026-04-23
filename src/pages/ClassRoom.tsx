import React, { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Mic, MicOff, Video, VideoOff, PhoneOff, Users, Share2, Loader2, Monitor, MonitorOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { format } from 'date-fns'

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ],
}

interface RemotePeer {
  userId: string
  displayName: string
  avatarUrl?: string
  stream: MediaStream | null
  isExpert: boolean
}

/**
 * ClassRoom - Group video classroom built on our own WebRTC stack.
 * Uses a mesh topology (each peer connects to every other peer) with
 * Supabase Realtime for signaling. No third-party signup required.
 */
const ClassRoom = () => {
  const { classId } = useParams()
  const navigate = useNavigate()
  const { user, loading: authLoading } = useAuth()
  const { toast } = useToast()

  const [isMuted, setIsMuted] = useState(false)
  const [isVideoOff, setIsVideoOff] = useState(false)
  const [isScreenSharing, setIsScreenSharing] = useState(false)
  const [classData, setClassData] = useState<any>(null)
  const [expertProfile, setExpertProfile] = useState<any>(null)
  const [waitingForExpert, setWaitingForExpert] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [remotePeers, setRemotePeers] = useState<Map<string, RemotePeer>>(new Map())

  const localStreamRef = useRef<MediaStream | null>(null)
  const localVideoRef = useRef<HTMLVideoElement | null>(null)
  const peersRef = useRef<Map<string, RTCPeerConnection>>(new Map())
  const channelRef = useRef<any>(null)
  const hasJoinedRef = useRef(false)
  const userIdRef = useRef<string | null>(null)
  const displayNameRef = useRef<string>('Participant')

  const isExpert = classData?.expert_id === user?.id

  // ---------- Fetch class + expert profile ----------
  useEffect(() => {
    if (!classId || !user) return
    userIdRef.current = user.id

    const fetchData = async () => {
      setIsLoading(true)
      const { data: classInfo, error } = await supabase
        .from('expert_classes')
        .select('*')
        .eq('id', classId)
        .single()

      if (error || !classInfo) {
        toast({ title: 'Error', description: 'Class not found', variant: 'destructive' })
        navigate('/expert-class')
        return
      }
      setClassData(classInfo)

      const { data: expertData } = await supabase
        .from('profiles')
        .select('user_id, full_name, profile_picture_url')
        .eq('user_id', classInfo.expert_id)
        .single()
      setExpertProfile(expertData)

      const { data: myProfile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('user_id', user.id)
        .single()
      const userIsExpert = classInfo.expert_id === user.id
      displayNameRef.current = userIsExpert
        ? `${expertData?.full_name || 'Expert'} (Host)`
        : myProfile?.full_name || 'Participant'

      if (!userIsExpert && classInfo.status === 'scheduled') {
        setWaitingForExpert(true)
      } else {
        setWaitingForExpert(false)
      }
      setIsLoading(false)

      if (!userIsExpert && !hasJoinedRef.current) {
        hasJoinedRef.current = true
        try {
          await supabase
            .from('class_participants')
            .upsert({
              class_id: classId,
              user_id: user.id,
              is_active: true,
              joined_at: new Date().toISOString(),
            }, { onConflict: 'class_id,user_id' })
        } catch (e) {
          console.log('Join error:', e)
        }
      }
    }

    fetchData()
  }, [classId, user])

  // ---------- Listen for class status changes ----------
  useEffect(() => {
    if (!classId) return
    const channel = supabase
      .channel(`class-status-${classId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'expert_classes', filter: `id=eq.${classId}` },
        (payload) => {
          const updated = payload.new as any
          setClassData(updated)
          if (updated.status === 'live' && waitingForExpert) {
            setWaitingForExpert(false)
            toast({ title: 'Class is starting!', description: 'The expert has joined' })
          }
        }
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [classId, waitingForExpert])

  // ---------- WebRTC: create a peer connection for a remote user ----------
  const createPeerConnection = useCallback((remoteUserId: string, remoteName: string, remoteAvatar: string | undefined, remoteIsExpert: boolean): RTCPeerConnection => {
    const pc = new RTCPeerConnection(ICE_SERVERS)

    // Add local tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        pc.addTrack(track, localStreamRef.current!)
      })
    }

    // Handle remote track
    pc.ontrack = (event) => {
      const [stream] = event.streams
      setRemotePeers(prev => {
        const next = new Map(prev)
        next.set(remoteUserId, {
          userId: remoteUserId,
          displayName: remoteName,
          avatarUrl: remoteAvatar,
          stream,
          isExpert: remoteIsExpert,
        })
        return next
      })
    }

    // ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate && channelRef.current) {
        channelRef.current.send({
          type: 'broadcast',
          event: 'ice-candidate',
          payload: {
            from: userIdRef.current,
            to: remoteUserId,
            candidate: event.candidate,
          },
        })
      }
    }

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        peersRef.current.delete(remoteUserId)
        setRemotePeers(prev => {
          const next = new Map(prev)
          next.delete(remoteUserId)
          return next
        })
      }
    }

    peersRef.current.set(remoteUserId, pc)
    return pc
  }, [])

  // ---------- Initialize media + signaling ----------
  useEffect(() => {
    if (isLoading || !classData || waitingForExpert || !user) return
    let cancelled = false

    const init = async () => {
      try {
        // Get local media
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: { width: { ideal: 640 }, height: { ideal: 480 } },
        })
        if (cancelled) {
          stream.getTracks().forEach(t => t.stop())
          return
        }
        localStreamRef.current = stream
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream
        }

        // If expert, mark class live
        if (classData.expert_id === user.id && classData.status === 'scheduled') {
          await supabase
            .from('expert_classes')
            .update({ status: 'live', actual_start: new Date().toISOString() })
            .eq('id', classId)
          toast({ title: 'Class is now LIVE!', description: 'Participants can join' })
        }

        // Setup signaling channel
        const channel = supabase.channel(`classroom-${classId}`, {
          config: { presence: { key: user.id } },
        })
        channelRef.current = channel

        // Handle presence sync — discover other users in the room
        channel.on('presence', { event: 'sync' }, () => {
          const state = channel.presenceState()
          const otherUsers: { id: string; name: string; avatar?: string; isExpert: boolean }[] = []
          Object.entries(state).forEach(([key, presences]: [string, any]) => {
            if (key === user.id) return
            const p = presences[0]
            if (p) {
              otherUsers.push({
                id: key,
                name: p.displayName || 'Participant',
                avatar: p.avatarUrl,
                isExpert: !!p.isExpert,
              })
            }
          })

          // For each new user not yet connected, initiate offer if our id < theirs
          // (deterministic to avoid double-offers in mesh)
          otherUsers.forEach(async (other) => {
            if (peersRef.current.has(other.id)) return
            if (user.id < other.id) {
              const pc = createPeerConnection(other.id, other.name, other.avatar, other.isExpert)
              try {
                const offer = await pc.createOffer()
                await pc.setLocalDescription(offer)
                channel.send({
                  type: 'broadcast',
                  event: 'offer',
                  payload: { from: user.id, to: other.id, sdp: offer },
                })
              } catch (e) {
                console.error('Offer error:', e)
              }
            }
          })
        })

        // Handle WebRTC offer from another peer
        channel.on('broadcast', { event: 'offer' }, async ({ payload }) => {
          if (payload.to !== user.id) return
          const state = channel.presenceState() as any
          const fromPresence = state[payload.from]?.[0]
          const pc = createPeerConnection(
            payload.from,
            fromPresence?.displayName || 'Participant',
            fromPresence?.avatarUrl,
            !!fromPresence?.isExpert
          )
          try {
            await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp))
            const answer = await pc.createAnswer()
            await pc.setLocalDescription(answer)
            channel.send({
              type: 'broadcast',
              event: 'answer',
              payload: { from: user.id, to: payload.from, sdp: answer },
            })
          } catch (e) {
            console.error('Answer error:', e)
          }
        })

        // Handle WebRTC answer
        channel.on('broadcast', { event: 'answer' }, async ({ payload }) => {
          if (payload.to !== user.id) return
          const pc = peersRef.current.get(payload.from)
          if (pc) {
            try {
              await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp))
            } catch (e) {
              console.error('Set remote desc error:', e)
            }
          }
        })

        // Handle ICE candidate
        channel.on('broadcast', { event: 'ice-candidate' }, async ({ payload }) => {
          if (payload.to !== user.id) return
          const pc = peersRef.current.get(payload.from)
          if (pc && payload.candidate) {
            try {
              await pc.addIceCandidate(new RTCIceCandidate(payload.candidate))
            } catch (e) {
              console.error('Add ICE error:', e)
            }
          }
        })

        // Handle peer leaving
        channel.on('broadcast', { event: 'peer-left' }, ({ payload }) => {
          const pc = peersRef.current.get(payload.from)
          if (pc) { pc.close(); peersRef.current.delete(payload.from) }
          setRemotePeers(prev => {
            const next = new Map(prev)
            next.delete(payload.from)
            return next
          })
        })

        await channel.subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            await channel.track({
              displayName: displayNameRef.current,
              avatarUrl: classData.expert_id === user.id
                ? expertProfile?.profile_picture_url
                : undefined,
              isExpert: classData.expert_id === user.id,
              joinedAt: new Date().toISOString(),
            })
          }
        })
      } catch (e: any) {
        console.error('Media error:', e)
        toast({
          title: 'Camera/Mic access required',
          description: e?.message || 'Please grant camera and microphone permissions',
          variant: 'destructive',
        })
      }
    }

    init()

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, classData?.id, waitingForExpert, user?.id])

  // ---------- Cleanup ----------
  const cleanup = useCallback(() => {
    // Notify others
    if (channelRef.current && userIdRef.current) {
      try {
        channelRef.current.send({
          type: 'broadcast',
          event: 'peer-left',
          payload: { from: userIdRef.current },
        })
      } catch {}
    }

    // Close all peer connections
    peersRef.current.forEach(pc => pc.close())
    peersRef.current.clear()

    // Stop local tracks
    localStreamRef.current?.getTracks().forEach(t => t.stop())
    localStreamRef.current = null

    // Remove channel
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
      channelRef.current = null
    }
  }, [])

  useEffect(() => {
    return () => cleanup()
  }, [cleanup])

  // ---------- Controls ----------
  const toggleMute = () => {
    const audioTrack = localStreamRef.current?.getAudioTracks()[0]
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled
      setIsMuted(!audioTrack.enabled)
    }
  }

  const toggleVideo = () => {
    const videoTrack = localStreamRef.current?.getVideoTracks()[0]
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled
      setIsVideoOff(!videoTrack.enabled)
    }
  }

  const toggleScreenShare = async () => {
    if (isScreenSharing) {
      // Revert to camera
      try {
        const camStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        const newVideoTrack = camStream.getVideoTracks()[0]
        peersRef.current.forEach(pc => {
          const sender = pc.getSenders().find(s => s.track?.kind === 'video')
          sender?.replaceTrack(newVideoTrack)
        })
        // Replace in local stream
        const oldTrack = localStreamRef.current?.getVideoTracks()[0]
        if (oldTrack && localStreamRef.current) {
          localStreamRef.current.removeTrack(oldTrack)
          oldTrack.stop()
          localStreamRef.current.addTrack(newVideoTrack)
        }
        if (localVideoRef.current) localVideoRef.current.srcObject = localStreamRef.current
        setIsScreenSharing(false)
      } catch (e) {
        console.error(e)
      }
    } else {
      try {
        const screen = await (navigator.mediaDevices as any).getDisplayMedia({ video: true, audio: false })
        const screenTrack = screen.getVideoTracks()[0]
        peersRef.current.forEach(pc => {
          const sender = pc.getSenders().find(s => s.track?.kind === 'video')
          sender?.replaceTrack(screenTrack)
        })
        const oldTrack = localStreamRef.current?.getVideoTracks()[0]
        if (oldTrack && localStreamRef.current) {
          localStreamRef.current.removeTrack(oldTrack)
          oldTrack.stop()
          localStreamRef.current.addTrack(screenTrack)
        }
        if (localVideoRef.current) localVideoRef.current.srcObject = localStreamRef.current
        setIsScreenSharing(true)
        screenTrack.onended = () => toggleScreenShare()
      } catch (e: any) {
        toast({ title: 'Screen share cancelled', description: e?.message, variant: 'destructive' })
      }
    }
  }

  const handleLeaveClass = async () => {
    if (classId && user && !isExpert) {
      await supabase
        .from('class_participants')
        .update({ is_active: false, left_at: new Date().toISOString() })
        .eq('class_id', classId)
        .eq('user_id', user.id)
    }
    if (classId && isExpert) {
      await supabase
        .from('expert_classes')
        .update({ status: 'ended', actual_end: new Date().toISOString() })
        .eq('id', classId)
      toast({ title: 'Class ended' })
    }
    cleanup()
    navigate('/expert-class')
  }

  // ---------- Render ----------
  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading class...</p>
        </div>
      </div>
    )
  }

  if (!user) { navigate('/login'); return null }

  if (!classData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Class not found</p>
          <Button className="mt-4" onClick={() => navigate('/expert-class')}>Back to Classes</Button>
        </div>
      </div>
    )
  }

  if (waitingForExpert) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <div className="bg-card border-b p-4 flex items-center justify-between">
          <div className="flex-1">
            <h1 className="font-semibold">{classData.title}</h1>
            <p className="text-sm text-muted-foreground">
              {classData.scheduled_start && format(new Date(classData.scheduled_start), 'MMM dd • h:mm a')}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate('/expert-class')}>Leave</Button>
        </div>
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center max-w-md">
            <Avatar className="h-20 w-20 mx-auto mb-4">
              <AvatarImage src={expertProfile?.profile_picture_url} />
              <AvatarFallback className="text-2xl">{expertProfile?.full_name?.charAt(0) || 'E'}</AvatarFallback>
            </Avatar>
            <h2 className="text-xl font-bold mb-2">Waiting for {expertProfile?.full_name || 'Expert'}</h2>
            <p className="text-muted-foreground mb-6">
              The class will begin when the expert joins. Please wait...
            </p>
            <div className="flex items-center justify-center gap-2 text-primary">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-sm">Connecting...</span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const remotePeerArray = Array.from(remotePeers.values())
  const totalTiles = remotePeerArray.length + 1
  // Grid columns: 1 user = 1 col, 2 = 2, 3-4 = 2, 5+ = 3
  const gridCols = totalTiles === 1 ? 'grid-cols-1'
    : totalTiles === 2 ? 'grid-cols-1 sm:grid-cols-2'
    : totalTiles <= 4 ? 'grid-cols-2'
    : 'grid-cols-2 md:grid-cols-3'

  return (
    <div className="fixed inset-0 bg-background flex flex-col">
      {/* Header */}
      <div className="bg-card border-b p-3 flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="font-semibold truncate">{classData.title}</h1>
            {classData.status === 'live' && (
              <Badge className="bg-red-500 text-white shrink-0">LIVE</Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Users className="h-3 w-3" />
            {totalTiles} in class
            {isExpert && <Badge variant="secondary" className="ml-1 text-xs">Host</Badge>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const url = `${window.location.origin}/expert-class/room/${classId}`
              navigator.clipboard.writeText(url)
              toast({ title: 'Link copied!' })
            }}
          >
            <Share2 className="h-4 w-4" />
          </Button>
          <Button variant="destructive" size="sm" onClick={handleLeaveClass}>
            <PhoneOff className="h-4 w-4 mr-1" />
            {isExpert ? 'End' : 'Leave'}
          </Button>
        </div>
      </div>

      {/* Video grid */}
      <div className="flex-1 relative bg-black p-2 overflow-auto">
        <div className={`grid ${gridCols} gap-2 h-full`}>
          {/* Local user tile */}
          <div className="relative bg-muted rounded-lg overflow-hidden aspect-video">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            {isVideoOff && (
              <div className="absolute inset-0 flex items-center justify-center bg-muted">
                <Avatar className="h-16 w-16">
                  <AvatarFallback>{displayNameRef.current.charAt(0)}</AvatarFallback>
                </Avatar>
              </div>
            )}
            <div className="absolute bottom-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
              {isMuted && <MicOff className="h-3 w-3" />}
              You {isExpert && '(Host)'}
            </div>
          </div>

          {/* Remote peers */}
          {remotePeerArray.map(peer => (
            <RemoteVideoTile key={peer.userId} peer={peer} />
          ))}
        </div>
      </div>

      {/* Controls */}
      <div className="bg-card border-t p-3 flex items-center justify-center gap-3">
        <Button
          size="lg"
          variant={isMuted ? 'destructive' : 'secondary'}
          className="rounded-full h-12 w-12"
          onClick={toggleMute}
        >
          {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
        </Button>
        <Button
          size="lg"
          variant={isVideoOff ? 'destructive' : 'secondary'}
          className="rounded-full h-12 w-12"
          onClick={toggleVideo}
        >
          {isVideoOff ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
        </Button>
        {isExpert && (
          <Button
            size="lg"
            variant={isScreenSharing ? 'default' : 'secondary'}
            className="rounded-full h-12 w-12"
            onClick={toggleScreenShare}
          >
            {isScreenSharing ? <MonitorOff className="h-5 w-5" /> : <Monitor className="h-5 w-5" />}
          </Button>
        )}
        <Button
          size="lg"
          variant="destructive"
          className="rounded-full h-14 w-14"
          onClick={handleLeaveClass}
        >
          <PhoneOff className="h-6 w-6" />
        </Button>
      </div>
    </div>
  )
}

const RemoteVideoTile: React.FC<{ peer: RemotePeer }> = ({ peer }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null)

  useEffect(() => {
    if (videoRef.current && peer.stream) {
      videoRef.current.srcObject = peer.stream
    }
  }, [peer.stream])

  return (
    <div className="relative bg-muted rounded-lg overflow-hidden aspect-video">
      {peer.stream ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          <Avatar className="h-16 w-16">
            <AvatarImage src={peer.avatarUrl} />
            <AvatarFallback>{peer.displayName.charAt(0)}</AvatarFallback>
          </Avatar>
        </div>
      )}
      <div className="absolute bottom-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded">
        {peer.displayName} {peer.isExpert && '(Host)'}
      </div>
    </div>
  )
}

export default ClassRoom
