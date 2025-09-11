import { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from './useAuth'

export const usePostViews = () => {
  const { user } = useAuth()

  const trackPostView = async (postId: string) => {
    if (!user?.id) return

    try {
      // Check if user has already viewed this post today
      const today = new Date().toISOString().split('T')[0]
      
      const { data: existingView } = await supabase
        .from('post_views')
        .select('id')
        .eq('post_id', postId)
        .eq('user_id', user.id)
        .gte('created_at', `${today}T00:00:00.000Z`)
        .lt('created_at', `${today}T23:59:59.999Z`)
        .maybeSingle()

      if (existingView) {
        // User already viewed this post today
        return
      }

      // Record the view
      const { error } = await supabase
        .from('post_views')
        .insert({
          post_id: postId,
          user_id: user.id
        })

      if (error) {
        console.error('Error tracking post view:', error)
        return
      }

      // Update the post's view count
      const { error: updateError } = await supabase
        .from('posts')
        .update({ views_count: supabase.raw('views_count + 1') })
        .eq('id', postId)

      if (updateError) {
        console.error('Error updating post view count:', updateError)
      }

    } catch (error) {
      console.error('Error tracking post view:', error)
    }
  }

  const trackProfileView = async (profileUserId: string) => {
    if (!user?.id || user.id === profileUserId) return

    try {
      // Check if user has already viewed this profile today
      const today = new Date().toISOString().split('T')[0]
      
      const { data: existingView } = await supabase
        .from('profile_views')
        .select('id')
        .eq('profile_user_id', profileUserId)
        .eq('viewer_id', user.id)
        .gte('viewed_at', `${today}T00:00:00.000Z`)
        .lt('viewed_at', `${today}T23:59:59.999Z`)
        .maybeSingle()

      if (existingView) {
        // User already viewed this profile today
        return
      }

      // Record the view
      const { error } = await supabase
        .from('profile_views')
        .insert({
          profile_user_id: profileUserId,
          viewer_id: user.id,
          viewed_at: new Date().toISOString()
        })

      if (error) {
        console.error('Error tracking profile view:', error)
        return
      }

      // Send notification to the profile owner (if they're an expert)
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_expert, full_name')
        .eq('user_id', profileUserId)
        .single()

      if (profile?.is_expert) {
        // Get viewer's name
        const { data: viewerProfile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('user_id', user.id)
          .single()

        // Create notification
        await supabase
          .from('notifications')
          .insert({
            user_id: profileUserId,
            type: 'profile_view',
            title: 'Profile Viewed',
            message: `${viewerProfile?.full_name || 'Someone'} viewed your profile`,
            metadata: {
              viewer_id: user.id,
              viewer_name: viewerProfile?.full_name
            }
          })
      }

    } catch (error) {
      console.error('Error tracking profile view:', error)
    }
  }

  const getPostViews = async (postId: string) => {
    try {
      const { data, error } = await supabase
        .from('post_views')
        .select('id, created_at')
        .eq('post_id', postId)

      if (error) {
        console.error('Error fetching post views:', error)
        return 0
      }

      return data?.length || 0
    } catch (error) {
      console.error('Error fetching post views:', error)
      return 0
    }
  }

  const getProfileViews = async (profileUserId: string, days: number = 1) => {
    try {
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - days)

      const { data, error } = await supabase
        .from('profile_views')
        .select('id, viewed_at')
        .eq('profile_user_id', profileUserId)
        .gte('viewed_at', startDate.toISOString())

      if (error) {
        console.error('Error fetching profile views:', error)
        return 0
      }

      return data?.length || 0
    } catch (error) {
      console.error('Error fetching profile views:', error)
      return 0
    }
  }

  return {
    trackPostView,
    trackProfileView,
    getPostViews,
    getProfileViews
  }
}