import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/useAuth'

// Personalized Connection Suggestions
export interface PersonalizedConnection {
  user_id: string
  full_name: string
  profession: string | null
  profile_picture_url: string | null
  state_name: string | null
  lga_name: string | null
  is_expert: boolean
  average_rating: number | null
  relevance_score: number
}

export const usePersonalizedConnections = (limit = 20, offset = 0) => {
  const { user } = useAuth()

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['personalized-connections', user?.id, limit, offset],
    queryFn: async () => {
      if (!user) return []

      const { data: connections, error } = await supabase.rpc('get_personalized_connections', {
        p_user_id: user.id,
        p_limit: limit,
        p_offset: offset
      })

      if (error) {
        console.error('[Discovery] Personalized connections error:', error)
        const { data: fallback } = await supabase
          .from('profiles')
          .select('user_id, full_name, profession, profile_picture_url, state_name, lga_name, is_expert, average_rating')
          .neq('user_id', user.id)
          .limit(limit)
        return (fallback || []).map(c => ({ ...c, relevance_score: 0 }))
      }

      return connections || []
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  })

  return { connections: data || [], loading: isLoading, refetch }
}

// Personalized Job Posts (for JobsEnhanced)
export interface PersonalizedJobPost {
  id: string
  title: string
  description: string
  company_name: string | null
  location: string | null
  budget_min: number | null
  budget_max: number | null
  job_type: string | null
  experience_level: string | null
  required_skills: string[] | null
  is_remote: boolean
  application_deadline: string | null
  applications_count: number
  views_count: number
  created_at: string
  user_id: string
  poster_name: string | null
  poster_picture: string | null
  poster_profession: string | null
  relevance_score: number
}

export const usePersonalizedJobPosts = (limit = 20, offset = 0) => {
  const { user } = useAuth()

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['personalized-job-posts', user?.id, limit, offset],
    queryFn: async () => {
      if (user?.id) {
        const { data: jobPosts, error } = await supabase.rpc('get_personalized_job_posts', {
          p_user_id: user.id,
          p_limit: limit,
          p_offset: offset
        })

        if (error) {
          console.error('[Discovery] Personalized job posts error:', error)
        } else {
          return jobPosts || []
        }
      }

      // Fallback
      const { data: fallback } = await supabase
        .from('job_posts')
        .select('*, profiles!job_posts_user_id_fkey(full_name, profile_picture_url, profession)')
        .eq('status', 'open')
        .order('created_at', { ascending: false })
        .limit(limit)

      return (fallback || []).map((j: any) => ({
        ...j,
        poster_name: j.profiles?.full_name,
        poster_picture: j.profiles?.profile_picture_url,
        poster_profession: j.profiles?.profession,
        relevance_score: 0
      }))
    },
    staleTime: 5 * 60 * 1000,
  })

  return { jobPosts: data || [], loading: isLoading, refetch }
}

// Personalized Experts Discovery
export interface PersonalizedExpert {
  user_id: string
  full_name: string
  profession?: string | null
  bio?: string | null
  profile_picture_url?: string | null
  state_name?: string | null
  lga_name?: string | null
  area?: string | null
  average_rating: number
  rating_count: number
  connections_count: number
  is_expert: boolean
  expert_verified_at?: string | null
  is_boosted: boolean
  boost_expires_at?: string | null
  is_premium: boolean
  premium_expires_at?: string | null
  skill_category?: string | null
  years_experience?: number | null
  relevance_score: number
}

export const usePersonalizedExperts = (limit = 20, offset = 0) => {
  const { user } = useAuth()

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['personalized-experts', user?.id, limit, offset],
    queryFn: async () => {
      // For logged-in users, try personalized algorithm
      if (user) {
        const { data: experts, error } = await supabase
          .rpc('get_personalized_experts', {
            p_user_id: user.id,
            p_limit: limit,
            p_offset: offset
          })

        if (!error && experts) {
          console.log('[Experts] Personalized results:', experts.length)
          return experts
        }
        console.error('[Experts] Personalized fetch error:', error)
      }

      // Fallback for guests OR on RPC error - show all approved experts
      const { data: fallback } = await supabase
        .from('expert_applications')
        .select('*, profiles!inner(full_name, bio, profession, profile_picture_url, average_rating, rating_count, is_expert)')
        .eq('status', 'approved')
        .order('submitted_at', { ascending: false })
        .limit(limit)
      
      return (fallback || []).map((e: any) => ({
        ...e,
        profile_picture_url: e.profiles?.profile_picture_url,
        bio: e.profiles?.bio,
        profession: e.profiles?.profession,
        average_rating: e.profiles?.average_rating || 0,
        rating_count: e.profiles?.rating_count || 0,
        is_expert: e.profiles?.is_expert || false,
        relevance_score: 0
      }))
    },
    staleTime: 5 * 60 * 1000,
  })

  return {
    experts: data || [],
    loading: isLoading,
    refetch
  }
}

