import { supabase } from '@/integrations/supabase/client'

/**
 * Track when a user views another user's profile
 * This runs in the background and doesn't block UI
 */
export async function trackProfileView(profileOwnerId: string): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    
    // Don't track if not logged in or viewing own profile
    if (!user || user.id === profileOwnerId) {
      return
    }

    // Check if already viewed in last 24 hours (debounce)
    const oneDayAgo = new Date()
    oneDayAgo.setHours(oneDayAgo.getHours() - 24)

    const { data: existingView } = await supabase
      .from('profile_views')
      .select('id')
      .eq('profile_user_id', profileOwnerId)
      .eq('viewer_id', user.id)
      .gte('viewed_at', oneDayAgo.toISOString())
      .maybeSingle()

    if (existingView) {
      // Already tracked recently, skip
      return
    }

    // Insert new view
    await supabase
      .from('profile_views')
      .insert({
        profile_user_id: profileOwnerId,
        viewer_id: user.id,
        viewed_at: new Date().toISOString()
      })
  } catch (error) {
    // Silent fail - tracking shouldn't break the user experience
    console.error('Failed to track profile view:', error)
  }
}
