import { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from './useAuth'
import { useToast } from './use-toast'
import { SocialTask } from './useProfile'

export interface TaskWithStatus extends SocialTask {
  userSubmission?: {
    status: string
    created_at: string
  }
}

export const useSocialTasks = () => {
  const { user } = useAuth()
  const { toast } = useToast()
  const [tasks, setTasks] = useState<TaskWithStatus[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      fetchTasks()
    }
  }, [user])

  const fetchTasks = async () => {
    try {
      const { data: tasksData, error: tasksError } = await supabase
        .from('social_tasks' as any)
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false })

      if (tasksError) throw tasksError

      // Fetch user's submission status for each task
      if (user && tasksData) {
        const { data: submissions } = await supabase
          .from('social_tasks_progress')
          .select('task_id, status, created_at')
          .eq('earner_id', user.id)

        const submissionMap = new Map(
          submissions?.map(s => [s.task_id, { status: s.status, created_at: s.created_at }]) || []
        )

        const tasksWithStatus = (tasksData as any[]).map((task: any) => ({
          ...task,
          userSubmission: submissionMap.get(task.id)
        }))

        setTasks(tasksWithStatus)
      } else {
        setTasks((tasksData as any) || [])
      }
    } catch (error) {
      console.error('Error fetching social tasks:', error)
      setTasks([])
      toast({
        title: "Info",
        description: "Social media tasks are not available right now",
        variant: "default",
      })
    } finally {
      setLoading(false)
    }
  }

  const claimTask = async (taskId: number) => {
    if (!user) return { success: false, error: 'Not authenticated' }

    try {
      // Check if user has already submitted this task
      const { data: existing } = await supabase
        .from('social_tasks_progress')
        .select('status')
        .eq('task_id', taskId)
        .eq('earner_id', user.id)
        .maybeSingle()

      if (existing) {
        toast({
          title: "Already Submitted",
          description: `Your submission is ${existing.status}. Please wait for admin approval.`,
          variant: "default",
        })
        return { success: false, error: 'Already submitted' }
      }

      // Create progress entry for the user with 'claimed' status
      const { error: progressError } = await supabase
        .from('social_tasks_progress' as any)
        .insert({
          task_id: taskId,
          earner_id: user.id,
          status: 'claimed'
        })

      if (progressError) throw progressError

      toast({
        title: "Success",
        description: "Task claimed successfully! Complete it and submit proof.",
      })

      fetchTasks() // Refresh to show updated status
      return { success: true }
    } catch (error: any) {
      console.error('Error claiming task:', error)
      
      if (error.code === '23505') { // Unique constraint violation
        toast({
          title: "Already Submitted",
          description: "You have already submitted this task. Please wait for admin approval.",
          variant: "default",
        })
        return { success: false, error: 'Already submitted' }
      }
      
      toast({
        title: "Error",
        description: error.message || "Failed to claim task",
        variant: "destructive",
      })
      return { success: false, error: error.message }
    }
  }

  const completeTask = async (taskId: number, screenshotUrl?: string, textExplanation?: string) => {
    if (!user) return { success: false, error: 'Not authenticated' }

    try {
      // Check if user has already submitted
      const { data: existing } = await supabase
        .from('social_tasks_progress')
        .select('status')
        .eq('task_id', taskId)
        .eq('earner_id', user.id)
        .maybeSingle()

      if (existing && existing.status === 'pending') {
        toast({
          title: "Already Submitted",
          description: "Your submission is pending. Please wait for admin approval.",
          variant: "default",
        })
        return { success: false, error: 'Already submitted' }
      }

      // If record exists (claimed), update it. Otherwise, insert a new one
      if (existing) {
        const { error } = await supabase
          .from('social_tasks_progress' as any)
          .update({
            status: 'pending',
            screenshot_url: screenshotUrl,
            text_explanation: textExplanation
          })
          .eq('task_id', taskId)
          .eq('earner_id', user.id)

        if (error) throw error
      } else {
        // User clicked "Submit Proof" without claiming first - insert directly
        const { error } = await supabase
          .from('social_tasks_progress' as any)
          .insert({
            task_id: taskId,
            earner_id: user.id,
            status: 'pending',
            screenshot_url: screenshotUrl,
            text_explanation: textExplanation
          })

        if (error) throw error
      }

      toast({
        title: "Success",
        description: "Task submitted! Awaiting admin approval.",
      })

      fetchTasks() // Refresh to show updated status
      return { success: true }
    } catch (error: any) {
      console.error('Error completing task:', error)
      toast({
        title: "Error",
        description: error.message || "Failed to complete task",
        variant: "destructive",
      })
      return { success: false, error: error.message }
    }
  }

  const createTask = async (taskData: Partial<SocialTask>) => {
    if (!user) return { success: false, error: 'Not authenticated' }

    try {
      // Calculate total task cost: total_slots * reward_amount
      const totalSlots = taskData.total_slots || 0
      const rewardAmount = (taskData as any).reward_amount || 0
      const totalCost = totalSlots * rewardAmount
      
      // Check if user has sufficient balance
      const { data: profile } = await supabase
        .from('profiles')
        .select('wallet_balance')
        .eq('user_id', user.id)
        .single()

      if (!profile || profile.wallet_balance < totalCost) {
        toast({
          title: "Insufficient Balance",
          description: `You need ${totalCost.toLocaleString()} NC to create this task (${totalSlots} slots × ${rewardAmount} NC)`,
          variant: "destructive",
        })
        return { success: false, error: 'Insufficient balance' }
      }

      // Deduct the total cost from user's balance
      const { error: deductError } = await supabase
        .from('profiles')
        .update({ wallet_balance: profile.wallet_balance - totalCost })
        .eq('user_id', user.id)

      if (deductError) throw deductError

      // Record the transaction
      await supabase
        .from('wallet_transactions')
        .insert({
          user_id: user.id,
          amount: -totalCost,
          kind: 'task_creation_fee',
          status: 'completed',
          reference: `Social media task creation (${totalSlots} slots × ${rewardAmount} NC)`
        })

      // Create the task
      const { data, error } = await supabase
        .from('social_tasks' as any)
        .insert({
          ...taskData,
          task_giver_id: user.id,
          status: 'active',
          done_slots: 0,
          reward: rewardAmount, // Set the NOT NULL column
          reward_amount: rewardAmount, // Also set this for consistency
          fee_paid: totalCost
        })
        .select()
        .single()

      if (error) {
        // REFUND THE MONEY if task creation failed
        await supabase
          .from('profiles')
          .update({ wallet_balance: profile.wallet_balance })
          .eq('user_id', user.id)
        
        await supabase
          .from('wallet_transactions')
          .insert({
            user_id: user.id,
            amount: totalCost,
            kind: 'refund',
            status: 'completed',
            reference: 'Refund: Social media task creation failed'
          })
        
        throw error
      }

      toast({
        title: "Task Created Successfully!",
        description: `Total of ${totalCost.toLocaleString()} NC deducted. Task is now live.`,
      })

      fetchTasks() // Refresh the list
      return { success: true, data }
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

  return {
    tasks,
    loading,
    claimTask,
    completeTask,
    createTask,
    refetch: fetchTasks
  }
}