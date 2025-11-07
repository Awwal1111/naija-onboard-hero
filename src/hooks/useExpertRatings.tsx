import { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from './useAuth'
import { useToast } from './use-toast'
import { ExpertRating } from './useProfile'

export const useExpertRatings = (expertId?: string) => {
  const { user } = useAuth()
  const { toast } = useToast()
  const [ratings, setRatings] = useState<ExpertRating[]>([])
  const [loading, setLoading] = useState(true)
  const [hasRated, setHasRated] = useState(false)

  useEffect(() => {
    if (expertId && user) {
      fetchRatings()
      checkIfUserHasRated()
    }
  }, [expertId, user])

  const fetchRatings = async () => {
    if (!expertId) return

    try {
      const { data, error } = await supabase
        .from('expert_ratings' as any)
        .select(`
          *,
          profiles!expert_ratings_user_id_fkey(full_name)
        `)
        .eq('expert_id', expertId)
        .order('created_at', { ascending: false })

      if (error) throw error
      setRatings((data as any) || [])
    } catch (error) {
      console.error('Error fetching ratings:', error)
    } finally {
      setLoading(false)
    }
  }

  const checkIfUserHasRated = async () => {
    if (!user || !expertId) return

    try {
      const { data, error } = await supabase
        .from('expert_ratings' as any)
        .select('id')
        .eq('expert_id', expertId)
        .eq('user_id', user.id)
        .single()

      if (error && error.code !== 'PGRST116') throw error
      setHasRated(!!data)
    } catch (error) {
      console.error('Error checking if user has rated:', error)
    }
  }

  const submitRating = async (rating: number, comment?: string) => {
    if (!user || !expertId) {
      toast({
        title: "Error",
        description: "Please log in to submit a rating",
        variant: "destructive",
      })
      return { success: false, error: 'Not authenticated' }
    }

    if (user.id === expertId) {
      toast({
        title: "Error",
        description: "You can't rate yourself",
        variant: "destructive",
      })
      return { success: false, error: 'Cannot rate yourself' }
    }

    if (hasRated) {
      toast({
        title: "Error",
        description: "You have already rated this expert",
        variant: "destructive",
      })
      return { success: false, error: 'Already rated' }
    }

    try {
      const { data, error } = await supabase
        .from('expert_ratings' as any)
        .insert({
          expert_id: expertId,
          user_id: user.id,
          rating,
          comment: comment || null
        })
        .select()
        .single()

      if (error) throw error

      toast({
        title: "Success",
        description: "Rating submitted successfully!",
      })

      setHasRated(true)
      fetchRatings()
      return { success: true, data }
    } catch (error: any) {
      console.error('Error submitting rating:', error)
      
      if (error.message?.includes('duplicate')) {
        toast({
          title: "Error",
          description: "You have already rated this expert",
          variant: "destructive",
        })
      } else {
        toast({
          title: "Error",
          description: error.message || "Failed to submit rating",
          variant: "destructive",
        })
      }
      
      return { success: false, error: error.message }
    }
  }

  const updateRating = async (ratingId: string, rating: number, comment?: string) => {
    if (!user) {
      toast({
        title: "Error",
        description: "Please log in to update a rating",
        variant: "destructive",
      })
      return { success: false, error: 'Not authenticated' }
    }

    try {
      const { data, error } = await supabase
        .from('expert_ratings' as any)
        .update({
          rating,
          comment: comment || null
        })
        .eq('id', ratingId)
        .select()
        .single()

      if (error) throw error

      toast({
        title: "Success",
        description: "Rating updated successfully!",
      })

      fetchRatings()
      return { success: true, data }
    } catch (error: any) {
      console.error('Error updating rating:', error)
      toast({
        title: "Error",
        description: error.message || "Failed to update rating. You can only edit within 24 hours.",
        variant: "destructive",
      })
      return { success: false, error: error.message }
    }
  }

  const deleteRating = async (ratingId: string) => {
    if (!user) {
      toast({
        title: "Error",
        description: "Please log in to delete a rating",
        variant: "destructive",
      })
      return { success: false, error: 'Not authenticated' }
    }

    try {
      const { error } = await supabase
        .from('expert_ratings' as any)
        .delete()
        .eq('id', ratingId)

      if (error) throw error

      toast({
        title: "Success",
        description: "Rating deleted successfully!",
      })

      setHasRated(false)
      fetchRatings()
      return { success: true }
    } catch (error: any) {
      console.error('Error deleting rating:', error)
      toast({
        title: "Error",
        description: error.message || "Failed to delete rating. You can only delete within 24 hours.",
        variant: "destructive",
      })
      return { success: false, error: error.message }
    }
  }

  return {
    ratings,
    loading,
    hasRated,
    submitRating,
    updateRating,
    deleteRating,
    refetch: fetchRatings
  }
}