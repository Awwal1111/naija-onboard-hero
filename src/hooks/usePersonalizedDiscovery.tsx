import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/useAuth'

// Personalized Experts Discovery
export interface PersonalizedExpert {
  id: string
  user_id: string
  full_name: string
  skill_category: string
  years_experience: number
  location_state: string
  location_lga: string
  location_area: string
  status: string
  profile_picture_url?: string
  bio?: string
  profession?: string
  average_rating: number
  rating_count: number
  is_expert: boolean
  email_verified: boolean
  phone_verified: boolean
  face_verified: boolean
  relevance_score: number
}

export const usePersonalizedExperts = (limit = 20, offset = 0) => {
  const { user } = useAuth()

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['personalized-experts', user?.id, limit, offset],
    queryFn: async () => {
      if (!user) return []

      const { data: experts, error } = await supabase
        .rpc('get_personalized_experts', {
          p_user_id: user.id,
          p_limit: limit,
          p_offset: offset
        })

      if (error) {
        console.error('[Experts] Personalized fetch error:', error)
        // Fallback to basic query
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
      }

      console.log('[Experts] Personalized results:', experts?.length || 0)
      return experts || []
    },
    enabled: !!user,
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
          .select('*')
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
          .select('*')
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
          .select('*')
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
          .select('*')
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

// Personalized Jobs Discovery
export interface PersonalizedJob {
  id: string
  title: string
  description: string
  budget_min?: number
  budget_max?: number
  location?: string
  job_type?: string
  required_skills?: string[]
  status: string
  created_at: string
  poster_id: string
  poster_name?: string
  poster_picture?: string
  poster_profession?: string
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
          .select('*')
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
          .select('*')
          .eq('status', 'open')
          .order('created_at', { ascending: false })
          .limit(limit)
        return fallback || []
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
          .select('*')
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
          .select('*')
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
  seller_id: string
  seller_name?: string
  seller_picture?: string
  seller_rating: number
  seller_is_expert: boolean
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
