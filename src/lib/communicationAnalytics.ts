import { supabase } from '@/integrations/supabase/client'

export type ButtonType = 'whatsapp' | 'phone' | 'email' | 'google_meet' | 'facebook'

interface TrackClickParams {
  targetUserId: string
  buttonType: ButtonType
  sourcePage?: string
  sourceContext?: string
}

/**
 * Track a communication button click for analytics
 * This runs in the background and doesn't block UI
 */
export async function trackCommunicationClick({
  targetUserId,
  buttonType,
  sourcePage,
  sourceContext
}: TrackClickParams): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      console.log('Anonymous user clicked communication button:', buttonType)
      return
    }

    await supabase
      .from('communication_analytics')
      .insert({
        user_id: user.id,
        target_user_id: targetUserId,
        button_type: buttonType,
        source_page: sourcePage || window.location.pathname,
        source_context: sourceContext
      } as any)
  } catch (error) {
    // Silent fail - analytics shouldn't break the user experience
    console.error('Failed to track communication click:', error)
  }
}

/**
 * Get communication analytics summary for admin dashboard
 */
export async function getCommunicationAnalytics(days: number = 30) {
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)

  const { data, error } = await supabase
    .from('communication_analytics')
    .select('button_type, created_at')
    .gte('created_at', startDate.toISOString())
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Failed to fetch communication analytics:', error)
    return null
  }

  // Aggregate by button type
  const byType: Record<ButtonType, number> = {
    whatsapp: 0,
    phone: 0,
    email: 0,
    google_meet: 0,
    facebook: 0
  }

  const byDay: Record<string, number> = {}

  data?.forEach((row: any) => {
    byType[row.button_type as ButtonType]++
    
    const day = new Date(row.created_at).toISOString().split('T')[0]
    byDay[day] = (byDay[day] || 0) + 1
  })

  return {
    total: data?.length || 0,
    byType,
    byDay,
    rawData: data
  }
}
