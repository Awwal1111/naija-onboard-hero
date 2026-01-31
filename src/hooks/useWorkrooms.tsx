import { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/use-toast'

export interface Workroom {
  id: string
  owner_id: string
  name: string
  description: string | null
  project_type: string | null
  status: 'active' | 'completed' | 'archived'
  total_budget: number
  spent_budget: number
  deadline: string | null
  job_id: string | null
  contract_id: string | null
  hourly_rate: number
  payment_type: 'fixed' | 'hourly' | 'milestone'
  created_at: string
  updated_at: string
  member_count?: number
  task_count?: number
  job_title?: string
}

export interface WorkroomMember {
  id: string
  workroom_id: string
  user_id: string
  role: 'owner' | 'freelancer' | 'collaborator' | 'viewer'
  permissions: string[]
  hourly_rate: number | null
  joined_at: string
  user_name?: string
  user_avatar?: string
  user_email?: string
}

export interface WorkroomTask {
  id: string
  workroom_id: string
  assigned_to: string | null
  created_by: string
  title: string
  description: string | null
  status: 'todo' | 'in_progress' | 'review' | 'done'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  due_date: string | null
  estimated_hours: number | null
  actual_hours: number
  completed_at: string | null
  created_at: string
  assignee_name?: string
  assignee_avatar?: string
}

export interface WorkroomFile {
  id: string
  workroom_id: string
  uploaded_by: string
  task_id: string | null
  file_name: string
  file_url: string
  file_type: string | null
  file_size: number | null
  version: number
  created_at: string
  uploader_name?: string
}

export interface WorkroomComment {
  id: string
  workroom_id: string
  user_id: string
  task_id: string | null
  file_id: string | null
  content: string
  mentions: string[]
  created_at: string
  user_name?: string
  user_avatar?: string
}

export interface WorkroomActivity {
  id: string
  workroom_id: string
  user_id: string
  activity_type: string
  description: string
  related_task_id: string | null
  related_file_id: string | null
  metadata: any
  created_at: string
}

export const useWorkrooms = () => {
  const { user } = useAuth()
  const { toast } = useToast()
  const [workrooms, setWorkrooms] = useState<Workroom[]>([])
  const [loading, setLoading] = useState(true)

  const fetchWorkrooms = async () => {
    if (!user) return

    try {
      // Fetch workrooms where user is a member or owner
      const { data: memberData } = await supabase
        .from('workroom_members')
        .select('workroom_id')
        .eq('user_id', user.id)

      const memberWorkroomIds = (memberData || []).map(m => m.workroom_id)
      
      const { data, error } = await supabase
        .from('workrooms')
        .select('*')
        .or(`owner_id.eq.${user.id},id.in.(${memberWorkroomIds.length > 0 ? memberWorkroomIds.join(',') : '00000000-0000-0000-0000-000000000000'})`)
        .order('updated_at', { ascending: false })

      if (error) throw error

      const enriched = await Promise.all(
        (data || []).map(async (room) => {
          const [memberRes, taskRes, jobRes] = await Promise.all([
            supabase.from('workroom_members').select('id', { count: 'exact' }).eq('workroom_id', room.id),
            supabase.from('workroom_tasks').select('id', { count: 'exact' }).eq('workroom_id', room.id),
            room.job_id ? supabase.from('jobs').select('title').eq('id', room.job_id).single() : Promise.resolve({ data: null })
          ])

          return {
            ...room,
            status: room.status as Workroom['status'],
            payment_type: (room.payment_type || 'fixed') as Workroom['payment_type'],
            member_count: memberRes.count || 0,
            task_count: taskRes.count || 0,
            job_title: jobRes.data?.title
          } as Workroom
        })
      )

      setWorkrooms(enriched)
    } catch (error) {
      console.error('Error fetching workrooms:', error)
    } finally {
      setLoading(false)
    }
  }

  const createWorkroom = async (data: { 
    name: string
    description?: string
    project_type?: string
    deadline?: string
    total_budget?: number
    job_id?: string
    hourly_rate?: number
    payment_type?: 'fixed' | 'hourly' | 'milestone'
  }) => {
    if (!user) return { error: 'Not authenticated' }

    try {
      const { data: room, error } = await supabase
        .from('workrooms')
        .insert([{ 
          ...data, 
          owner_id: user.id,
          hourly_rate: data.hourly_rate || 0,
          payment_type: data.payment_type || 'fixed'
        }])
        .select()
        .single()

      if (error) throw error

      // Add owner as a member
      await supabase.from('workroom_members').insert([{
        workroom_id: room.id,
        user_id: user.id,
        role: 'owner',
        permissions: ['read', 'write', 'comment', 'upload', 'manage']
      }])

      // Log activity
      await logActivity(room.id, 'workroom_created', `WorkRoom "${room.name}" was created`)

      toast({ title: 'WorkRoom Created!', description: 'Start adding team members and tasks.' })
      fetchWorkrooms()
      return { data: room }
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
      return { error: error.message }
    }
  }

  const createWorkroomFromJob = async (jobId: string, freelancerId: string, hourlyRate?: number) => {
    if (!user) return { error: 'Not authenticated' }

    try {
      // Get job details
      const { data: job, error: jobError } = await supabase
        .from('jobs')
        .select('title, description, salary_min')
        .eq('id', jobId)
        .single()

      if (jobError) throw jobError

      const jobTitle = (job as any)?.title || 'Untitled Project'
      const jobDescription = (job as any)?.description || ''
      const jobBudget = (job as any)?.salary_min || 0

      // Get freelancer profile
      const { data: freelancerProfile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('user_id', freelancerId)
        .single()

      // Create workroom
      const { data: room, error } = await supabase
        .from('workrooms')
        .insert([{
          name: jobTitle,
          description: jobDescription,
          owner_id: user.id,
          job_id: jobId,
          total_budget: jobBudget,
          hourly_rate: hourlyRate || 0,
          payment_type: hourlyRate ? 'hourly' : 'fixed'
        }])
        .select()
        .single()

      if (error) throw error

      // Add owner and freelancer as members
      await supabase.from('workroom_members').insert([
        {
          workroom_id: room.id,
          user_id: user.id,
          role: 'owner',
          permissions: ['read', 'write', 'comment', 'upload', 'manage']
        },
        {
          workroom_id: room.id,
          user_id: freelancerId,
          role: 'freelancer',
          hourly_rate: hourlyRate,
          permissions: ['read', 'write', 'comment', 'upload']
        }
      ])

      // Log activity
      await logActivity(room.id, 'workroom_created', `WorkRoom created for job: ${jobTitle}`)

      // Notify freelancer
      await supabase.from('notifications').insert([{
        user_id: freelancerId,
        title: '🎉 You\'ve Been Added to a WorkRoom!',
        message: `You were added to the "${jobTitle}" project. Start collaborating now!`,
        type: 'workroom',
        data: { workroom_id: room.id, job_id: jobId }
      }])

      toast({ title: 'WorkRoom Created!', description: `Added ${(freelancerProfile as any)?.full_name || 'freelancer'} to the project.` })
      fetchWorkrooms()
      return { data: room }
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
      return { error: error.message }
    }
  }

  const logActivity = async (workroomId: string, activityType: string, description: string, taskId?: string, fileId?: string) => {
    if (!user) return

    try {
      await supabase.from('workroom_activities').insert([{
        workroom_id: workroomId,
        user_id: user.id,
        activity_type: activityType,
        description,
        related_task_id: taskId,
        related_file_id: fileId
      }])
    } catch (error) {
      console.error('Error logging activity:', error)
    }
  }

  const addMember = async (workroomId: string, userId: string, role: 'freelancer' | 'collaborator' | 'viewer' = 'freelancer', hourlyRate?: number) => {
    try {
      const { error } = await supabase
        .from('workroom_members')
        .insert([{
          workroom_id: workroomId,
          user_id: userId,
          role,
          hourly_rate: hourlyRate,
          permissions: role === 'freelancer' ? ['read', 'write', 'comment', 'upload'] : ['read', 'comment']
        }])

      if (error) throw error

      // Get member profile for notification
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('user_id', userId)
        .single()

      // Log activity
      await logActivity(workroomId, 'member_added', `${profile?.full_name || 'A new member'} joined the team`)

      // Notify new member
      const workroom = workrooms.find(w => w.id === workroomId)
      await supabase.from('notifications').insert([{
        user_id: userId,
        title: '🎉 You\'ve Been Added to a WorkRoom!',
        message: `You were added to "${workroom?.name || 'a project'}" as ${role}`,
        type: 'workroom',
        data: { workroom_id: workroomId }
      }])

      toast({ title: 'Member Added', description: 'Team member has been added to the WorkRoom.' })
      return { success: true }
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
      return { error: error.message }
    }
  }

  const removeMember = async (workroomId: string, userId: string) => {
    try {
      const { error } = await supabase
        .from('workroom_members')
        .delete()
        .eq('workroom_id', workroomId)
        .eq('user_id', userId)
        .neq('role', 'owner') // Can't remove owner

      if (error) throw error

      await logActivity(workroomId, 'member_removed', 'A member was removed from the team')
      toast({ title: 'Member Removed' })
      return { success: true }
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
      return { error: error.message }
    }
  }

  const getWorkroomMembers = async (workroomId: string): Promise<WorkroomMember[]> => {
    try {
      const { data, error } = await supabase
        .from('workroom_members')
        .select('*')
        .eq('workroom_id', workroomId)

      if (error) throw error

      const enriched = await Promise.all(
        (data || []).map(async (member) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, profile_picture_url')
            .eq('user_id', member.user_id)
            .single()

          return {
            ...member,
            user_name: (profile as any)?.full_name || 'Anonymous',
            user_avatar: (profile as any)?.profile_picture_url,
            user_email: ''
          }
        })
      )

      return enriched as WorkroomMember[]
    } catch (error) {
      console.error('Error fetching members:', error)
      return []
    }
  }

  const createTask = async (workroomId: string, task: { title: string; description?: string; assigned_to?: string; priority?: string; due_date?: string; estimated_hours?: number }) => {
    if (!user) return { error: 'Not authenticated' }

    try {
      const { data, error } = await supabase
        .from('workroom_tasks')
        .insert([{
          workroom_id: workroomId,
          created_by: user.id,
          ...task
        }])
        .select()
        .single()

      if (error) throw error

      await logActivity(workroomId, 'task_created', `Task "${task.title}" was created`, data.id)

      // Notify assignee if assigned
      if (task.assigned_to && task.assigned_to !== user.id) {
        const workroom = workrooms.find(w => w.id === workroomId)
        await supabase.from('notifications').insert([{
          user_id: task.assigned_to,
          title: '📋 New Task Assigned',
          message: `You've been assigned "${task.title}" in ${workroom?.name || 'a project'}`,
          type: 'workroom',
          data: { workroom_id: workroomId, task_id: data.id }
        }])
      }

      toast({ title: 'Task Created', description: 'New task has been added.' })
      return { data }
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
      return { error: error.message }
    }
  }

  const updateTask = async (taskId: string, updates: Partial<WorkroomTask>) => {
    try {
      // Get task for logging
      const { data: task } = await supabase
        .from('workroom_tasks')
        .select('workroom_id, title, status, assigned_to')
        .eq('id', taskId)
        .single()

      const { error } = await supabase
        .from('workroom_tasks')
        .update({
          ...updates,
          completed_at: updates.status === 'done' ? new Date().toISOString() : null
        })
        .eq('id', taskId)

      if (error) throw error

      // Log status changes
      if (task && updates.status && updates.status !== task.status) {
        await logActivity(task.workroom_id, 'task_status_changed', `Task "${task.title}" moved to ${updates.status}`, taskId)

        // Notify owner if task completed
        if (updates.status === 'done') {
          const workroom = workrooms.find(w => w.id === task.workroom_id)
          if (workroom && workroom.owner_id !== user?.id) {
            await supabase.from('notifications').insert([{
              user_id: workroom.owner_id,
              title: '✅ Task Completed',
              message: `"${task.title}" has been marked as done in ${workroom.name}`,
              type: 'workroom',
              data: { workroom_id: task.workroom_id, task_id: taskId }
            }])
          }
        }
      }

      return { success: true }
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
      return { error: error.message }
    }
  }

  const getTasks = async (workroomId: string): Promise<WorkroomTask[]> => {
    try {
      const { data, error } = await supabase
        .from('workroom_tasks')
        .select('*')
        .eq('workroom_id', workroomId)
        .order('created_at', { ascending: false })

      if (error) throw error

      const enriched = await Promise.all(
        (data || []).map(async (task) => {
          if (!task.assigned_to) return task

          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, profile_picture_url')
            .eq('user_id', task.assigned_to)
            .single()

          return {
            ...task,
            assignee_name: profile?.full_name,
            assignee_avatar: profile?.profile_picture_url
          }
        })
      )

      return enriched as WorkroomTask[]
    } catch (error) {
      console.error('Error fetching tasks:', error)
      return []
    }
  }

  const uploadFile = async (workroomId: string, file: { file_name: string; file_url: string; file_type?: string; file_size?: number; task_id?: string }) => {
    if (!user) return { error: 'Not authenticated' }

    try {
      const { data, error } = await supabase
        .from('workroom_files')
        .insert([{
          workroom_id: workroomId,
          uploaded_by: user.id,
          ...file
        }])
        .select()
        .single()

      if (error) throw error

      await logActivity(workroomId, 'file_uploaded', `File "${file.file_name}" was uploaded`, file.task_id, data.id)

      return { data }
    } catch (error: any) {
      return { error: error.message }
    }
  }

  const getFiles = async (workroomId: string): Promise<WorkroomFile[]> => {
    try {
      const { data, error } = await supabase
        .from('workroom_files')
        .select('*')
        .eq('workroom_id', workroomId)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching files:', error)
      return []
    }
  }

  const addComment = async (workroomId: string, content: string, taskId?: string, fileId?: string) => {
    if (!user) return { error: 'Not authenticated' }

    try {
      const { data, error } = await supabase
        .from('workroom_comments')
        .insert([{
          workroom_id: workroomId,
          user_id: user.id,
          content,
          task_id: taskId,
          file_id: fileId
        }])
        .select()
        .single()

      if (error) throw error

      await logActivity(workroomId, 'comment_added', 'New comment added', taskId, fileId)

      return { data }
    } catch (error: any) {
      return { error: error.message }
    }
  }

  const getComments = async (workroomId: string, taskId?: string): Promise<WorkroomComment[]> => {
    try {
      let query = supabase
        .from('workroom_comments')
        .select('*')
        .eq('workroom_id', workroomId)
        .order('created_at', { ascending: true })

      if (taskId) {
        query = query.eq('task_id', taskId)
      }

      const { data, error } = await query

      if (error) throw error

      const enriched = await Promise.all(
        (data || []).map(async (comment) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, profile_picture_url')
            .eq('user_id', comment.user_id)
            .single()

          return {
            ...comment,
            user_name: profile?.full_name || 'Anonymous',
            user_avatar: profile?.profile_picture_url
          }
        })
      )

      return enriched as WorkroomComment[]
    } catch (error) {
      console.error('Error fetching comments:', error)
      return []
    }
  }

  const getActivities = async (workroomId: string): Promise<WorkroomActivity[]> => {
    try {
      const { data, error } = await supabase
        .from('workroom_activities')
        .select('*')
        .eq('workroom_id', workroomId)
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching activities:', error)
      return []
    }
  }

  const completeWorkroom = async (workroomId: string) => {
    try {
      const { error } = await supabase
        .from('workrooms')
        .update({ status: 'completed' })
        .eq('id', workroomId)

      if (error) throw error

      await logActivity(workroomId, 'workroom_completed', 'Project marked as completed')

      // Notify all members
      const members = await getWorkroomMembers(workroomId)
      const workroom = workrooms.find(w => w.id === workroomId)
      
      for (const member of members) {
        if (member.user_id !== user?.id) {
          await supabase.from('notifications').insert([{
            user_id: member.user_id,
            title: '🎉 Project Completed!',
            message: `The project "${workroom?.name}" has been marked as completed`,
            type: 'workroom',
            data: { workroom_id: workroomId }
          }])
        }
      }

      toast({ title: 'Project Completed!', description: 'Great job! The project has been marked as complete.' })
      fetchWorkrooms()
      return { success: true }
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
      return { error: error.message }
    }
  }

  useEffect(() => {
    fetchWorkrooms()
  }, [user])

  return {
    workrooms,
    loading,
    fetchWorkrooms,
    createWorkroom,
    createWorkroomFromJob,
    addMember,
    removeMember,
    getWorkroomMembers,
    createTask,
    updateTask,
    getTasks,
    uploadFile,
    getFiles,
    addComment,
    getComments,
    getActivities,
    completeWorkroom
  }
}
