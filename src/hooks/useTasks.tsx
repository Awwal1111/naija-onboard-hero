import { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from './useAuth'
import { useToast } from './use-toast'

export interface Task {
  id: string
  title: string
  description: string
  reward: number
  status: string
  created_at: string
  updated_at: string
  creator_id?: string
  total_slots: number
  done_slots: number
  is_admin_created: boolean
  fee_paid?: number
  creator?: {
    full_name: string
    profile_picture_url?: string
  }
}

export interface TaskSubmission {
  id: string
  user_id: string
  task_id: string
  proof_url?: string
  text_explanation?: string
  status: string
  admin_comment?: string
  created_at: string
  updated_at: string
  approved_by?: string
  approved_at?: string
  task?: Task
  user?: {
    full_name: string
    profile_picture_url?: string
  }
}

export const useTasks = () => {
  const { user } = useAuth()
  const { toast } = useToast()
  const [tasks, setTasks] = useState<Task[]>([])
  const [myTasks, setMyTasks] = useState<Task[]>([])
  const [submissions, setSubmissions] = useState<TaskSubmission[]>([])
  const [myTaskSubmissions, setMyTaskSubmissions] = useState<TaskSubmission[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      fetchTasks()
      fetchSubmissions()
      fetchMyTasks()
      fetchMyTaskSubmissions()
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
      
      // Filter out tasks where slots are full and fetch creator info
      const availableTasks: Task[] = []
      for (const task of data || []) {
        if ((task.done_slots || 0) < (task.total_slots || 1)) {
          let creatorInfo = undefined
          if (task.creator_id) {
            const { data: creator } = await supabase
              .from('profiles')
              .select('full_name, profile_picture_url')
              .eq('user_id', task.creator_id)
              .maybeSingle()
            if (creator) {
              creatorInfo = creator
            }
          }
          availableTasks.push({
            ...task,
            total_slots: task.total_slots || 1,
            done_slots: task.done_slots || 0,
            is_admin_created: task.is_admin_created ?? true,
            creator: creatorInfo
          } as Task)
        }
      }
      setTasks(availableTasks)
    } catch (error: any) {
      console.error('Error fetching tasks:', error)
      toast({
        title: "Error",
        description: "Failed to load tasks",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchMyTasks = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('referral_tasks')
        .select('*')
        .eq('creator_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setMyTasks(data as Task[] || [])
    } catch (error: any) {
      console.error('Error fetching my tasks:', error)
    }
  }

  const fetchMyTaskSubmissions = async () => {
    if (!user || myTasks.length === 0) return

    try {
      const taskIds = myTasks.map(t => t.id)
      const { data, error } = await supabase
        .from('referral_submissions')
        .select('*')
        .in('task_id', taskIds)
        .order('created_at', { ascending: false })

      if (error) throw error
      
      // Fetch user info for each submission
      const submissionsWithInfo: TaskSubmission[] = []
      for (const sub of data || []) {
        const { data: userInfo } = await supabase
          .from('profiles')
          .select('full_name, profile_picture_url')
          .eq('user_id', sub.user_id)
          .maybeSingle()
        
        const task = myTasks.find(t => t.id === sub.task_id)
        
        submissionsWithInfo.push({
          ...sub,
          user: userInfo || undefined,
          task: task
        } as TaskSubmission)
      }
      setMyTaskSubmissions(submissionsWithInfo)
    } catch (error: any) {
      console.error('Error fetching my task submissions:', error)
    }
  }

  const fetchSubmissions = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('referral_submissions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      
      // Fetch task info for each submission
      const submissionsWithTasks: TaskSubmission[] = []
      for (const sub of data || []) {
        const { data: taskInfo } = await supabase
          .from('referral_tasks')
          .select('*')
          .eq('id', sub.task_id)
          .maybeSingle()
        
        submissionsWithTasks.push({
          ...sub,
          task: taskInfo ? {
            ...taskInfo,
            total_slots: taskInfo.total_slots || 1,
            done_slots: taskInfo.done_slots || 0,
            is_admin_created: taskInfo.is_admin_created ?? true
          } as Task : undefined
        } as TaskSubmission)
      }
      setSubmissions(submissionsWithTasks)
    } catch (error: any) {
      console.error('Error fetching submissions:', error)
    }
  }

  const createTask = async (taskData: {
    title: string
    description: string
    reward: number
    total_slots: number
  }) => {
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to create a task",
        variant: "destructive",
      })
      return { success: false, error: 'Not authenticated' }
    }

    // Validate minimum reward per slot (20 NC)
    if (taskData.reward < 20) {
      toast({
        title: "Invalid Reward",
        description: "Minimum reward per slot is 20 NC",
        variant: "destructive",
      })
      return { success: false, error: 'Minimum reward is 20 NC' }
    }

    const totalCost = taskData.reward * taskData.total_slots

    try {
      // Check user's withdrawable balance
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('balance_withdrawable, wallet_balance')
        .eq('user_id', user.id)
        .single()

      if (profileError) throw profileError

      if (!profile || profile.balance_withdrawable < totalCost) {
        toast({
          title: "Insufficient Balance",
          description: `You need ${totalCost.toLocaleString()} NC withdrawable balance (${taskData.total_slots} slots × ${taskData.reward} NC)`,
          variant: "destructive",
        })
        return { success: false, error: 'Insufficient withdrawable balance' }
      }

      // Deduct from user's withdrawable balance
      const { error: deductError } = await supabase
        .from('profiles')
        .update({
          wallet_balance: profile.wallet_balance - totalCost,
          balance_withdrawable: profile.balance_withdrawable - totalCost
        })
        .eq('user_id', user.id)

      if (deductError) throw deductError

      // Create the task
      const { error: taskError } = await supabase
        .from('referral_tasks')
        .insert({
          title: taskData.title,
          description: taskData.description,
          reward: taskData.reward,
          total_slots: taskData.total_slots,
          done_slots: 0,
          creator_id: user.id,
          is_admin_created: false,
          fee_paid: totalCost,
          status: 'active'
        })

      if (taskError) {
        // Refund if task creation failed
        await supabase
          .from('profiles')
          .update({
            wallet_balance: profile.wallet_balance,
            balance_withdrawable: profile.balance_withdrawable
          })
          .eq('user_id', user.id)
        throw taskError
      }

      // Log the transaction
      await supabase
        .from('wallet_transactions')
        .insert({
          user_id: user.id,
          amount: -totalCost,
          kind: 'task_creation_fee',
          status: 'completed',
          reference: `Task creation: ${taskData.title} (${taskData.total_slots} slots × ${taskData.reward} NC)`
        })

      toast({
        title: "Task Created!",
        description: `${totalCost.toLocaleString()} NC deducted. Your task is now live.`,
      })

      fetchTasks()
      fetchMyTasks()
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

  const submitTask = async (taskId: string, proofUrl?: string, textExplanation?: string) => {
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to submit a task",
        variant: "destructive",
      })
      return { success: false, error: 'Not authenticated' }
    }

    if (!proofUrl && !textExplanation) {
      toast({
        title: "Error",
        description: "Please provide either a screenshot or text explanation",
        variant: "destructive",
      })
      return { success: false, error: 'No proof provided' }
    }

    try {
      const { error } = await supabase
        .from('referral_submissions')
        .insert({
          user_id: user.id,
          task_id: taskId,
          proof_url: proofUrl || null,
          text_explanation: textExplanation || null,
          status: 'pending'
        })

      if (error) throw error

      toast({
        title: "Task Submitted!",
        description: "Awaiting approval. For user tasks, you can also chat with the creator.",
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

  const approveSubmission = async (submissionId: string) => {
    if (!user) return { success: false, error: 'Not authenticated' }

    try {
      // Get submission details
      const { data: submission, error: fetchError } = await supabase
        .from('referral_submissions')
        .select(`
          *,
          task:referral_tasks!referral_submissions_task_id_fkey(reward, creator_id, title)
        `)
        .eq('id', submissionId)
        .single()

      if (fetchError) throw fetchError

      const task = submission.task as any

      // Verify caller is task creator
      if (task.creator_id !== user.id) {
        toast({
          title: "Error",
          description: "You can only approve submissions for your own tasks",
          variant: "destructive",
        })
        return { success: false, error: 'Not authorized' }
      }

      // Update submission status
      const { error: updateError } = await supabase
        .from('referral_submissions')
        .update({
          status: 'approved',
          approved_by: user.id,
          approved_at: new Date().toISOString(),
          admin_comment: 'Approved by task creator'
        })
        .eq('id', submissionId)

      if (updateError) throw updateError

      // Credit submitter's wallet (withdrawable)
      const { data: submitterProfile } = await supabase
        .from('profiles')
        .select('wallet_balance, balance_withdrawable')
        .eq('user_id', submission.user_id)
        .single()

      if (submitterProfile) {
        await supabase
          .from('profiles')
          .update({
            wallet_balance: (submitterProfile.wallet_balance || 0) + task.reward,
            balance_withdrawable: (submitterProfile.balance_withdrawable || 0) + task.reward
          })
          .eq('user_id', submission.user_id)

        // Log transaction
        await supabase
          .from('wallet_transactions')
          .insert({
            user_id: submission.user_id,
            amount: task.reward,
            kind: 'task_reward',
            status: 'completed',
            reference: `Task reward: ${task.title}`
          })
      }

      // Update task done_slots
      await supabase
        .from('referral_tasks')
        .update({ done_slots: supabase.rpc as any })
        .eq('id', submission.task_id)

      // Actually increment done_slots
      const { data: currentTask } = await supabase
        .from('referral_tasks')
        .select('done_slots')
        .eq('id', submission.task_id)
        .single()

      if (currentTask) {
        await supabase
          .from('referral_tasks')
          .update({ done_slots: (currentTask.done_slots || 0) + 1 })
          .eq('id', submission.task_id)
      }

      toast({
        title: "Approved!",
        description: `${task.reward} NC credited to the submitter`,
      })

      fetchMyTaskSubmissions()
      fetchTasks()
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
    if (!user) return { success: false, error: 'Not authenticated' }

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
        title: "Rejected",
        description: "Submission has been rejected",
      })

      fetchMyTaskSubmissions()
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

  const hasSubmitted = (taskId: string) => {
    return submissions.some(sub => sub.task_id === taskId)
  }

  const getSubmissionStatus = (taskId: string) => {
    const submission = submissions.find(sub => sub.task_id === taskId)
    return submission?.status
  }

  const getAdminComment = (taskId: string) => {
    const submission = submissions.find(sub => sub.task_id === taskId)
    return submission?.admin_comment
  }

  const startChatWithCreator = async (creatorId: string) => {
    if (!user || !creatorId) return null

    try {
      // Check if chat already exists
      const { data: existingChat } = await supabase
        .from('chats')
        .select('id')
        .or(`and(user1_id.eq.${user.id},user2_id.eq.${creatorId}),and(user1_id.eq.${creatorId},user2_id.eq.${user.id})`)
        .maybeSingle()

      if (existingChat) {
        return existingChat.id
      }

      // Create new chat
      const { data: newChat, error } = await supabase
        .from('chats')
        .insert({
          user1_id: user.id,
          user2_id: creatorId
        })
        .select('id')
        .single()

      if (error) throw error
      return newChat.id
    } catch (error) {
      console.error('Error creating chat:', error)
      return null
    }
  }

  return {
    tasks,
    myTasks,
    submissions,
    myTaskSubmissions,
    loading,
    createTask,
    submitTask,
    approveSubmission,
    rejectSubmission,
    hasSubmitted,
    getSubmissionStatus,
    getAdminComment,
    startChatWithCreator,
    refetch: () => {
      fetchTasks()
      fetchSubmissions()
      fetchMyTasks()
      fetchMyTaskSubmissions()
    }
  }
}
