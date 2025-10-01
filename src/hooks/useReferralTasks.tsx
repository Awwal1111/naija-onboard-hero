import { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from './useAuth'
import { useToast } from './use-toast'

export interface ReferralTask {
  id: string
  title: string
  description: string
  reward: number
  status: string
  created_at: string
  updated_at: string
}

export interface ReferralSubmission {
  id: string
  user_id: string
  task_id: string
  proof_url?: string
  status: string
  admin_comment?: string
  created_at: string
  updated_at: string
  task?: ReferralTask
}

export const useReferralTasks = () => {
  const { user } = useAuth()
  const { toast } = useToast()
  const [tasks, setTasks] = useState<ReferralTask[]>([])
  const [submissions, setSubmissions] = useState<ReferralSubmission[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      fetchTasks()
      fetchSubmissions()
    }
  }, [user])

  const fetchTasks = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('referral_tasks')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false })

      if (error) throw error
      setTasks(data || [])
    } catch (error: any) {
      console.error('Error fetching referral tasks:', error)
      toast({
        title: "Error",
        description: "Failed to load referral tasks",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchSubmissions = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('referral_submissions')
        .select(`
          *,
          task:referral_tasks(*)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setSubmissions(data || [])
    } catch (error: any) {
      console.error('Error fetching submissions:', error)
    }
  }

  const submitTask = async (taskId: string, proofUrl: string) => {
    if (!user) return { success: false, error: 'Not authenticated' }

    try {
      const { error } = await supabase
        .from('referral_submissions')
        .insert({
          user_id: user.id,
          task_id: taskId,
          proof_url: proofUrl,
          status: 'pending'
        })

      if (error) throw error

      toast({
        title: "Success",
        description: "Task submitted successfully! Awaiting admin approval.",
      })

      fetchSubmissions()
      return { success: true }
    } catch (error: any) {
      console.error('Error submitting task:', error)
      toast({
        title: "Error",
        description: error.message || "Failed to submit task",
        variant: "destructive",
      })
      return { success: false, error: error.message }
    }
  }

  const hasSubmitted = (taskId: string) => {
    return submissions.some(sub => sub.task_id === taskId)
  }

  const getSubmissionStatus = (taskId: string) => {
    const submission = submissions.find(sub => sub.task_id === taskId)
    return submission?.status
  }

  return {
    tasks,
    submissions,
    loading,
    submitTask,
    hasSubmitted,
    getSubmissionStatus,
    refetch: () => {
      fetchTasks()
      fetchSubmissions()
    }
  }
}

// Admin hook
export const useAdminReferralTasks = () => {
  const { toast } = useToast()
  const [tasks, setTasks] = useState<ReferralTask[]>([])
  const [submissions, setSubmissions] = useState<ReferralSubmission[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAllTasks()
    fetchAllSubmissions()
  }, [])

  const fetchAllTasks = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('referral_tasks')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setTasks(data || [])
    } catch (error: any) {
      console.error('Error fetching all tasks:', error)
      toast({
        title: "Error",
        description: "Failed to load tasks",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchAllSubmissions = async () => {
    try {
      const { data, error } = await supabase
        .from('referral_submissions')
        .select(`
          *,
          task:referral_tasks(*)
        `)
        .order('created_at', { ascending: false })

      if (error) throw error
      setSubmissions(data || [])
    } catch (error: any) {
      console.error('Error fetching all submissions:', error)
    }
  }

  const createTask = async (taskData: Omit<ReferralTask, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const { error } = await supabase
        .from('referral_tasks')
        .insert(taskData)

      if (error) throw error

      toast({
        title: "Success",
        description: "Referral task created successfully!",
      })

      fetchAllTasks()
      return { success: true }
    } catch (error: any) {
      console.error('Error creating task:', error)
      toast({
        title: "Error",
        description: error.message || "Failed to create task",
        variant: "destructive",
      })
      return { success: false, error: error.message }
    }
  }

  const updateTask = async (id: string, updates: Partial<ReferralTask>) => {
    try {
      const { error } = await supabase
        .from('referral_tasks')
        .update(updates)
        .eq('id', id)

      if (error) throw error

      toast({
        title: "Success",
        description: "Task updated successfully!",
      })

      fetchAllTasks()
      return { success: true }
    } catch (error: any) {
      console.error('Error updating task:', error)
      toast({
        title: "Error",
        description: error.message || "Failed to update task",
        variant: "destructive",
      })
      return { success: false, error: error.message }
    }
  }

  const deleteTask = async (id: string) => {
    try {
      const { error } = await supabase
        .from('referral_tasks')
        .delete()
        .eq('id', id)

      if (error) throw error

      toast({
        title: "Success",
        description: "Task deleted successfully!",
      })

      fetchAllTasks()
      return { success: true }
    } catch (error: any) {
      console.error('Error deleting task:', error)
      toast({
        title: "Error",
        description: error.message || "Failed to delete task",
        variant: "destructive",
      })
      return { success: false, error: error.message }
    }
  }

  const approveSubmission = async (submissionId: string, reward: number) => {
    try {
      const { error: updateError } = await supabase
        .from('referral_submissions')
        .update({ 
          status: 'approved',
          admin_comment: 'Task approved and reward credited'
        })
        .eq('id', submissionId)

      if (updateError) throw updateError

      // Credit user wallet
      const submission = submissions.find(s => s.id === submissionId)
      if (submission) {
        const { error: walletError } = await supabase
          .from('wallet_transactions')
          .insert({
            user_id: submission.user_id,
            amount: reward,
            kind: 'credit',
            reference: `Referral task reward: ${submission.task?.title}`,
            status: 'completed'
          })

        if (walletError) throw walletError

        // Update user wallet balance in profiles table
        const { data: currentProfile } = await supabase
          .from('profiles')
          .select('wallet_balance')
          .eq('user_id', submission.user_id)
          .single()

        if (currentProfile) {
          const newBalance = (currentProfile.wallet_balance || 0) + reward
          await supabase
            .from('profiles')
            .update({ wallet_balance: newBalance })
            .eq('user_id', submission.user_id)
        }
      }

      toast({
        title: "Success",
        description: "Submission approved and reward credited!",
      })

      fetchAllSubmissions()
      return { success: true }
    } catch (error: any) {
      console.error('Error approving submission:', error)
      toast({
        title: "Error",
        description: error.message || "Failed to approve submission",
        variant: "destructive",
      })
      return { success: false, error: error.message }
    }
  }

  const rejectSubmission = async (submissionId: string, reason: string) => {
    try {
      const { error } = await supabase
        .from('referral_submissions')
        .update({ 
          status: 'rejected',
          admin_comment: reason
        })
        .eq('id', submissionId)

      if (error) throw error

      toast({
        title: "Success",
        description: "Submission rejected",
      })

      fetchAllSubmissions()
      return { success: true }
    } catch (error: any) {
      console.error('Error rejecting submission:', error)
      toast({
        title: "Error",
        description: error.message || "Failed to reject submission",
        variant: "destructive",
      })
      return { success: false, error: error.message }
    }
  }

  return {
    tasks,
    submissions,
    loading,
    createTask,
    updateTask,
    deleteTask,
    approveSubmission,
    rejectSubmission,
    refetch: () => {
      fetchAllTasks()
      fetchAllSubmissions()
    }
  }
}