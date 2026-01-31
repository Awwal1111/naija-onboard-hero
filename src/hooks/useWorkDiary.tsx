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
  is_approved: boolean
  approved_by: string | null
  approved_at: string | null
  payment_status: 'pending' | 'invoiced' | 'paid'
  created_at: string
  workroom_name?: string
  task_title?: string
}

export interface WorkDiaryStats {
  totalHours: number
  billableHours: number
  pendingHours: number
  paidHours: number
  totalEarnings: number
  pendingEarnings: number
  entriesCount: number
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
      
      // Enrich with workroom and task names
      const enriched = await Promise.all(
        (data || []).map(async (entry) => {
          let workroom_name = null
          let task_title = null

          if (entry.workroom_id) {
            const { data: workroom } = await supabase
              .from('workrooms')
              .select('name')
              .eq('id', entry.workroom_id)
              .single()
            workroom_name = workroom?.name
          }

          if (entry.task_id) {
            const { data: task } = await supabase
              .from('workroom_tasks')
              .select('title')
              .eq('id', entry.task_id)
              .single()
            task_title = task?.title
          }

          return {
            ...entry,
            payment_status: (entry.payment_status || 'pending') as WorkDiaryEntry['payment_status'],
            workroom_name,
            task_title
          }
        })
      )

      setEntries(enriched as WorkDiaryEntry[])

