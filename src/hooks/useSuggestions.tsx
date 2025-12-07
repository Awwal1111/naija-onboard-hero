import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/integrations/supabase/client'

export interface ConnectionSuggestion {
  user_id: string
  full_name: string
  profession?: string | null
  profile_picture_url?: string | null
  state_name?: string | null
  lga_name?: string | null
  is_expert: boolean
  average_rating: number
  relevance_score: number
}

export interface GroupSuggestion {
  id: string
  name: string
  description?: string | null
  category: string
  state_name: string
  lga_name: string
  area: string
  member_count: number
  group_lead_id: string
  group_lead_name?: string | null
  relevance_score: number
}

export interface JobSuggestion {
  id: string
  title: string
  description: string
  budget_min?: number | null
  budget_max?: number | null
  location?: string | null
  job_type?: string | null
  required_skills?: string[] | null
  created_at: string
  poster_id: string
  poster_name?: string | null
  relevance_score: number
}

export interface ExpertSuggestion {
  id: string
  user_id: string
  full_name: string
  skill_category: string
  years_experience: number
  location_state: string
  profile_picture_url?: string | null
  profession?: string | null
  average_rating: number
  rating_count: number
  is_expert: boolean
  relevance_score: number
}

export const useSuggestions = () => {
  const { user } = useAuth()

  // Connection suggestions using personalized algorithm
  const { data: connectionSuggestions = [], isLoading: loadingConnections } = useQuery({
    queryKey: ['suggestions-connections', user?.id],
    queryFn: async () => {
      if (!user) return []

      const { data, error } = await supabase.rpc('get_personalized_connections', {
        p_user_id: user.id,
        p_limit: 10,
        p_offset: 0
      })

      if (error) {
        console.error('[Suggestions] Connection suggestions error:', error)
        return []
      }

      return (data || []) as ConnectionSuggestion[]
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  })

  // Group suggestions using personalized algorithm
  const { data: groupSuggestions = [], isLoading: loadingGroups } = useQuery({
    queryKey: ['suggestions-groups', user?.id],
    queryFn: async () => {
      if (!user) return []

      const { data, error } = await supabase.rpc('get_personalized_groups', {
        p_user_id: user.id,
        p_limit: 10,
        p_offset: 0
      })

      if (error) {
        console.error('[Suggestions] Group suggestions error:', error)
        return []
      }

      return (data || []) as GroupSuggestion[]
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  })

  // Job suggestions using personalized algorithm
  const { data: jobSuggestions = [], isLoading: loadingJobs } = useQuery({
    queryKey: ['suggestions-jobs', user?.id],
    queryFn: async () => {
      if (!user) return []

      const { data, error } = await supabase.rpc('get_personalized_jobs', {
        p_user_id: user.id,
        p_limit: 10,
        p_offset: 0
      })

      if (error) {
        console.error('[Suggestions] Job suggestions error:', error)
        return []
      }

      return (data || []) as JobSuggestion[]
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  })

  // Expert suggestions using personalized algorithm
  const { data: expertSuggestions = [], isLoading: loadingExperts } = useQuery({
    queryKey: ['suggestions-experts', user?.id],
    queryFn: async () => {
      if (!user) return []

      const { data, error } = await supabase.rpc('get_personalized_experts', {
        p_user_id: user.id,
        p_limit: 10,
        p_offset: 0
      })

      if (error) {
        console.error('[Suggestions] Expert suggestions error:', error)
        return []
      }

      return (data || []) as ExpertSuggestion[]
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  })

  const loading = loadingConnections || loadingGroups || loadingJobs || loadingExperts

  return {
    connectionSuggestions,
    groupSuggestions,
    jobSuggestions,
    expertSuggestions,
    loading
  }
}
