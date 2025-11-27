import React, { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Mic, MicOff, Video, VideoOff, PhoneOff, Users, Share2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/hooks/useAuth'
import { useExpertClasses } from '@/hooks/useExpertClasses'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'

const ClassRoom = () => {
  const { classId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [userProfile, setUserProfile] = useState<any>(null)
  const { joinClass, leaveClass } = useExpertClasses()
  const { toast } = useToast()

  // Fetch user profile
  useEffect(() => {
    if (!user) return
    
    supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .single()
      .then(({ data }) => setUserProfile(data))
  }, [user])
  
  const [isMuted, setIsMuted] = useState(false)
  const [isVideoOff, setIsVideoOff] = useState(false)
  const [participants, setParticipants] = useState<any[]>([])
  const [classData, setClassData] = useState<any>(null)
  const jitsiContainerRef = useRef<HTMLDivElement>(null)
  const jitsiApiRef = useRef<any>(null)

  useEffect(() => {
    if (!classId || !user) return

    // Fetch class data
    const fetchClassData = async () => {
      const { data, error } = await supabase
        .from('expert_classes')
        .select('*')
        .eq('id', classId)
        .single()

      if (error) {
        toast({
          title: 'Error',
          description: 'Could not load class',
          variant: 'destructive',
        })
        navigate('/experts')
        return
      }

      setClassData(data)

      // Join the class
      joinClass(classId)

      // Initialize Jitsi
      initJitsi(data.room_code)
    }

    fetchClassData()

    return () => {
      // Leave class on unmount
      if (classId) {
        leaveClass(classId)
      }
      // Dispose Jitsi
      if (jitsiApiRef.current) {
        jitsiApiRef.current.dispose()
      }
    }
  }, [classId, user])

  const initJitsi = (roomCode: string) => {
    if (!jitsiContainerRef.current) return

    // Load Jitsi Meet External API
    const script = document.createElement('script')
    script.src = 'https://meet.jit.si/external_api.js'
    script.async = true
    script.onload = () => {
      const domain = 'meet.jit.si'
      const isExpert = classData?.expert_id === user?.id
      
      const options = {
        roomName: `naijalancers_${roomCode}`,
        width: '100%',
        height: '100%',
        parentNode: jitsiContainerRef.current,
        userInfo: {
          displayName: userProfile?.full_name || 'Anonymous',
          email: user?.email || '',
        },
        configOverwrite: {
          startWithAudioMuted: false,
          startWithVideoMuted: false,
          enableWelcomePage: false,
          prejoinPageEnabled: false,
          // Only expert can start the meeting
          enableUserRolesBasedOnToken: isExpert,
          // Recording settings
          recording: {
            enabled: isExpert,
          },
          // Lobby mode
          enableLobbyChat: false,
          // Max participants
          maxParticipants: classData?.max_participants || 50,
          // Disable moderator features for non-experts
          disableModeratorIndicator: !isExpert,
        },
        interfaceConfigOverwrite: {
          TOOLBAR_BUTTONS: isExpert 
            ? [
                'microphone',
                'camera',
                'desktop',
                'hangup',
                'chat',
                'raisehand',
                'participants-pane',
                'tileview',
                'recording',
                'livestreaming',
                'security',
                'settings',
              ]
            : [
                'microphone',
                'camera',
                'hangup',
                'chat',
                'raisehand',
                'participants-pane',
                'tileview',
                'settings',
              ],
          SHOW_JITSI_WATERMARK: false,
          SHOW_WATERMARK_FOR_GUESTS: false,
          DISABLE_VIDEO_BACKGROUND: false,
          SETTINGS_SECTIONS: ['devices', 'language'],
        },
      }

      const api = new (window as any).JitsiMeetExternalAPI(domain, options)
      jitsiApiRef.current = api

      // Grant moderator rights to expert
      if (isExpert) {
        api.executeCommand('toggleLobby', true)
      }

      // Listen to events
      api.addEventListener('participantJoined', () => {
        updateParticipants()
      })

      api.addEventListener('participantLeft', () => {
        updateParticipants()
      })

      api.addEventListener('videoConferenceLeft', () => {
        handleLeaveClass()
      })

      api.addEventListener('videoConferenceJoined', async () => {
        // Update class status to live when expert joins
        if (isExpert && classData?.status === 'scheduled') {
          await supabase
            .from('expert_classes')
            .update({ 
              status: 'live',
              actual_start: new Date().toISOString()
            })
            .eq('id', classId)
        }
      })
    }

    document.body.appendChild(script)
  }

  const updateParticipants = async () => {
    if (!classId) return

    const { data } = await supabase
      .from('class_participants')
      .select(`
        *,
        user:profiles!user_id(full_name, avatar_url)
      `)
      .eq('class_id', classId)
      .eq('is_active', true)

    if (data) {
      setParticipants(data)
    }
  }

  const handleLeaveClass = async () => {
    if (classId) {
      leaveClass(classId)
      
      // Update class status to ended if expert is leaving
      const isExpert = classData?.expert_id === user?.id
      if (isExpert) {
        await supabase
          .from('expert_classes')
          .update({ 
            status: 'ended',
            actual_end: new Date().toISOString()
          })
          .eq('id', classId)
      }
    }
    navigate('/experts')
  }

  const toggleMute = () => {
    if (jitsiApiRef.current) {
      jitsiApiRef.current.executeCommand('toggleAudio')
      setIsMuted(!isMuted)
    }
  }

  const toggleVideo = () => {
    if (jitsiApiRef.current) {
      jitsiApiRef.current.executeCommand('toggleVideo')
      setIsVideoOff(!isVideoOff)
    }
  }

  if (!classData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading class...</p>
      </div>
    )
  }

  const isExpert = classData?.expert_id === user?.id
  const canStart = isExpert || classData?.status === 'live'

  return (
    <div className="fixed inset-0 bg-background flex flex-col">
      {/* Header */}
      <div className="bg-card border-b p-4 flex items-center justify-between">
        <div className="flex-1">
          <h1 className="font-semibold">{classData.title}</h1>
          <p className="text-sm text-muted-foreground flex items-center gap-2">
            <Users className="h-4 w-4" />
            {participants.length} participants
            {isExpert && (
              <Badge variant="secondary" className="ml-2">Moderator</Badge>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => {
              const classUrl = `${window.location.origin}/expert-class/room/${classId}`
              navigator.clipboard.writeText(classUrl)
              toast({
                title: 'Link Copied!',
                description: 'Share this link with participants',
              })
            }}
          >
            <Share2 className="h-4 w-4 mr-2" />
            Share
          </Button>
          <Button variant="destructive" onClick={handleLeaveClass}>
            <PhoneOff className="h-4 w-4 mr-2" />
            Leave
          </Button>
        </div>
      </div>

      {/* Video Container */}
      <div className="flex-1 relative">
        <div ref={jitsiContainerRef} className="w-full h-full" />
      </div>

      {/* Controls (visible on mobile) */}
      <div className="md:hidden bg-card border-t p-4 flex items-center justify-center gap-4">
        <Button
          size="lg"
          variant={isMuted ? 'destructive' : 'secondary'}
          className="rounded-full h-14 w-14"
          onClick={toggleMute}
        >
          {isMuted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
        </Button>

        <Button
          size="lg"
          variant={isVideoOff ? 'destructive' : 'secondary'}
          className="rounded-full h-14 w-14"
          onClick={toggleVideo}
        >
          {isVideoOff ? <VideoOff className="h-6 w-6" /> : <Video className="h-6 w-6" />}
        </Button>

        <Button
          size="lg"
          variant="destructive"
          className="rounded-full h-16 w-16"
          onClick={handleLeaveClass}
        >
          <PhoneOff className="h-7 w-7" />
        </Button>
      </div>
    </div>
  )
}

export default ClassRoom
