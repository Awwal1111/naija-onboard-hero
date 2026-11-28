import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/hooks/useAuth'

export interface ExpertClass {
  id: string
  expert_id: string
  title: string
  description: string | null
  class_type: string
  status: string
  scheduled_start: string | null
  scheduled_end: string | null
  actual_start: string | null
  actual_end: string | null
  duration_minutes: number | null
  max_participants: number
  current_participants: number
  is_free: boolean
  price: number
  room_code: string
  category: string | null
  thumbnail_url: string | null
  recording_url: string | null
  created_at: string
  expert?: {
    full_name: string
    avatar_url: string | null
    profile_picture_url?: string | null
  }
}

export const useExpertClasses = () => {
  const { toast } = useToast()
  const { user } = useAuth()
  const queryClient = useQueryClient()

  // Fetch user's own classes (My Classes)
  const { data: myClasses = [], isLoading: isLoadingMy } = useQuery({
    queryKey: ['expert-classes', 'my', user?.id],
    queryFn: async () => {
      if (!user) return []
      
      const { data: classes, error } = await supabase
        .from('expert_classes')
        .select('id, expert_id, title, description, class_type, status, room_code, scheduled_start, scheduled_end, actual_start, actual_end, duration_minutes, max_participants, current_participants, price, is_free, category, thumbnail_url, created_at')
        .eq('expert_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      if (!classes || classes.length === 0) return []

      // Fetch expert profiles
      const expertIds = [...new Set(classes.map(c => c.expert_id))]
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, profile_picture_url')
        .in('user_id', expertIds)

      // Combine data
      return classes.map(classItem => ({
        ...classItem,
        expert: profiles?.find(p => p.user_id === classItem.expert_id) 
          ? {
              full_name: profiles.find(p => p.user_id === classItem.expert_id)!.full_name || '',
              avatar_url: profiles.find(p => p.user_id === classItem.expert_id)!.profile_picture_url || ''
            }
          : undefined
      })) as ExpertClass[]
    },
    enabled: !!user
  })

  // Fetch live classes
  const { data: liveClasses = [], isLoading: isLoadingLive } = useQuery({
    queryKey: ['expert-classes', 'live'],
    queryFn: async () => {
      const { data: classes, error } = await supabase
        .from('expert_classes')
        .select('id, expert_id, title, description, class_type, status, room_code, scheduled_start, actual_start, duration_minutes, max_participants, current_participants, price, is_free, category, thumbnail_url')
        .eq('status', 'live')
        .order('actual_start', { ascending: false })

      if (error) throw error
      if (!classes || classes.length === 0) return []

      // Fetch expert profiles
      const expertIds = [...new Set(classes.map(c => c.expert_id))]
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, profile_picture_url')
        .in('user_id', expertIds)

      // Combine data
      return classes.map(classItem => ({
        ...classItem,
        expert: profiles?.find(p => p.user_id === classItem.expert_id) 
          ? {
              full_name: profiles.find(p => p.user_id === classItem.expert_id)!.full_name || '',
              avatar_url: profiles.find(p => p.user_id === classItem.expert_id)!.profile_picture_url || ''
            }
          : undefined
      })) as ExpertClass[]
    },
  })

  // Fetch upcoming classes (only future classes)
  const { data: upcomingClasses = [], isLoading: isLoadingUpcoming } = useQuery({
    queryKey: ['expert-classes', 'upcoming'],
    queryFn: async () => {
      const now = new Date().toISOString()
      const { data: classes, error } = await supabase
        .from('expert_classes')
        .select('id, expert_id, title, description, class_type, status, room_code, scheduled_start, scheduled_end, duration_minutes, max_participants, current_participants, price, is_free, category, thumbnail_url')
        .eq('status', 'scheduled')
        .gt('scheduled_start', now) // Only future classes
        .order('scheduled_start', { ascending: true })

      if (error) throw error
      if (!classes || classes.length === 0) return []

      // Fetch expert profiles
      const expertIds = [...new Set(classes.map(c => c.expert_id))]
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, profile_picture_url')
        .in('user_id', expertIds)

      // Combine data
      return classes.map(classItem => ({
        ...classItem,
        expert: profiles?.find(p => p.user_id === classItem.expert_id) 
          ? {
              full_name: profiles.find(p => p.user_id === classItem.expert_id)!.full_name || '',
              avatar_url: profiles.find(p => p.user_id === classItem.expert_id)!.profile_picture_url || ''
            }
          : undefined
      })) as ExpertClass[]
    },
  })

  // Fetch featured classes (popular and highly rated, only current/future)
  const { data: featuredClasses = [], isLoading: isLoadingFeatured } = useQuery({
    queryKey: ['expert-classes', 'featured'],
    queryFn: async () => {
      const now = new Date().toISOString()
      const { data: classes, error } = await supabase
        .from('expert_classes')
        .select('id, expert_id, title, description, class_type, status, room_code, scheduled_start, actual_start, duration_minutes, max_participants, current_participants, price, is_free, category, thumbnail_url')
        .or(`status.eq.live,and(status.eq.scheduled,scheduled_start.gt.${now})`)
        .order('current_participants', { ascending: false })
        .limit(6)

      if (error) throw error
      if (!classes || classes.length === 0) return []

      // Fetch expert profiles
      const expertIds = [...new Set(classes.map(c => c.expert_id))]
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, profile_picture_url')
        .in('user_id', expertIds)

      // Combine data
      return classes.map(classItem => ({
        ...classItem,
        expert: profiles?.find(p => p.user_id === classItem.expert_id) 
          ? {
              full_name: profiles.find(p => p.user_id === classItem.expert_id)!.full_name || '',
              avatar_url: profiles.find(p => p.user_id === classItem.expert_id)!.profile_picture_url || ''
            }
          : undefined
      })) as ExpertClass[]
    },
  })

  // Fetch past/ended classes
  const { data: pastClasses = [], isLoading: isLoadingPast } = useQuery({
    queryKey: ['expert-classes', 'past'],
    queryFn: async () => {
      const { data: classes, error } = await supabase
        .from('expert_classes')
        .select('id, expert_id, title, description, class_type, status, room_code, actual_start, actual_end, duration_minutes, max_participants, current_participants, price, is_free, category, thumbnail_url, recording_url')
        .eq('status', 'ended')
        .order('actual_end', { ascending: false })
        .limit(20)

      if (error) throw error
      if (!classes || classes.length === 0) return []

      // Fetch expert profiles
      const expertIds = [...new Set(classes.map(c => c.expert_id))]
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, profile_picture_url')
        .in('user_id', expertIds)

      // Combine data
      return classes.map(classItem => ({
        ...classItem,
        expert: profiles?.find(p => p.user_id === classItem.expert_id) 
          ? {
              full_name: profiles.find(p => p.user_id === classItem.expert_id)!.full_name || '',
              avatar_url: profiles.find(p => p.user_id === classItem.expert_id)!.profile_picture_url || ''
            }
          : undefined
      })) as ExpertClass[]
    },
  })

  // Create class mutation
  const createClassMutation = useMutation({
    mutationFn: async (classData: Partial<ExpertClass>) => {
      if (!user) throw new Error('Must be logged in')

      const roomCode = `class-${crypto.randomUUID()}`

      // Calculate scheduled_end based on scheduled_start + duration
      let scheduledEnd = null
      if (classData.scheduled_start && classData.duration_minutes) {
        const startDate = new Date(classData.scheduled_start)
        startDate.setMinutes(startDate.getMinutes() + classData.duration_minutes)
        scheduledEnd = startDate.toISOString()
      }

      const { data, error } = await supabase
        .from('expert_classes')
        .insert([{
          title: classData.title || '',
          description: classData.description,
          class_type: classData.class_type || 'live',
          status: classData.status || 'scheduled',
          scheduled_start: classData.scheduled_start,
          scheduled_end: scheduledEnd,
          duration_minutes: classData.duration_minutes,
          max_participants: classData.max_participants || 8,
          current_participants: 0,
          is_free: classData.is_free,
          price: classData.price,
          category: classData.category,
          expert_id: user.id,
          room_code: roomCode,
        }])
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expert-classes'] })
      toast({
        title: 'Success',
        description: 'Class created successfully',
      })
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      })
    },
  })

  return {
    myClasses,
    liveClasses,
    upcomingClasses,
    featuredClasses,
    pastClasses,
    isLoading: isLoadingMy || isLoadingLive || isLoadingUpcoming || isLoadingFeatured || isLoadingPast,
    createClass: createClassMutation.mutate,
  }
}
