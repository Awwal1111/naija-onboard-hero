import { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from './useAuth'
import { useToast } from './use-toast'
import { SocialTask } from './useProfile'

export const useSocialTasks = () => {
  const { user } = useAuth()
  const { toast } = useToast()
  const [tasks, setTasks] = useState<SocialTask[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchTasks()
  }, [])

  const fetchTasks = async () => {
    try {
      const { data, error } = await supabase
        .from('social_tasks' as any)
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false })

      if (error) throw error
      setTasks((data as any) || [])
    } catch (error) {
      console.error('Error fetching social tasks:', error)
      // Set empty array instead of crashing
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
      // Create progress entry for the user
      const { error: progressError } = await supabase
        .from('social_tasks_progress' as any)
        .insert({
          task_id: taskId,
          earner_id: user.id,
          status: 'pending'
        })

      if (progressError) throw progressError

      toast({
        title: "Success",
        description: "Task claimed successfully! Complete it and submit proof.",
      })

      return { success: true }
    } catch (error: any) {
      console.error('Error claiming task:', error)
      toast({
        title: "Error",
        description: error.message || "Failed to claim task",
        variant: "destructive",
      })
      return { success: false, error: error.message }
    }
  }

  const completeTask = async (taskId: number, screenshotUrl?: string) => {
    if (!user) return { success: false, error: 'Not authenticated' }

    try {
      const { error } = await supabase
        .from('social_tasks_progress' as any)
        .update({
          status: 'completed',
          screenshot_url: screenshotUrl
        })
        .eq('task_id', taskId)
        .eq('earner_id', user.id)

      if (error) throw error

      toast({
        title: "Success",
        description: "Task marked as completed! Awaiting verification.",
      })

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
      const { data, error } = await supabase
        .from('social_tasks' as any)
        .insert({
          ...taskData,
          task_giver_id: user.id,
          status: 'active',
          done_slots: 0
        })
        .select()
        .single()

      if (error) throw error

      toast({
        title: "Success",
        description: "Social media task created successfully!",
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