// Personalized Courses Discovery
export interface PersonalizedCourse {
  id: string
  title: string
  description: string
  price: number
  course_category?: string
  instructor_name?: string
  thumbnail_url?: string
  average_rating: number
  review_count: number
  enrollment_count: number
  duration_hours?: number
  level?: string
  is_demo: boolean
  created_at: string
  relevance_score: number
}

export const usePersonalizedCourses = (limit = 20, offset = 0) => {
  const { user } = useAuth()

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['personalized-courses', user?.id, limit, offset],
    queryFn: async () => {
      if (!user) {
        // Non-authenticated users get basic ordering
        const { data: basic } = await supabase
          .from('courses')
          .select('id, title, description, price, course_category, thumbnail_url, average_rating, review_count, enrollment_count, duration_hours, level, is_demo, created_at')
          .eq('status', 'active')
          .order('average_rating', { ascending: false })
          .limit(limit)
        return basic || []
      }

      const { data: courses, error } = await supabase
        .rpc('get_personalized_courses', {
          p_user_id: user.id,
          p_limit: limit,
          p_offset: offset
        })

      if (error) {
        console.error('[Courses] Personalized fetch error:', error)
        const { data: fallback } = await supabase
          .from('courses')
          .select('id, title, description, price, course_category, thumbnail_url, average_rating, review_count, enrollment_count, duration_hours, level, is_demo, created_at')
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(limit)
        return fallback || []
      }

      console.log('[Courses] Personalized results:', courses?.length || 0)
      return courses || []
    },
    staleTime: 5 * 60 * 1000,
  })

  return {
    courses: data || [],
    loading: isLoading,
    refetch
  }
}

// Personalized Digital Products Discovery
export interface PersonalizedProduct {
  id: string
  title: string
  description: string
  price: number
  category: string
  preview_url?: string
  average_rating: number
  review_count: number
  download_count: number
  is_verified: boolean
  is_demo: boolean
  seller_name?: string
  seller_picture?: string
  relevance_score: number
}

export const usePersonalizedProducts = (limit = 20, offset = 0) => {
  const { user } = useAuth()

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['personalized-products', user?.id, limit, offset],
    queryFn: async () => {
      if (!user) {
        const { data: basic } = await supabase
          .from('digital_products')
          .select('id, title, description, price, category, preview_url, average_rating, review_count, download_count, is_verified, is_demo, created_at')
          .eq('status', 'active')
          .order('average_rating', { ascending: false })
          .limit(limit)
        return basic || []
      }

      const { data: products, error } = await supabase
        .rpc('get_personalized_products', {
          p_user_id: user.id,
          p_limit: limit,
          p_offset: offset
        })

      if (error) {
        console.error('[Products] Personalized fetch error:', error)
        const { data: fallback } = await supabase
          .from('digital_products')
          .select('id, title, description, price, category, preview_url, average_rating, review_count, download_count, is_verified, is_demo, created_at')
          .eq('status', 'active')
          .order('average_rating', { ascending: false })
          .limit(limit)
        return fallback || []
      }

      console.log('[Products] Personalized results:', products?.length || 0)
      return products || []
    },
    staleTime: 5 * 60 * 1000,
  })

  return {
    products: data || [],
    loading: isLoading,
    refetch
  }
}

// Personalized Jobs Discovery (for jobs table)
export interface PersonalizedJob {
  id: string
  title: string
  description: string
  budget_min?: number | null
  budget_max?: number | null
  location?: string | null
  job_type?: string | null
  required_skills?: string[] | null
  status: string
  created_at: string
  user_id?: string
  poster_id: string
  poster_name?: string | null
  poster_picture?: string | null
  poster_profession?: string | null
  relevance_score: number
}

export const usePersonalizedJobs = (limit = 20, offset = 0) => {
  const { user } = useAuth()

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['personalized-jobs', user?.id, limit, offset],
    queryFn: async () => {
      if (!user) {
        const { data: basic } = await supabase
          .from('jobs')
          .select('id, title, description, budget_min, budget_max, location, job_type, required_skills, status, created_at, user_id')
          .eq('status', 'open')
          .order('created_at', { ascending: false })
          .limit(limit)
        return basic || []
      }

      const { data: jobs, error } = await supabase
        .rpc('get_personalized_jobs', {
          p_user_id: user.id,
          p_limit: limit,
          p_offset: offset
        })

      if (error) {
        console.error('[Jobs] Personalized fetch error:', error)
        const { data: fallback } = await supabase
          .from('jobs')
          .select('*, profiles!jobs_user_id_fkey(full_name, profile_picture_url, profession)')
          .eq('status', 'open')
          .order('created_at', { ascending: false })
          .limit(limit)
        return (fallback || []).map((j: any) => ({
          ...j,
          poster_id: j.user_id,
          poster_name: j.profiles?.full_name,
          poster_picture: j.profiles?.profile_picture_url,
          poster_profession: j.profiles?.profession,
          relevance_score: 0
        }))
      }

      console.log('[Jobs] Personalized results:', jobs?.length || 0)
      return jobs || []
    },
    staleTime: 5 * 60 * 1000,
  })

  return {
    jobs: data || [],
    loading: isLoading,
    refetch
  }
}