      // Check for active (unfinished) entry
      const active = (data || []).find(e => !e.ended_at)
      if (active) {
        setActiveEntry(active as WorkDiaryEntry)
        const startTime = new Date(active.started_at).getTime()
        setElapsedTime(Math.floor((Date.now() - startTime) / 1000))
      }
    } catch (error) {
      console.error('Error fetching work diary:', error)
    } finally {
      setLoading(false)
    }
  }

  const startTimer = async (context: { 
    workroomId?: string
    taskId?: string
    orderId?: string
    description?: string
    hourlyRate?: number
    billable?: boolean
  }) => {
    if (!user) return { error: 'Not authenticated' }
    if (activeEntry) return { error: 'Timer already running' }

    try {
      // Get hourly rate from workroom if available
      let rate = context.hourlyRate
      if (!rate && context.workroomId) {
        const { data: member } = await supabase
          .from('workroom_members')
          .select('hourly_rate')
          .eq('workroom_id', context.workroomId)
          .eq('user_id', user.id)
          .single()
        
        if (member?.hourly_rate) {
          rate = member.hourly_rate
        } else {
          const { data: workroom } = await supabase
            .from('workrooms')
            .select('hourly_rate')
            .eq('id', context.workroomId)
            .single()
          rate = workroom?.hourly_rate
        }
      }

      const { data, error } = await supabase
        .from('work_diary_entries')
        .insert([{
          user_id: user.id,
          workroom_id: context.workroomId,
          task_id: context.taskId,
          order_id: context.orderId,
          description: context.description,
          hourly_rate: rate,
          billable: context.billable ?? (rate ? true : false),
          started_at: new Date().toISOString(),
          is_manual: false
        }])
        .select()
        .single()

      if (error) throw error

      setActiveEntry(data as WorkDiaryEntry)
      setElapsedTime(0)
      
      toast({ 
        title: 'Timer Started ⏱️', 
        description: rate ? `Billing at NC ${rate}/hr` : 'Work diary is now tracking your time.' 
      })
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

      // Calculate earnings if billable
      const earnings = activeEntry.billable && activeEntry.hourly_rate 
        ? Math.round((durationMinutes / 60) * activeEntry.hourly_rate * 100) / 100 
        : 0

      setActiveEntry(null)
      setElapsedTime(0)
      
      toast({ 
        title: 'Timer Stopped ⏹️', 
        description: earnings > 0 
          ? `Logged ${durationMinutes} minutes. Pending earnings: NC ${earnings.toLocaleString()}`
          : `Logged ${durationMinutes} minutes.`
      })
      fetchEntries()
      return { success: true, duration: durationMinutes, earnings }
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
        .eq('payment_status', 'pending') // Can only delete pending entries

      if (error) throw error

      toast({ title: 'Entry Deleted' })
      fetchEntries()
      return { success: true }
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
      return { error: error.message }
    }
  }

  // Client approves time entries
  const approveEntry = async (entryId: string) => {
    if (!user) return { error: 'Not authenticated' }

    try {
      const { error } = await supabase
        .from('work_diary_entries')
        .update({
          is_approved: true,
          approved_by: user.id,
          approved_at: new Date().toISOString()
        })
        .eq('id', entryId)

      if (error) throw error

      toast({ title: 'Time Approved', description: 'The time entry has been approved for payment.' })
      fetchEntries()
      return { success: true }
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
      return { error: error.message }
    }
  }

  // Get entries pending approval (for clients)
  const getPendingApprovals = async (workroomId: string): Promise<WorkDiaryEntry[]> => {
    try {
      const { data, error } = await supabase
        .from('work_diary_entries')
        .select('*')
        .eq('workroom_id', workroomId)
        .eq('billable', true)
        .eq('is_approved', false)
        .not('ended_at', 'is', null)
        .order('started_at', { ascending: false })

      if (error) throw error
      return (data || []) as WorkDiaryEntry[]
    } catch (error) {
      console.error('Error fetching pending approvals:', error)
      return []
    }
  }

  // Bulk approve entries
  const bulkApproveEntries = async (entryIds: string[]) => {
    if (!user) return { error: 'Not authenticated' }

    try {
      const { error } = await supabase
        .from('work_diary_entries')
        .update({
          is_approved: true,
          approved_by: user.id,
          approved_at: new Date().toISOString()
        })
        .in('id', entryIds)

      if (error) throw error

      toast({ title: 'Entries Approved', description: `${entryIds.length} time entries approved.` })
      return { success: true }
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
      return { error: error.message }
    }
  }

  // Pay for approved entries
  const payForEntries = async (entryIds: string[], freelancerId: string) => {
    if (!user) return { error: 'Not authenticated' }

    try {
      // Calculate total amount
      const { data: entries, error: fetchError } = await supabase
        .from('work_diary_entries')
        .select('*')
        .in('id', entryIds)
        .eq('is_approved', true)
        .eq('payment_status', 'pending')

      if (fetchError) throw fetchError

      const totalAmount = (entries || []).reduce((sum, entry) => {
        if (!entry.billable || !entry.hourly_rate || !entry.duration_minutes) return sum
        return sum + (entry.duration_minutes / 60) * entry.hourly_rate
      }, 0)

      if (totalAmount <= 0) {
        toast({ title: 'No Billable Hours', description: 'No billable hours to pay.', variant: 'destructive' })
        return { error: 'No billable hours' }
      }

      // Check client balance
      const { data: profile } = await supabase
        .from('profiles')
        .select('wallet_balance')
        .eq('user_id', user.id)
        .single()

      const balance = Number(profile?.wallet_balance || 0)
      if (balance < totalAmount) {
        toast({ 
          title: 'Insufficient Balance', 
          description: `You need NC ${totalAmount.toFixed(0)} to pay for these hours. Your balance: NC ${balance.toFixed(0)}`,
          variant: 'destructive'
        })
        return { error: 'Insufficient balance' }
      }

      // Deduct from client
      await supabase
        .from('profiles')
        .update({
          wallet_balance: balance - totalAmount,
          balance_withdrawable: Math.max(0, balance - totalAmount)
        })
        .eq('user_id', user.id)

      // Credit freelancer
      const { data: freelancerProfile } = await supabase
        .from('profiles')
        .select('wallet_balance, balance_withdrawable')
        .eq('user_id', freelancerId)
        .single()

      const freelancerBalance = Number(freelancerProfile?.wallet_balance || 0)
      const freelancerWithdrawable = Number(freelancerProfile?.balance_withdrawable || 0)

      await supabase
        .from('profiles')
        .update({
          wallet_balance: freelancerBalance + totalAmount,
          balance_withdrawable: freelancerWithdrawable + totalAmount
        })
        .eq('user_id', freelancerId)

      // Record transactions
      await supabase.from('wallet_transactions').insert([
        {
          user_id: user.id,
          kind: 'hourly_payment',
          amount: totalAmount,
          status: 'completed',
          reference: `Payment for ${entryIds.length} time entries`
        },
        {
          user_id: freelancerId,
          kind: 'hourly_earning',
          amount: totalAmount,
          status: 'completed',
          reference: `Payment received for ${entryIds.length} time entries`
        }
      ])

      // Update entries as paid
      await supabase
        .from('work_diary_entries')
        .update({ payment_status: 'paid' })
        .in('id', entryIds)

      // Notify freelancer
      await supabase.from('notifications').insert([{
        user_id: freelancerId,
        title: '💰 Payment Received!',
        message: `You received NC ${totalAmount.toFixed(0)} for your logged hours`,
        type: 'payment',
        data: { amount: totalAmount, entry_count: entryIds.length }
      }])

      toast({ 
        title: 'Payment Successful! 💰', 
        description: `NC ${totalAmount.toFixed(0)} has been transferred to the freelancer.` 
      })
      return { success: true, amount: totalAmount }
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
      return { error: error.message }
    }
  }

  const getStats = (entries: WorkDiaryEntry[]): WorkDiaryStats => {
    const totalMinutes = entries.reduce((sum, e) => sum + (e.duration_minutes || 0), 0)
    const billableMinutes = entries.filter(e => e.billable).reduce((sum, e) => sum + (e.duration_minutes || 0), 0)
    const pendingMinutes = entries.filter(e => e.billable && e.payment_status === 'pending').reduce((sum, e) => sum + (e.duration_minutes || 0), 0)
    const paidMinutes = entries.filter(e => e.payment_status === 'paid').reduce((sum, e) => sum + (e.duration_minutes || 0), 0)
    
    const totalEarnings = entries.reduce((sum, e) => {
      if (!e.billable || !e.hourly_rate || !e.duration_minutes) return sum
      return sum + (e.duration_minutes / 60) * e.hourly_rate
    }, 0)

    const pendingEarnings = entries.filter(e => e.payment_status === 'pending').reduce((sum, e) => {
      if (!e.billable || !e.hourly_rate || !e.duration_minutes) return sum
      return sum + (e.duration_minutes / 60) * e.hourly_rate
    }, 0)

    return {
      totalHours: Math.round((totalMinutes / 60) * 10) / 10,
      billableHours: Math.round((billableMinutes / 60) * 10) / 10,
      pendingHours: Math.round((pendingMinutes / 60) * 10) / 10,
      paidHours: Math.round((paidMinutes / 60) * 10) / 10,
      totalEarnings: Math.round(totalEarnings * 100) / 100,
      pendingEarnings: Math.round(pendingEarnings * 100) / 100,
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
    approveEntry,
    getPendingApprovals,
    bulkApproveEntries,
    payForEntries,
    getStats
  }
}
