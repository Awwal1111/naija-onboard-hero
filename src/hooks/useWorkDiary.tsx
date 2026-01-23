import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/use-toast'

export interface WorkDiaryEntry {
  id: string
  user_id: string
  workroom_id: string | null
  task_id: string | null
  order_id: string | null
  started_at: string
  ended_at: string | null
  duration_minutes: number | null
  description: string | null
  activity_level: number | null
  screenshot_url: string | null
  is_manual: boolean
  billable: boolean
  hourly_rate: number | null
  created_at: string
}

export const useWorkDiary = () => {
  const { user } = useAuth()
  const { toast } = useToast()
  const [entries, setEntries] = useState<WorkDiaryEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [activeEntry, setActiveEntry] = useState<WorkDiaryEntry | null>(null)
  const [elapsedTime, setElapsedTime] = useState(0)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  const fetchEntries = async (filters?: { workroomId?: string; orderId?: string; startDate?: string; endDate?: string }) => {
    if (!user) return

    try {
      let query = supabase
        .from('work_diary_entries')
        .select('*')
        .eq('user_id', user.id)
        .order('started_at', { ascending: false })

      if (filters?.workroomId) {
        query = query.eq('workroom_id', filters.workroomId)
      }
      if (filters?.orderId) {
        query = query.eq('order_id', filters.orderId)
      }
      if (filters?.startDate) {
        query = query.gte('started_at', filters.startDate)
      }
      if (filters?.endDate) {
        query = query.lte('started_at', filters.endDate)
      }

      const { data, error } = await query.limit(100)

      if (error) throw error
      setEntries(data || [])

      // Check for active (unfinished) entry
      const active = (data || []).find(e => !e.ended_at)
      if (active) {
        setActiveEntry(active)
        const startTime = new Date(active.started_at).getTime()
        setElapsedTime(Math.floor((Date.now() - startTime) / 1000))
      }
    } catch (error) {
      console.error('Error fetching work diary:', error)
    } finally {
      setLoading(false)
    }
  }

  const startTimer = async (context: { workroomId?: string; taskId?: string; orderId?: string; description?: string; hourlyRate?: number }) => {
    if (!user) return { error: 'Not authenticated' }
    if (activeEntry) return { error: 'Timer already running' }

    try {
      const { data, error } = await supabase
        .from('work_diary_entries')
        .insert([{
          user_id: user.id,
          workroom_id: context.workroomId,
          task_id: context.taskId,
          order_id: context.orderId,
          description: context.description,
          hourly_rate: context.hourlyRate,
          started_at: new Date().toISOString(),
          is_manual: false
        }])
        .select()
        .single()

      if (error) throw error

      setActiveEntry(data)
      setElapsedTime(0)
      toast({ title: 'Timer Started', description: 'Work diary is now tracking your time.' })
      return { data }
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
      return { error: error.message }
    }
  }

  const stopTimer = async (description?: string) => {
    if (!activeEntry) return { error: 'No active timer' }

    try {
      const endTime = new Date()
      const startTime = new Date(activeEntry.started_at)
      const durationMinutes = Math.round((endTime.getTime() - startTime.getTime()) / 60000)

      const { error } = await supabase
        .from('work_diary_entries')
        .update({
          ended_at: endTime.toISOString(),
          duration_minutes: durationMinutes,
          description: description || activeEntry.description
        })
        .eq('id', activeEntry.id)

      if (error) throw error

      setActiveEntry(null)
      setElapsedTime(0)
      toast({ title: 'Timer Stopped', description: `Logged ${durationMinutes} minutes.` })
      fetchEntries()
      return { success: true, duration: durationMinutes }
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
      return { error: error.message }
    }
  }

  const addManualEntry = async (entry: {
    workroomId?: string
    taskId?: string
    orderId?: string
    startedAt: string
    endedAt: string
    description: string
    hourlyRate?: number
    billable?: boolean
  }) => {
    if (!user) return { error: 'Not authenticated' }

    try {
      const startTime = new Date(entry.startedAt)
      const endTime = new Date(entry.endedAt)
      const durationMinutes = Math.round((endTime.getTime() - startTime.getTime()) / 60000)

      const { data, error } = await supabase
        .from('work_diary_entries')
        .insert([{
          user_id: user.id,
          workroom_id: entry.workroomId,
          task_id: entry.taskId,
          order_id: entry.orderId,
          started_at: entry.startedAt,
          ended_at: entry.endedAt,
          duration_minutes: durationMinutes,
          description: entry.description,
          hourly_rate: entry.hourlyRate,
          billable: entry.billable ?? true,
          is_manual: true
        }])
        .select()
        .single()

      if (error) throw error

      toast({ title: 'Entry Added', description: 'Manual time entry has been recorded.' })
      fetchEntries()
      return { data }
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
      return { error: error.message }
    }
  }

  const deleteEntry = async (entryId: string) => {
    try {
      const { error } = await supabase
        .from('work_diary_entries')
        .delete()
        .eq('id', entryId)
        .eq('user_id', user?.id)

      if (error) throw error

      toast({ title: 'Entry Deleted' })
      fetchEntries()
      return { success: true }
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
      return { error: error.message }
    }
  }

  const getStats = (entries: WorkDiaryEntry[]) => {
    const totalMinutes = entries.reduce((sum, e) => sum + (e.duration_minutes || 0), 0)
    const billableMinutes = entries.filter(e => e.billable).reduce((sum, e) => sum + (e.duration_minutes || 0), 0)
    const totalEarnings = entries.reduce((sum, e) => {
      if (!e.billable || !e.hourly_rate || !e.duration_minutes) return sum
      return sum + (e.duration_minutes / 60) * e.hourly_rate
    }, 0)

    return {
      totalHours: Math.round((totalMinutes / 60) * 10) / 10,
      billableHours: Math.round((billableMinutes / 60) * 10) / 10,
      totalEarnings: Math.round(totalEarnings * 100) / 100,
      entriesCount: entries.length
    }
  }

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  // Timer effect
  useEffect(() => {
    if (activeEntry) {
      timerRef.current = setInterval(() => {
        setElapsedTime(prev => prev + 1)
      }, 1000)
    } else if (timerRef.current) {
      clearInterval(timerRef.current)
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [activeEntry])

  useEffect(() => {
    fetchEntries()
  }, [user])

  return {
    entries,
    loading,
    activeEntry,
    elapsedTime,
    formattedTime: formatTime(elapsedTime),
    fetchEntries,
    startTimer,
    stopTimer,
    addManualEntry,
    deleteEntry,
    getStats
  }
}
