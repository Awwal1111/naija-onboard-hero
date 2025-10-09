import { useState, useCallback } from 'react'
import { useAuth } from './useAuth'
import { supabase } from '@/integrations/supabase/client'

export const usePostViews = () => {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)

  const trackPostView = useCallback(async (postId: string) => {
    if (!user?.id) return
    
    try {
      // Insert view record - UNIQUE constraint prevents duplicates
      await supabase
        .from('post_views')
        .insert({
          post_id: postId,
          user_id: user.id,
          viewed_at: new Date().toISOString()
        })
        .select()
        .single()
    } catch (error: any) {
      // Silently ignore duplicate key violations (user already viewed this post)
      if (!error?.message?.includes('duplicate key')) {
        console.error('Error tracking post view:', error)
      }
    }
  }, [user?.id])

  const trackProfileView = async (profileUserId: string) => {
    if (!user?.id || user.id === profileUserId) return
    
    // Profile view tracking can be implemented later if needed
    console.log('Tracking profile view for:', profileUserId)
  }

  const getPostViews = async (postId: string) => {
    try {
      const { count, error } = await supabase
        .from('post_views')
        .select('*', { count: 'exact', head: true })
        .eq('post_id', postId)

      if (error) throw error
      return count || 0
    } catch (error) {
      console.error('Error getting post views:', error)
      return 0
    }
  }

  const getProfileViews = async (profileUserId: string, days: number = 1) => {
    // Profile view tracking can be implemented later if needed
    console.log('Getting profile views for:', profileUserId, 'days:', days)
    return 0
  }

  return {
    trackPostView,
    trackProfileView,
    getPostViews,
    getProfileViews,
    loading
  }
}