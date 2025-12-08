import React, { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Mic, MicOff, Video, VideoOff, PhoneOff, Users, Share2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { format } from 'date-fns'

const ClassRoom = () => {
  const { classId } = useParams()
  const navigate = useNavigate()
  const { user, loading: authLoading } = useAuth()
  const { toast } = useToast()
  
  const [isMuted, setIsMuted] = useState(false)
  const [isVideoOff, setIsVideoOff] = useState(false)
  const [participants, setParticipants] = useState<any[]>([])
  const [classData, setClassData] = useState<any>(null)
  const [expertProfile, setExpertProfile] = useState<any>(null)
  const [waitingForExpert, setWaitingForExpert] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [jitsiLoaded, setJitsiLoaded] = useState(false)
  
  const jitsiContainerRef = useRef<HTMLDivElement>(null)
  const jitsiApiRef = useRef<any>(null)
  const hasJoinedRef = useRef(false)

  // Determine if current user is the expert
  const isExpert = classData?.expert_id === user?.id

  // Fetch class data and expert profile
  useEffect(() => {
    if (!classId || !user) return

    const fetchData = async () => {
      setIsLoading(true)
      
      // Fetch class
      const { data: classInfo, error } = await supabase
        .from('expert_classes')
        .select('*')
        .eq('id', classId)
        .single()

      if (error || !classInfo) {
        toast({
          title: 'Error',
          description: 'Class not found',
          variant: 'destructive',
        })
        navigate('/expert-class')
        return
      }

      setClassData(classInfo)

      // Fetch expert profile
      const { data: expertData } = await supabase
        .from('profiles')
        .select('user_id, full_name, profile_picture_url')
        .eq('user_id', classInfo.expert_id)
        .single()

      setExpertProfile(expertData)

      // Determine initial state
      const userIsExpert = classInfo.expert_id === user.id
      
      if (!userIsExpert && classInfo.status === 'scheduled') {
        // Participant joining a scheduled class - wait for expert
        setWaitingForExpert(true)
      } else {
        setWaitingForExpert(false)
      }

      setIsLoading(false)

      // Join as participant (non-expert only)
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
          console.log('Join error (may be duplicate):', e)
        }
      }
    }

    fetchData()
  }, [classId, user])

  // Listen for class status changes
  useEffect(() => {
    if (!classId) return

    const channel = supabase
      .channel(`class-status-${classId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'expert_classes',
          filter: `id=eq.${classId}`
        },
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

    return () => {
      supabase.removeChannel(channel)
    }
  }, [classId, waitingForExpert])

  // Initialize Jitsi when ready
  useEffect(() => {
    if (isLoading || !classData || waitingForExpert || jitsiLoaded) return
    if (!jitsiContainerRef.current) return

    const loadJitsi = () => {
      // Check if script already exists
      if ((window as any).JitsiMeetExternalAPI) {
        initJitsi()
        return
      }

      const script = document.createElement('script')
      script.src = 'https://meet.jit.si/external_api.js'
      script.async = true
      script.onload = () => initJitsi()
      script.onerror = () => {
        toast({ title: 'Failed to load video', variant: 'destructive' })
      }
      document.body.appendChild(script)
    }

    loadJitsi()
  }, [isLoading, classData, waitingForExpert, jitsiLoaded])

  const initJitsi = useCallback(() => {
    if (!jitsiContainerRef.current || !classData || !user) return
    if (jitsiApiRef.current) return // Already initialized

    const domain = 'meet.jit.si'
    const userIsExpert = classData.expert_id === user.id

    const options = {
      roomName: `naijalancers_${classData.room_code}`,
      width: '100%',
      height: '100%',
      parentNode: jitsiContainerRef.current,
      userInfo: {
        displayName: userIsExpert ? `${expertProfile?.full_name || 'Expert'} (Host)` : 'Participant',
      },
      configOverwrite: {
        startWithAudioMuted: false,
        startWithVideoMuted: false,
        enableWelcomePage: false,
        prejoinPageEnabled: false,
        disableDeepLinking: true,
      },
      interfaceConfigOverwrite: {
        TOOLBAR_BUTTONS: userIsExpert 
          ? ['microphone', 'camera', 'desktop', 'hangup', 'chat', 'raisehand', 'participants-pane', 'tileview', 'recording', 'settings']
          : ['microphone', 'camera', 'hangup', 'chat', 'raisehand', 'tileview', 'settings'],
        SHOW_JITSI_WATERMARK: false,
        SHOW_WATERMARK_FOR_GUESTS: false,
        DISABLE_JOIN_LEAVE_NOTIFICATIONS: false,
      },
    }

    try {
      const api = new (window as any).JitsiMeetExternalAPI(domain, options)
      jitsiApiRef.current = api
      setJitsiLoaded(true)

      // When expert joins, update class to live
      api.addEventListener('videoConferenceJoined', async () => {
        if (userIsExpert && classData.status === 'scheduled') {
          await supabase
            .from('expert_classes')
            .update({ 
              status: 'live',
              actual_start: new Date().toISOString()
            })
            .eq('id', classId)
          
          toast({ title: 'Class is now LIVE!', description: 'Participants can join now' })
        }
        updateParticipants()
      })

      api.addEventListener('participantJoined', updateParticipants)
      api.addEventListener('participantLeft', updateParticipants)
      
      api.addEventListener('videoConferenceLeft', () => {
        handleLeaveClass()
      })

    } catch (e) {
      console.error('Jitsi init error:', e)
      toast({ title: 'Failed to start video', variant: 'destructive' })
    }
  }, [classData, user, expertProfile])

  const updateParticipants = async () => {
    if (!classId) return
    
    const { data } = await supabase
      .from('class_participants')
      .select('*, profiles:user_id(full_name, profile_picture_url)')
      .eq('class_id', classId)
      .eq('is_active', true)

    if (data) {
      setParticipants(data)
    }
  }

  const handleLeaveClass = async () => {
    // Update participant status
    if (classId && user && !isExpert) {
      await supabase
        .from('class_participants')
        .update({ is_active: false, left_at: new Date().toISOString() })
        .eq('class_id', classId)
        .eq('user_id', user.id)
    }

    // End class if expert leaves
    if (classId && isExpert) {
      await supabase
        .from('expert_classes')
        .update({ 
          status: 'ended',
          actual_end: new Date().toISOString()
        })
        .eq('id', classId)
      
      toast({ title: 'Class ended' })
    }

    // Cleanup
    if (jitsiApiRef.current) {
      jitsiApiRef.current.dispose()
      jitsiApiRef.current = null
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

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (jitsiApiRef.current) {
        jitsiApiRef.current.dispose()
        jitsiApiRef.current = null
      }
    }
  }, [])

  // Loading state
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

  // Auth check
  if (!user) {
    navigate('/login')
    return null
  }

  // No class found
  if (!classData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Class not found</p>
          <Button className="mt-4" onClick={() => navigate('/expert-class')}>
            Back to Classes
          </Button>
        </div>
      </div>
    )
  }

  // Waiting room for participants
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
          <Button variant="outline" size="sm" onClick={() => navigate('/expert-class')}>
            Leave
          </Button>
        </div>

        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center max-w-md">
            {/* Expert Avatar */}
            <Avatar className="h-20 w-20 mx-auto mb-4">
              <AvatarImage src={expertProfile?.profile_picture_url} />
              <AvatarFallback className="text-2xl">
                {expertProfile?.full_name?.charAt(0) || 'E'}
              </AvatarFallback>
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
            {participants.length + 1} in class
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

      {/* Video Container */}
      <div className="flex-1 relative bg-black">
        <div ref={jitsiContainerRef} className="w-full h-full" />
      </div>

      {/* Mobile Controls */}
      <div className="md:hidden bg-card border-t p-3 flex items-center justify-center gap-3">
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

export default ClassRoom
