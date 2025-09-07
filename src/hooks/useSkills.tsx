import { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from './useAuth'
import { useToast } from './use-toast'

interface Skill {
  id: string
  user_id: string
  skill_name: string
  created_at: string
  endorsements_count?: number
  is_endorsed_by_me?: boolean
}

interface SkillEndorsement {
  id: string
  skill_id: string
  endorser_id: string
  created_at: string
}

export const useSkills = (userId?: string) => {
  const { user } = useAuth()
  const { toast } = useToast()
  const [skills, setSkills] = useState<Skill[]>([])
  const [loading, setLoading] = useState(true)

  const targetUserId = userId || user?.id

  const fetchSkills = async () => {
    if (!targetUserId) return

    try {
      const { data, error } = await supabase
        .from('skills')
        .select(`
          *,
          skill_endorsements(count)
        `)
        .eq('user_id', targetUserId)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching skills:', error)
        return
      }

      // Get endorsement counts and check if current user has endorsed
      const skillsWithEndorsements = await Promise.all(
        (data || []).map(async (skill) => {
          const { count } = await supabase
            .from('skill_endorsements')
            .select('*', { count: 'exact', head: true })
            .eq('skill_id', skill.id)

          let isEndorsedByMe = false
          if (user?.id && user.id !== skill.user_id) {
            const { data: endorsement } = await supabase
              .from('skill_endorsements')
              .select('id')
              .eq('skill_id', skill.id)
              .eq('endorser_id', user.id)
              .maybeSingle()
            
            isEndorsedByMe = !!endorsement
          }

          return {
            ...skill,
            endorsements_count: count || 0,
            is_endorsed_by_me: isEndorsedByMe
          }
        })
      )

      setSkills(skillsWithEndorsements)
    } catch (error) {
      console.error('Error fetching skills:', error)
    } finally {
      setLoading(false)
    }
  }

  const addSkill = async (skillName: string) => {
    if (!user?.id) return { error: 'Not authenticated' }

    try {
      const { data, error } = await supabase
        .from('skills')
        .insert({
          skill_name: skillName,
          user_id: user.id
        })
        .select()
        .single()

      if (error) {
        toast({
          title: "Error",
          description: "Failed to add skill",
          variant: "destructive",
        })
        return { error: error.message }
      }

      const newSkill = {
        ...data,
        endorsements_count: 0,
        is_endorsed_by_me: false
      }

      setSkills(prev => [newSkill, ...prev])
      toast({
        title: "Success",
        description: "Skill added successfully",
      })
      return { data: newSkill }
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to add skill",
        variant: "destructive",
      })
      return { error: error.message }
    }
  }

  const endorseSkill = async (skillId: string) => {
    if (!user?.id) return { error: 'Not authenticated' }

    try {
      const { error } = await supabase
        .from('skill_endorsements')
        .insert({
          skill_id: skillId,
          endorser_id: user.id
        })

      if (error) {
        toast({
          title: "Error",
          description: "Failed to endorse skill",
          variant: "destructive",
        })
        return { error: error.message }
      }

      setSkills(prev => prev.map(skill => 
        skill.id === skillId 
          ? { 
              ...skill, 
              endorsements_count: (skill.endorsements_count || 0) + 1,
              is_endorsed_by_me: true
            }
          : skill
      ))

      toast({
        title: "Success",
        description: "Skill endorsed successfully",
      })
      return { success: true }
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to endorse skill",
        variant: "destructive",
      })
      return { error: error.message }
    }
  }

  const removeEndorsement = async (skillId: string) => {
    if (!user?.id) return { error: 'Not authenticated' }

    try {
      const { error } = await supabase
        .from('skill_endorsements')
        .delete()
        .eq('skill_id', skillId)
        .eq('endorser_id', user.id)

      if (error) {
        toast({
          title: "Error",
          description: "Failed to remove endorsement",
          variant: "destructive",
        })
        return { error: error.message }
      }

      setSkills(prev => prev.map(skill => 
        skill.id === skillId 
          ? { 
              ...skill, 
              endorsements_count: Math.max((skill.endorsements_count || 0) - 1, 0),
              is_endorsed_by_me: false
            }
          : skill
      ))

      toast({
        title: "Success",
        description: "Endorsement removed",
      })
      return { success: true }
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to remove endorsement",
        variant: "destructive",
      })
      return { error: error.message }
    }
  }

  const deleteSkill = async (skillId: string) => {
    if (!user?.id) return { error: 'Not authenticated' }

    try {
      const { error } = await supabase
        .from('skills')
        .delete()
        .eq('id', skillId)
        .eq('user_id', user.id)

      if (error) {
        toast({
          title: "Error",
          description: "Failed to delete skill",
          variant: "destructive",
        })
        return { error: error.message }
      }

      setSkills(prev => prev.filter(skill => skill.id !== skillId))
      toast({
        title: "Success",
        description: "Skill deleted successfully",
      })
      return { success: true }
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to delete skill",
        variant: "destructive",
      })
      return { error: error.message }
    }
  }

  useEffect(() => {
    fetchSkills()
  }, [targetUserId])

  return {
    skills,
    loading,
    addSkill,
    endorseSkill,
    removeEndorsement,
    deleteSkill,
    refetch: fetchSkills
  }
}