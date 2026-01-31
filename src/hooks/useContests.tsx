import { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/use-toast'

export interface Contest {
  id: string
  client_id: string
  title: string
  description: string
  category: string
  prize_amount: number
  escrow_funded: boolean
  escrow_amount_held: number
  deadline: string
  status: 'draft' | 'open' | 'judging' | 'completed' | 'cancelled'
  winner_id: string | null
  winning_submission_id: string | null
  max_submissions: number
  requirements: string[]
  style_preferences: string[]
  prize_distribution_status: string
  created_at: string
  updated_at: string
  client_name?: string
  client_avatar?: string
  submission_count?: number
}

export interface ContestSubmission {
  id: string
  contest_id: string
  freelancer_id: string
  title: string
  description: string
  file_urls: string[]
  preview_url: string
  status: 'submitted' | 'shortlisted' | 'winner' | 'rejected'
  client_rating: number | null
  client_feedback: string | null
  created_at: string
  freelancer_name?: string
  freelancer_avatar?: string
}

export const useContests = () => {
  const { user } = useAuth()
  const { toast } = useToast()
  const [contests, setContests] = useState<Contest[]>([])
  const [loading, setLoading] = useState(true)
  const [myContests, setMyContests] = useState<Contest[]>([])
  const [userBalance, setUserBalance] = useState(0)

  // Fetch user wallet balance
  const fetchUserBalance = async () => {
    if (!user) return 0
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('wallet_balance')
        .eq('user_id', user.id)
        .single()
      
      if (error) throw error
      const balance = Number(data?.wallet_balance || 0)
      setUserBalance(balance)
      return balance
    } catch (error) {
      console.error('Error fetching balance:', error)
      return 0
    }
  }

  const fetchContests = async (category?: string) => {
    try {
      let query = supabase
        .from('contests')
        .select('*')
        .eq('status', 'open')
        .eq('escrow_funded', true) // Only show funded contests
        .order('prize_amount', { ascending: false })

      if (category && category !== 'all') {
        query = query.eq('category', category)
      }

      const { data, error } = await query

      if (error) throw error

      // Fetch client info and submission counts
      const enrichedContests = await Promise.all(
        (data || []).map(async (contest) => {
          const [profileRes, submissionRes] = await Promise.all([
            supabase.from('profiles').select('full_name, profile_picture_url').eq('user_id', contest.client_id).single(),
            supabase.from('contest_submissions').select('id', { count: 'exact' }).eq('contest_id', contest.id)
          ])

          return {
            ...contest,
            status: contest.status as Contest['status'],
            client_name: profileRes.data?.full_name || 'Anonymous',
            client_avatar: profileRes.data?.profile_picture_url,
            submission_count: submissionRes.count || 0
          } as Contest
        })
      )

      setContests(enrichedContests)
    } catch (error) {
      console.error('Error fetching contests:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchMyContests = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('contests')
        .select('*')
        .eq('client_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setMyContests((data || []) as Contest[])
    } catch (error) {
      console.error('Error fetching my contests:', error)
    }
  }

  const createContest = async (contestData: Partial<Contest>) => {
    if (!user) return { error: 'Not authenticated' }

    // First check wallet balance
    const currentBalance = await fetchUserBalance()
    const prizeAmount = contestData.prize_amount || 5000
    
    if (currentBalance < prizeAmount) {
      toast({ 
        title: 'Insufficient Balance', 
        description: `You need NC ${prizeAmount.toLocaleString()} to create this contest. Your balance: NC ${currentBalance.toLocaleString()}. Please top up your wallet first.`, 
        variant: 'destructive' 
      })
      return { error: 'Insufficient balance' }
    }

    try {
      const insertData = {
        title: contestData.title || '',
        description: contestData.description || '',
        category: contestData.category || '',
        prize_amount: prizeAmount,
        deadline: contestData.deadline || new Date().toISOString(),
        client_id: user.id,
        requirements: contestData.requirements || [],
        style_preferences: contestData.style_preferences || [],
        max_submissions: contestData.max_submissions || 50
      }

      const { data, error } = await supabase
        .from('contests')
        .insert([insertData])
        .select()
        .single()

      if (error) {
        // Check for insufficient balance error from trigger
        if (error.message.includes('Insufficient wallet balance')) {
          toast({ 
            title: 'Insufficient Balance', 
            description: error.message, 
            variant: 'destructive' 
          })
          return { error: error.message }
        }
        throw error
      }

      // Log activity
      await supabase.from('contest_activities').insert([{
        contest_id: data.id,
        user_id: user.id,
        activity_type: 'contest_created',
        description: `Contest "${data.title}" created with NC ${prizeAmount} prize`
      }])

      toast({ 
        title: 'Contest Created! 🎉', 
        description: `NC ${prizeAmount.toLocaleString()} has been held in escrow. Your contest is now live!` 
      })
      fetchMyContests()
      fetchUserBalance()
      return { data }
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
      return { error: error.message }
    }
  }

  const cancelContest = async (contestId: string) => {
    if (!user) return { error: 'Not authenticated' }

    try {
      const { error } = await supabase
        .from('contests')
        .update({ status: 'cancelled' })
        .eq('id', contestId)
        .eq('client_id', user.id)
        .is('winner_id', null) // Can only cancel if no winner

      if (error) throw error

      toast({ 
        title: 'Contest Cancelled', 
        description: 'Your escrow funds have been refunded to your wallet.' 
      })
      fetchMyContests()
      fetchUserBalance()
      return { success: true }
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
      return { error: error.message }
    }
  }

  const submitToContest = async (contestId: string, submission: { title: string; description: string; file_urls: string[]; preview_url: string }) => {
    if (!user) return { error: 'Not authenticated' }

    try {
      // Check if contest is still open and funded
      const { data: contest, error: contestError } = await supabase
        .from('contests')
        .select('status, escrow_funded, title, client_id')
        .eq('id', contestId)
        .single()

      if (contestError) throw contestError
      
      if (contest.status !== 'open') {
        toast({ title: 'Contest Closed', description: 'This contest is no longer accepting submissions.', variant: 'destructive' })
        return { error: 'Contest closed' }
      }

      if (!contest.escrow_funded) {
        toast({ title: 'Contest Not Funded', description: 'This contest has not been funded yet.', variant: 'destructive' })
        return { error: 'Not funded' }
      }

      const { data, error } = await supabase
        .from('contest_submissions')
        .insert([{
          contest_id: contestId,
          freelancer_id: user.id,
          ...submission
        }])
        .select()
        .single()

      if (error) throw error

      // Log activity
      await supabase.from('contest_activities').insert([{
        contest_id: contestId,
        user_id: user.id,
        activity_type: 'submission_received',
        description: `New entry submitted: "${submission.title}"`
      }])

      // Notify contest owner
      await supabase.from('notifications').insert([{
        user_id: contest.client_id,
        title: '📬 New Contest Entry!',
        message: `Someone submitted an entry to your contest "${contest.title}"`,
        type: 'contest',
        data: { contest_id: contestId, submission_id: data.id }
      }])

      toast({ title: 'Submission Received! 🎨', description: 'Good luck! The client will review your work.' })
      return { data }
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
      return { error: error.message }
    }
  }

  const getContestSubmissions = async (contestId: string) => {
    try {
      const { data, error } = await supabase
        .from('contest_submissions')
        .select('*')
        .eq('contest_id', contestId)
        .order('created_at', { ascending: false })

      if (error) throw error

      const enriched = await Promise.all(
        (data || []).map(async (sub) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, profile_picture_url')
            .eq('user_id', sub.freelancer_id)
            .single()

          return {
            ...sub,
            freelancer_name: profile?.full_name || 'Anonymous',
            freelancer_avatar: profile?.profile_picture_url
          }
        })
      )

      return enriched as ContestSubmission[]
    } catch (error) {
      console.error('Error fetching submissions:', error)
      return []
    }
  }

  const shortlistSubmission = async (contestId: string, submissionId: string) => {
    if (!user) return { error: 'Not authenticated' }

    try {
      const { error } = await supabase
        .from('contest_submissions')
        .update({ status: 'shortlisted' })
        .eq('id', submissionId)

      if (error) throw error

      // Get freelancer ID for notification
      const { data: submission } = await supabase
        .from('contest_submissions')
        .select('freelancer_id, title')
        .eq('id', submissionId)
        .single()

      if (submission) {
        await supabase.from('notifications').insert([{
          user_id: submission.freelancer_id,
          title: '⭐ Your Entry Was Shortlisted!',
          message: `Your entry "${submission.title}" has been shortlisted! You're in the running to win!`,
          type: 'contest',
          data: { contest_id: contestId, submission_id: submissionId }
        }])
      }

      toast({ title: 'Shortlisted!', description: 'Entry has been added to shortlist.' })
      return { success: true }
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
      return { error: error.message }
    }
  }

  const selectWinner = async (contestId: string, submissionId: string, winnerId: string) => {
    if (!user) return { error: 'Not authenticated' }

    try {
      // Update contest - this triggers prize distribution
      const { error: contestError } = await supabase
        .from('contests')
        .update({
          status: 'completed',
          winner_id: winnerId,
          winning_submission_id: submissionId
        })
        .eq('id', contestId)
        .eq('client_id', user.id)

      if (contestError) throw contestError

      // Update submission status
      await supabase
        .from('contest_submissions')
        .update({ status: 'winner' })
        .eq('id', submissionId)

      // Log activity
      await supabase.from('contest_activities').insert([{
        contest_id: contestId,
        user_id: user.id,
        activity_type: 'winner_selected',
        description: 'Contest winner has been selected and prize distributed'
      }])

      toast({ 
        title: '🏆 Winner Selected!', 
        description: 'The prize has been automatically transferred to the winner\'s wallet.' 
      })
      fetchMyContests()
      return { success: true }
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
      return { error: error.message }
    }
  }

  const getContestActivities = async (contestId: string) => {
    try {
      const { data, error } = await supabase
        .from('contest_activities')
        .select('*')
        .eq('contest_id', contestId)
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching activities:', error)
      return []
    }
  }

  useEffect(() => {
    fetchContests()
    if (user) {
      fetchMyContests()
      fetchUserBalance()
    }
  }, [user])

  return {
    contests,
    myContests,
    loading,
    userBalance,
    fetchContests,
    fetchMyContests,
    fetchUserBalance,
    createContest,
    cancelContest,
    submitToContest,
    getContestSubmissions,
    shortlistSubmission,
    selectWinner,
    getContestActivities
  }
}
