import { useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/use-toast'

export interface Milestone {
  id: string
  safepay_transaction_id: string | null
  order_id: string | null
  title: string
  description: string | null
  amount: number
  due_date: string | null
  status: 'pending' | 'in_progress' | 'submitted' | 'revision_requested' | 'approved' | 'released'
  deliverable_urls: string[] | null
  freelancer_notes: string | null
  client_feedback: string | null
  revision_count: number
  max_revisions: number
  order_index: number
  created_at: string
  completed_at: string | null
  released_at: string | null
}

export const useMilestones = () => {
  const { user } = useAuth()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)

  const getMilestones = async (orderId?: string, safepayId?: string): Promise<Milestone[]> => {
    try {
      let query = supabase
        .from('project_milestones')
        .select('*')
        .order('order_index', { ascending: true })

      if (orderId) {
        query = query.eq('order_id', orderId)
      } else if (safepayId) {
        query = query.eq('safepay_transaction_id', safepayId)
      }

      const { data, error } = await query

      if (error) throw error
      return (data || []) as Milestone[]
    } catch (error) {
      console.error('Error fetching milestones:', error)
      return []
    }
  }

  const createMilestones = async (projectData: {
    orderId?: string
    safepayId?: string
    milestones: { title: string; description?: string; amount: number; due_date?: string }[]
  }) => {
    if (!user) return { error: 'Not authenticated' }

    try {
      setLoading(true)

      const milestonesToInsert = projectData.milestones.map((m, index) => ({
        order_id: projectData.orderId,
        safepay_transaction_id: projectData.safepayId,
        title: m.title,
        description: m.description,
        amount: m.amount,
        due_date: m.due_date,
        order_index: index + 1
      }))

      const { data, error } = await supabase
        .from('project_milestones')
        .insert(milestonesToInsert)
        .select()

      if (error) throw error

      toast({ title: 'Milestones Created', description: `${milestonesToInsert.length} milestones have been set up.` })
      return { data }
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
      return { error: error.message }
    } finally {
      setLoading(false)
    }
  }

  const updateMilestone = async (milestoneId: string, updates: Partial<Milestone>) => {
    try {
      setLoading(true)

      const { error } = await supabase
        .from('project_milestones')
        .update(updates)
        .eq('id', milestoneId)

      if (error) throw error

      toast({ title: 'Milestone Updated' })
      return { success: true }
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
      return { error: error.message }
    } finally {
      setLoading(false)
    }
  }

  const submitMilestone = async (milestoneId: string, deliverables: string[], notes?: string) => {
    return updateMilestone(milestoneId, {
      status: 'submitted',
      deliverable_urls: deliverables,
      freelancer_notes: notes,
      completed_at: new Date().toISOString()
    })
  }

  const approveMilestone = async (milestoneId: string, feedback?: string) => {
    return updateMilestone(milestoneId, {
      status: 'approved',
      client_feedback: feedback
    })
  }

  const requestRevision = async (milestoneId: string, feedback: string) => {
    const milestones = await getMilestones()
    const milestone = milestones.find(m => m.id === milestoneId)
    
    if (milestone && milestone.revision_count >= milestone.max_revisions) {
      toast({ title: 'Max Revisions Reached', description: 'Consider approving or discussing with freelancer.', variant: 'destructive' })
      return { error: 'Max revisions reached' }
    }

    return updateMilestone(milestoneId, {
      status: 'revision_requested',
      client_feedback: feedback,
      revision_count: (milestone?.revision_count || 0) + 1
    })
  }

  const releaseMilestone = async (milestoneId: string) => {
    try {
      setLoading(true)
      const { data: milestone, error: lookupError } = await supabase
        .from('project_milestones')
        .select('order_id, safepay_transaction_id, status')
        .eq('id', milestoneId)
        .maybeSingle()

      if (lookupError) throw lookupError
      if (!milestone) throw new Error('Milestone not found')
      if (milestone.status !== 'approved') throw new Error('The buyer must approve this milestone before funds can be released')
      if (!milestone.order_id) {
        throw new Error('This release action only supports gig-order milestones. SafePay milestone release is not available here.')
      }

      const { data, error } = await supabase.rpc('release_gig_milestone', {
        p_milestone_id: milestoneId
      })
      if (error) throw error

      const result = data as { success?: boolean; error?: string; seller_amount?: number; remaining?: number }
      if (!result?.success) throw new Error(result?.error || 'Milestone payout failed')

      toast({
        title: 'Milestone funds released',
        description: 'NC ' + Number(result.seller_amount || 0).toLocaleString() + ' released to the expert.'
      })
      return { success: true, data: result }
    } catch (error: any) {
      toast({ title: 'Could not release milestone', description: error.message, variant: 'destructive' })
      return { error: error.message }
    } finally {
      setLoading(false)
    }
  }

  const getMilestoneProgress = (milestones: Milestone[]) => {
    if (!milestones.length) return { completed: 0, total: 0, percentage: 0, released_amount: 0, total_amount: 0 }

    const completed = milestones.filter(m => m.status === 'released').length
    const released_amount = milestones.filter(m => m.status === 'released').reduce((sum, m) => sum + m.amount, 0)
    const total_amount = milestones.reduce((sum, m) => sum + m.amount, 0)

    return {
      completed,
      total: milestones.length,
      percentage: Math.round((completed / milestones.length) * 100),
      released_amount,
      total_amount
    }
  }

  return {
    loading,
    getMilestones,
    createMilestones,
    updateMilestone,
    submitMilestone,
    approveMilestone,
    requestRevision,
    releaseMilestone,
    getMilestoneProgress
  }
}
