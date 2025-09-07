import { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from './useAuth'
import { useToast } from './use-toast'

interface Job {
  id: string
  user_id: string
  title: string
  description: string
  budget_min?: number
  budget_max?: number
  required_skills?: string[]
  status: string
  location?: string
  job_type?: string
  created_at: string
  updated_at: string
  poster_profile?: {
    full_name: string
    profile_picture_url?: string
    profession?: string
  }
}

interface JobApplication {
  id: string
  job_id: string
  applicant_id: string
  cover_letter?: string
  status: string
  created_at: string
  applicant_profile?: {
    full_name: string
    profile_picture_url?: string
    profession?: string
  }
}

export const useJobs = () => {
  const { user } = useAuth()
  const { toast } = useToast()
  const [jobs, setJobs] = useState<Job[]>([])
  const [myJobs, setMyJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)

  const fetchJobs = async () => {
    try {
      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .eq('status', 'open')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching jobs:', error)
        return
      }

      // Fetch profiles for each job
      const jobsWithProfiles = await Promise.all(
        (data || []).map(async (job) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, profile_picture_url, profession')
            .eq('user_id', job.user_id)
            .maybeSingle()

          return {
            ...job,
            poster_profile: profile || undefined
          }
        })
      )

      setJobs(jobsWithProfiles)
    } catch (error) {
      console.error('Error fetching jobs:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchMyJobs = async () => {
    if (!user?.id) return

    try {
      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching my jobs:', error)
        return
      }

      setMyJobs(data || [])
    } catch (error) {
      console.error('Error fetching my jobs:', error)
    }
  }

  const createJob = async (jobData: Omit<Job, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'poster_profile'>) => {
    if (!user?.id) return { error: 'Not authenticated' }

    try {
      const { data, error } = await supabase
        .from('jobs')
        .insert({
          ...jobData,
          user_id: user.id
        })
        .select()
        .single()

      if (error) {
        toast({
          title: "Error",
          description: "Failed to create job",
          variant: "destructive",
        })
        return { error: error.message }
      }

      setMyJobs(prev => [data, ...prev])
      toast({
        title: "Success",
        description: "Job posted successfully",
      })
      return { data }
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to create job",
        variant: "destructive",
      })
      return { error: error.message }
    }
  }

  const applyToJob = async (jobId: string, coverLetter?: string) => {
    if (!user?.id) return { error: 'Not authenticated' }

    try {
      const { data, error } = await supabase
        .from('job_applications')
        .insert({
          job_id: jobId,
          applicant_id: user.id,
          cover_letter: coverLetter
        })
        .select()
        .single()

      if (error) {
        toast({
          title: "Error",
          description: "Failed to apply to job",
          variant: "destructive",
        })
        return { error: error.message }
      }

      toast({
        title: "Success",
        description: "Application submitted successfully",
      })
      return { data }
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to apply to job",
        variant: "destructive",
      })
      return { error: error.message }
    }
  }

  const getJobApplications = async (jobId: string): Promise<JobApplication[]> => {
    if (!user?.id) return []

    try {
      const { data, error } = await supabase
        .from('job_applications')
        .select('*')
        .eq('job_id', jobId)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching job applications:', error)
        return []
      }

      // Fetch profiles for each application
      const applicationsWithProfiles = await Promise.all(
        (data || []).map(async (app) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, profile_picture_url, profession')
            .eq('user_id', app.applicant_id)
            .maybeSingle()

          return {
            ...app,
            applicant_profile: profile || undefined
          }
        })
      )

      return applicationsWithProfiles
    } catch (error) {
      console.error('Error fetching job applications:', error)
      return []
    }
  }

  useEffect(() => {
    fetchJobs()
    fetchMyJobs()
  }, [user?.id])

  return {
    jobs,
    myJobs,
    loading,
    createJob,
    applyToJob,
    getJobApplications,
    refetch: fetchJobs,
    refetchMyJobs: fetchMyJobs
  }
}