// Personalized Fundraising Discovery
export interface PersonalizedFundraising {
  id: string
  title: string
  description: string
  goal_amount: number
  raised_amount: number
  category?: string
  location?: string
  featured_image_url?: string
  deadline?: string
  backer_count: number
  is_verified: boolean
  creator_id: string
  creator_name?: string
  creator_picture?: string
  progress_percent: number
  relevance_score: number
}

export const usePersonalizedFundraisings = (limit = 20, offset = 0) => {
  const { user } = useAuth()

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['personalized-fundraisings', user?.id, limit, offset],
    queryFn: async () => {
      if (!user) {
        const { data: basic } = await supabase
          .from('fundraisings')
          .select('id, title, description, goal_amount, raised_amount, category, location, featured_image_url, deadline, backer_count, is_verified, user_id, created_at')
          .eq('status', 'approved')
          .order('created_at', { ascending: false })
          .limit(limit)
        return (basic || []).map((f: any) => ({
          ...f,
          progress_percent: f.goal_amount > 0 ? (f.raised_amount / f.goal_amount) * 100 : 0
        }))
      }

      const { data: fundraisings, error } = await supabase
        .rpc('get_personalized_fundraisings', {
          p_user_id: user.id,
          p_limit: limit,
          p_offset: offset
        })

      if (error) {
        console.error('[Fundraising] Personalized fetch error:', error)
        const { data: fallback } = await supabase
          .from('fundraisings')
          .select('id, title, description, goal_amount, raised_amount, category, location, featured_image_url, deadline, backer_count, is_verified, user_id, created_at')
          .eq('status', 'approved')
          .order('created_at', { ascending: false })
          .limit(limit)
        return (fallback || []).map((f: any) => ({
          ...f,
          progress_percent: f.goal_amount > 0 ? (f.raised_amount / f.goal_amount) * 100 : 0
        }))
      }

      console.log('[Fundraising] Personalized results:', fundraisings?.length || 0)
      return fundraisings || []
    },
    staleTime: 5 * 60 * 1000,
  })

  return {
    fundraisings: data || [],
    loading: isLoading,
    refetch
  }
}

// Personalized Gigs Discovery
export interface PersonalizedGig {
  id: string
  title: string
  description: string
  price: number
  category: string
  photo_urls?: string[]
  status: string
  created_at: string
  boost_amount: number
  seller_id: string
  seller_name?: string
  seller_picture?: string
  seller_rating: number
  seller_is_expert: boolean
  seller_state?: string
  average_rating: number
  review_count: number
  relevance_score: number
}

export const usePersonalizedGigs = (limit = 20, offset = 0) => {
  const { user } = useAuth()

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['personalized-gigs', user?.id, limit, offset],
    queryFn: async () => {
      if (!user) {
        const { data: basic } = await supabase
          .from('jobs_services')
          .select('*')
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(limit)
        return basic || []
      }

      const { data: gigs, error } = await supabase
        .rpc('get_personalized_gigs', {
          p_user_id: user.id,
          p_limit: limit,
          p_offset: offset
        })

      if (error) {
        console.error('[Gigs] Personalized fetch error:', error)
        const { data: fallback } = await supabase
          .from('jobs_services')
          .select('*')
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(limit)
        return fallback || []
      }

      console.log('[Gigs] Personalized results:', gigs?.length || 0)
      return gigs || []
    },
    staleTime: 5 * 60 * 1000,
  })

  return {
    gigs: data || [],
    loading: isLoading,
    refetch
  }
}

// Personalized Groups Discovery
export interface PersonalizedGroup {
  id: string
  name: string
  description: string | null
  category: string
  state_name: string
  lga_name: string
  area: string
  member_count: number
  group_lead_id: string
  group_lead_name: string | null
  relevance_score: number
}

export const usePersonalizedGroups = (limit = 20, offset = 0) => {
  const { user } = useAuth()

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['personalized-groups', user?.id, limit, offset],
    queryFn: async () => {
      if (!user) {
        const { data: basic } = await supabase
          .from('groups')
          .select('*')
          .eq('is_active', true)
          .order('member_count', { ascending: false })
          .limit(limit)
        return basic || []
      }

      const { data: groups, error } = await supabase
        .rpc('get_personalized_groups', {
          p_user_id: user.id,
          p_limit: limit,
          p_offset: offset
        })

      if (error) {
        console.error('[Groups] Personalized fetch error:', error)
        const { data: fallback } = await supabase
          .from('groups')
          .select('*')
          .eq('is_active', true)
          .order('member_count', { ascending: false })
          .limit(limit)
        return fallback || []
      }

      console.log('[Groups] Personalized results:', groups?.length || 0)
      return groups || []
    },
    staleTime: 5 * 60 * 1000,
  })

  return {
    groups: data || [],
    loading: isLoading,
    refetch
  }
}
