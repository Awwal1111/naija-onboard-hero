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
      const { data, error } = await supabase
        .from('expert_classes')
        .select('*')
        .eq('status', 'live')
        .order('actual_start', { ascending: false })

      if (error) throw error
      return data as ExpertClass[]
    },
  })

  // Fetch upcoming classes
  const { data: upcomingClasses = [], isLoading: isLoadingUpcoming } = useQuery({
    queryKey: ['expert-classes', 'upcoming'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('expert_classes')
        .select('*')
        .eq('status', 'scheduled')
        .order('scheduled_start', { ascending: true })

      if (error) throw error
      return data as ExpertClass[]
    },
  })

  // Fetch featured classes (for now, just recent completed classes)
  const { data: featuredClasses = [], isLoading: isLoadingFeatured } = useQuery({
    queryKey: ['expert-classes', 'featured'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('expert_classes')
        .select('*')
        .in('status', ['scheduled', 'live'])
        .order('created_at', { ascending: false })
        .limit(6)

      if (error) throw error
      return data as ExpertClass[]
    },
  })

  // Create class mutation
  const createClassMutation = useMutation({
    mutationFn: async (classData: Partial<ExpertClass>) => {
      if (!user) throw new Error('Must be logged in')

      const roomCode = `class-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

      const { data, error } = await supabase
        .from('expert_classes')
        .insert([{
          title: classData.title || '',
          description: classData.description,
          class_type: classData.class_type || 'live',
          status: classData.status || 'scheduled',
          scheduled_start: classData.scheduled_start,
          scheduled_end: classData.scheduled_end,
          duration_minutes: classData.duration_minutes,
          max_participants: classData.max_participants,
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
    isLoading: isLoadingLive || isLoadingUpcoming || isLoadingFeatured,
    createClass: createClassMutation.mutate,
    joinClass: joinClassMutation.mutate,
    leaveClass: leaveClassMutation.mutate,
  }
}
