import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'

export interface CollaborationRow {
  partner_id: string
  source: string // comma-separated: 'escrow,gig_order,chat'
  project_count: number
  total_amount: number
  last_completed_at: string | null
}

export interface CollaborationWithProfile extends CollaborationRow {
  partner: {
    user_id: string
    full_name: string | null
    profile_picture_url: string | null
    profession: string | null
  } | null
}

/**
 * Returns the list of users a person has completed projects with,
 * aggregated from escrow_payments, gig_orders, and project_completions.
 * Used for the "Worked With" section on profiles.
 */
export const useCollaborations = (userId: string | undefined) => {
  return useQuery({
    queryKey: ['collaborations', userId],
    enabled: !!userId,
    staleTime: 10 * 60 * 1000, // 10 min
    queryFn: async (): Promise<CollaborationWithProfile[]> => {
      if (!userId) return []

      const { data: rows, error } = await supabase.rpc('get_user_collaborations', {
        p_user_id: userId,
      })
      if (error) throw error
      const list = (rows ?? []) as CollaborationRow[]
      if (list.length === 0) return []

      const partnerIds = list.map((r) => r.partner_id)
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, profile_picture_url, profession')
        .in('user_id', partnerIds)
        .limit(100)

      const profileMap = new Map(
        (profiles ?? []).map((p) => [p.user_id, p])
      )

      return list.map((r) => ({
        ...r,
        partner: profileMap.get(r.partner_id) ?? null,
      }))
    },
  })
}
