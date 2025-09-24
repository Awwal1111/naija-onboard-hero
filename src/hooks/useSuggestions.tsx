import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useProfile } from '@/hooks/useProfile'
import { supabase } from '@/integrations/supabase/client'

interface ConnectionSuggestion {
  id: string
  full_name: string
  profession?: string
  profile_picture_url?: string
  suggestion_type: string
  score: number
  state_name?: string
  lga_name?: string
  mutual_connections?: number
}

interface GroupSuggestion {
  id: string
  name: string
  category: string
  description?: string
  lga_name: string
  state_name: string
  member_count: number
  suggestion_type: string
  score: number
}

interface JobSuggestion {
  id: string
  title: string
  description: string
  budget_min?: number
  budget_max?: number
  required_skills?: string[]
  location?: string
  created_at: string
  score: number
}

interface ExpertSuggestion {
  id: string
  full_name: string
  profession?: string
  profile_picture_url?: string
  average_rating: number
  rating_count: number
  is_expert: boolean
  score: number
}

export const useSuggestions = () => {
  const { user } = useAuth()
  const { profile } = useProfile()
  const [connectionSuggestions, setConnectionSuggestions] = useState<ConnectionSuggestion[]>([])
  const [groupSuggestions, setGroupSuggestions] = useState<GroupSuggestion[]>([])
  const [jobSuggestions, setJobSuggestions] = useState<JobSuggestion[]>([])
  const [expertSuggestions, setExpertSuggestions] = useState<ExpertSuggestion[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user && profile) {
      fetchAllSuggestions()
    }
  }, [user, profile])

  const fetchAllSuggestions = async () => {
    if (!user || !profile) return

    try {
      setLoading(true)
      await Promise.all([
        fetchConnectionSuggestions(),
        fetchGroupSuggestions(),
        fetchJobSuggestions(),
        fetchExpertSuggestions()
      ])
    } catch (error) {
      console.error('Error fetching suggestions:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchConnectionSuggestions = async () => {
    if (!user || !profile) return

    try {
      // Basic connection suggestions without RPC
      const { data, error } = await supabase
        .from('profiles')
        .select('id, user_id, full_name, profession, profile_picture_url, state_name, lga_name')
        .neq('user_id', user.id)
        .or(`state_name.eq.${profile.state_name || 'Lagos'},lga_name.eq.${profile.lga_name || 'Ikeja'},profession.eq.${profile.profession || 'Developer'}`)
        .limit(10)

      if (error) throw error

      const suggestions = (data || []).map((profileData: any, index: number) => ({
        ...profileData,
        id: profileData.user_id,
        suggestion_type: profileData.state_name === profile.state_name ? 'location' : 'profession',
        score: 10 - index,
        mutual_connections: 0
      }))

      setConnectionSuggestions(suggestions)
    } catch (error) {
      console.error('Error in fetchConnectionSuggestions:', error)
      setConnectionSuggestions([])
    }
  }

  const fetchGroupSuggestions = async () => {
    if (!user || !profile) return

    try {
      // NaijaLancers Calculation for group suggestions
      const { data, error } = await supabase
        .from('groups')
        .select('id, name, category, description, state_name, lga_name, member_count')
        .eq('is_active', true)
        .or(`category.eq.${profile.profession},lga_name.eq.${profile.lga_name}`)
        .order('member_count', { ascending: false })
        .limit(10)

      if (error) throw error

      const suggestions = (data || []).map((group: any, index: number) => ({
        ...group,
        suggestion_type: group.category === profile.profession ? 'category' : 'location',
        score: (group.category === profile.profession ? 5 : 0) +
               (group.lga_name === profile.lga_name ? 3 : 0) +
               Math.floor(group.member_count / 10) +
               (10 - index)
      }))

      setGroupSuggestions(suggestions)
    } catch (error) {
      console.error('Error fetching group suggestions:', error)
    }
  }

  const fetchJobSuggestions = async () => {
    if (!user || !profile || !profile.is_expert) return

    try {
      // NaijaLancers Calculation for job suggestions
      const { data, error } = await supabase
        .from('job_posts')
        .select('id, title, description, budget_min, budget_max, required_skills, location, created_at')
        .eq('status', 'open')
        .neq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20)

      if (error) throw error

      const suggestions = (data || []).map((job: any) => {
        let score = 0
        
        // Skill match scoring
        if (job.required_skills && profile.profession) {
          const hasSkillMatch = job.required_skills.some((skill: string) => 
            skill.toLowerCase().includes(profile.profession.toLowerCase()) ||
            profile.profession.toLowerCase().includes(skill.toLowerCase())
          )
          if (hasSkillMatch) score += 5
        }

        // Location match scoring
        if (job.location && profile.lga_name && 
            job.location.toLowerCase().includes(profile.lga_name.toLowerCase())) {
          score += 3
        }

        // Pay scoring (higher pay = higher score)
        if (job.budget_min) {
          score += Math.floor(job.budget_min / 1000)
        }

        // Recency scoring (newer jobs get higher score)
        const daysSincePosted = Math.floor((Date.now() - new Date(job.created_at).getTime()) / (1000 * 60 * 60 * 24))
        score += Math.max(0, 7 - daysSincePosted)

        return { ...job, score }
      })

      // Sort by score and take top suggestions
      suggestions.sort((a, b) => b.score - a.score)
      setJobSuggestions(suggestions.slice(0, 10))
    } catch (error) {
      console.error('Error fetching job suggestions:', error)
    }
  }

  const fetchExpertSuggestions = async () => {
    if (!user || !profile) return

    try {
      // NaijaLancers Calculation for expert suggestions
      const { data, error } = await supabase
        .from('profiles')
        .select('id, user_id, full_name, profession, profile_picture_url, average_rating, rating_count, is_expert')
        .eq('is_expert', true)
        .neq('user_id', user.id)
        .not('average_rating', 'is', null)
        .limit(20)

      if (error) throw error

      const suggestions = (data || []).map((expert: any) => {
        let score = 0

        // Skill match scoring
        if (expert.profession && profile.profession) {
          if (expert.profession.toLowerCase().includes(profile.profession.toLowerCase()) ||
              profile.profession.toLowerCase().includes(expert.profession.toLowerCase())) {
            score += 5
          }
        }

        // Rating scoring (higher rating = higher score)
        if (expert.average_rating) {
          score += expert.average_rating * 2
        }

        // Activity scoring (more ratings = more active)
        if (expert.rating_count) {
          score += expert.rating_count > 10 ? 3 : (expert.rating_count > 5 ? 2 : 1)
        }

        return { ...expert, id: expert.user_id, score }
      })

      // Sort by score and take top suggestions
      suggestions.sort((a, b) => b.score - a.score)
      setExpertSuggestions(suggestions.slice(0, 10))
    } catch (error) {
      console.error('Error fetching expert suggestions:', error)
    }
  }

  const refreshSuggestions = () => {
    fetchAllSuggestions()
  }

  return {
    connectionSuggestions,
    groupSuggestions,
    jobSuggestions,
    expertSuggestions,
    loading,
    refreshSuggestions
  }
}