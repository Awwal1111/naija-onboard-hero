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
  created_at: string
  updated_at: string
  member_count?: number
  task_count?: number
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

export const useWorkrooms = () => {
  const { user } = useAuth()
  const { toast } = useToast()
  const [workrooms, setWorkrooms] = useState<Workroom[]>([])
  const [loading, setLoading] = useState(true)

  const fetchWorkrooms = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('workrooms')
        .select('*')
        .order('updated_at', { ascending: false })

      if (error) throw error

      const enriched = await Promise.all(
        (data || []).map(async (room) => {
          const [memberRes, taskRes] = await Promise.all([
            supabase.from('workroom_members').select('id', { count: 'exact' }).eq('workroom_id', room.id),
            supabase.from('workroom_tasks').select('id', { count: 'exact' }).eq('workroom_id', room.id)
          ])

          return {
            ...room,
            status: room.status as Workroom['status'],
            member_count: memberRes.count || 0,
            task_count: taskRes.count || 0
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

  const createWorkroom = async (data: { name: string; description?: string; project_type?: string; deadline?: string; total_budget?: number }) => {
    if (!user) return { error: 'Not authenticated' }

    try {
      const { data: room, error } = await supabase
        .from('workrooms')
        .insert([{ ...data, owner_id: user.id }])
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

      toast({ title: 'WorkRoom Created!', description: 'Start adding team members and tasks.' })
      fetchWorkrooms()
      return { data: room }
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
      return { error: error.message }
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
      toast({ title: 'Member Added', description: 'Team member has been added to the WorkRoom.' })
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
            user_name: profile?.full_name || 'Anonymous',
            user_avatar: profile?.profile_picture_url
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
      toast({ title: 'Task Created', description: 'New task has been added.' })
      return { data }
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
      return { error: error.message }
    }
  }

  const updateTask = async (taskId: string, updates: Partial<WorkroomTask>) => {
    try {
      const { error } = await supabase
        .from('workroom_tasks')
        .update({
          ...updates,
          completed_at: updates.status === 'done' ? new Date().toISOString() : null
        })
        .eq('id', taskId)

      if (error) throw error
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

  useEffect(() => {
    fetchWorkrooms()
  }, [user])

  return {
    workrooms,
    loading,
    fetchWorkrooms,
    createWorkroom,
    addMember,
    getWorkroomMembers,
    createTask,
    updateTask,
    getTasks,
    uploadFile,
    getFiles,
    addComment,
    getComments
  }
}
