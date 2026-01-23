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
  deadline: string
  status: 'draft' | 'open' | 'judging' | 'completed' | 'cancelled'
  winner_id: string | null
  winning_submission_id: string | null
  max_submissions: number
  requirements: string[]
  style_preferences: string[]
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

  const fetchContests = async (category?: string) => {
    try {
      let query = supabase
        .from('contests')
        .select('*')
        .eq('status', 'open')
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

    try {
      const insertData = {
        title: contestData.title || '',
        description: contestData.description || '',
        category: contestData.category || '',
        prize_amount: contestData.prize_amount || 5000,
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

      if (error) throw error

      toast({ title: 'Contest Created!', description: 'Your contest is now live and accepting submissions.' })
      fetchMyContests()
      return { data }
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
      return { error: error.message }
    }
  }

  const submitToContest = async (contestId: string, submission: { title: string; description: string; file_urls: string[]; preview_url: string }) => {
    if (!user) return { error: 'Not authenticated' }

    try {
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

      toast({ title: 'Submission Received!', description: 'Good luck! The client will review your work.' })
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

  const selectWinner = async (contestId: string, submissionId: string, winnerId: string) => {
    if (!user) return { error: 'Not authenticated' }

    try {
      // Update contest
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

      toast({ title: 'Winner Selected!', description: 'The prize will be released to the winner.' })
      fetchMyContests()
      return { success: true }
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
      return { error: error.message }
    }
  }

  useEffect(() => {
    fetchContests()
    if (user) fetchMyContests()
  }, [user])

  return {
    contests,
    myContests,
    loading,
    fetchContests,
    fetchMyContests,
    createContest,
    submitToContest,
    getContestSubmissions,
    selectWinner
  }
}
