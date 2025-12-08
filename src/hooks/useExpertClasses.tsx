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
  expert_pass: string | null
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

  // Fetch live classes
  const { data: liveClasses = [], isLoading: isLoadingLive } = useQuery({
    queryKey: ['expert-classes', 'live'],
    queryFn: async () => {
      const { data: classes, error } = await supabase
        .from('expert_classes')
        .select('*')
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

  // Fetch upcoming classes
  const { data: upcomingClasses = [], isLoading: isLoadingUpcoming } = useQuery({
    queryKey: ['expert-classes', 'upcoming'],
    queryFn: async () => {
      const { data: classes, error } = await supabase
        .from('expert_classes')
        .select('*')
        .eq('status', 'scheduled')
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

  // Fetch featured classes (popular and highly rated)
  const { data: featuredClasses = [], isLoading: isLoadingFeatured } = useQuery({
    queryKey: ['expert-classes', 'featured'],
    queryFn: async () => {
      const { data: classes, error } = await supabase
        .from('expert_classes')
        .select('*')
        .in('status', ['scheduled', 'live'])
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
        .select('*')
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

      const roomCode = `class-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      const expertPass = Math.random().toString(36).substring(2, 14)

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
          max_participants: classData.max_participants || 50,
          current_participants: 0,
          is_free: classData.is_free,
          price: classData.price,
          category: classData.category,
          expert_id: user.id,
          room_code: roomCode,
          expert_pass: expertPass,
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

  // Join class mutation
  const joinClassMutation = useMutation({
    mutationFn: async (classId: string) => {
      if (!user) throw new Error('Must be logged in')

      const { error } = await supabase
        .from('class_participants')
        .insert({
          class_id: classId,
          user_id: user.id,
          is_active: true,
        })

      if (error) throw error

      // Increment participant count - fetch current, increment, update
      const { data: classData } = await supabase
        .from('expert_classes')
        .select('current_participants')
        .eq('id', classId)
        .single()

      if (classData) {
        await supabase
          .from('expert_classes')
          .update({ current_participants: classData.current_participants + 1 })
          .eq('id', classId)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expert-classes'] })
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      })
    },
  })

  // Leave class mutation
  const leaveClassMutation = useMutation({
    mutationFn: async (classId: string) => {
      if (!user) throw new Error('Must be logged in')

      const { error } = await supabase
        .from('class_participants')
        .update({
          left_at: new Date().toISOString(),
          is_active: false,
        })
        .eq('class_id', classId)
        .eq('user_id', user.id)

      if (error) throw error

      // Decrement participant count - fetch current, decrement, update
      const { data: classData } = await supabase
        .from('expert_classes')
        .select('current_participants')
        .eq('id', classId)
        .single()

      if (classData && classData.current_participants > 0) {
        await supabase
          .from('expert_classes')
          .update({ current_participants: classData.current_participants - 1 })
          .eq('id', classId)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expert-classes'] })
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
    liveClasses,
    upcomingClasses,
    featuredClasses,
    pastClasses,
    isLoading: isLoadingLive || isLoadingUpcoming || isLoadingFeatured || isLoadingPast,
    createClass: createClassMutation.mutate,
    joinClass: joinClassMutation.mutate,
    leaveClass: leaveClassMutation.mutate,
  }
}
