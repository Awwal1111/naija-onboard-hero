import React, { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Mic, MicOff, Video, VideoOff, PhoneOff, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
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
        navigate('/expert-class')
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
      const options = {
        roomName: roomCode,
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
        },
        interfaceConfigOverwrite: {
          TOOLBAR_BUTTONS: [
            'microphone',
            'camera',
            'hangup',
            'chat',
            'raisehand',
            'participants-pane',
            'tileview',
          ],
          SHOW_JITSI_WATERMARK: false,
          SHOW_WATERMARK_FOR_GUESTS: false,
        },
      }

      const api = new (window as any).JitsiMeetExternalAPI(domain, options)
      jitsiApiRef.current = api

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

  const handleLeaveClass = () => {
    if (classId) {
      leaveClass(classId)
    }
    navigate('/expert-class')
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

  return (
    <div className="fixed inset-0 bg-background flex flex-col">
      {/* Header */}
      <div className="bg-card border-b p-4 flex items-center justify-between">
        <div>
          <h1 className="font-semibold">{classData.title}</h1>
          <p className="text-sm text-muted-foreground flex items-center gap-2">
            <Users className="h-4 w-4" />
            {participants.length} participants
          </p>
        </div>
        <Button variant="destructive" onClick={handleLeaveClass}>
          <PhoneOff className="h-4 w-4 mr-2" />
          Leave Class
        </Button>
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
