import { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from './useAuth'
import { useToast } from './use-toast'

export interface Article {
  id: string
  title: string
  description: string
  article_url: string
  submission_instructions?: string
  reward_amount: number
  status: string
  total_submissions: number
  approved_submissions: number
  created_at: string
}

export interface ArticleSubmission {
  id: string
  article_id: string
  user_id: string
  short_note: string
  status: string
  reviewed_by?: string
  reviewed_at?: string
  created_at: string
  article?: Article
  profiles?: {
    full_name: string
    email_confirmed: boolean
  }
}

export const useArticles = () => {
  const { user } = useAuth()
  const { toast } = useToast()
  const [articles, setArticles] = useState<Article[]>([])
  const [mySubmissions, setMySubmissions] = useState<ArticleSubmission[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchArticles()
    if (user) {
      fetchMySubmissions()
    }
  }, [user])

  const fetchArticles = async () => {
    try {
      const { data, error } = await supabase
        .from('articles' as any)
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false })

      if (error) throw error
      setArticles(data as any || [])
    } catch (error: any) {
      console.error('Error fetching articles:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchMySubmissions = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('article_submissions' as any)
        .select('*, article:articles(*)')
        .eq('user_id', user.id)

      if (error) throw error
      setMySubmissions(data as any || [])
    } catch (error: any) {
      console.error('Error fetching submissions:', error)
    }
  }

  const submitArticle = async (articleId: string, shortNote: string) => {
    if (!user) return { success: false, error: 'Not authenticated' }

    try {
      const { error } = await supabase
        .from('article_submissions' as any)
        .insert({
          article_id: articleId,
          user_id: user.id,
          short_note: shortNote,
          status: 'pending'
        })

      if (error) throw error

      toast({
        title: "Success",
        description: "Article submission sent! Wait for admin approval.",
      })

      fetchMySubmissions()
      return { success: true }
    } catch (error: any) {
      console.error('Error submitting article:', error)
      toast({
        title: "Error",
        description: error.message || "Failed to submit",
        variant: "destructive",
      })
      return { success: false, error: error.message }
    }
  }

  const hasSubmitted = (articleId: string) => {
    return mySubmissions.some(sub => sub.article_id === articleId)
  }

  const getSubmissionStatus = (articleId: string) => {
    const submission = mySubmissions.find(sub => sub.article_id === articleId)
    return submission?.status
  }

  return {
    articles,
    mySubmissions,
    loading,
    submitArticle,
    hasSubmitted,
    getSubmissionStatus,
    refetch: fetchArticles
  }
}

// Admin hook
export const useAdminArticles = () => {
  const { toast } = useToast()
  const [articles, setArticles] = useState<Article[]>([])
  const [submissions, setSubmissions] = useState<ArticleSubmission[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAllArticles()
    fetchAllSubmissions()
  }, [])

  const fetchAllArticles = async () => {
    try {
      const { data, error } = await supabase
        .from('articles' as any)
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setArticles(data as any || [])
    } catch (error: any) {
      console.error('Error fetching articles:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchAllSubmissions = async () => {
    try {
      const { data, error } = await supabase
        .from('article_submissions' as any)
        .select(`
          *,
          article:articles(*),
          profiles!article_submissions_user_id_fkey(full_name, email_confirmed)
        `)
        .order('created_at', { ascending: false })

      if (error) throw error
      setSubmissions(data as any || [])
    } catch (error: any) {
      console.error('Error fetching submissions:', error)
    }
  }

  const createArticle = async (articleData: any) => {
    try {
      const { error } = await supabase
        .from('articles' as any)
        .insert(articleData)

      if (error) throw error

      toast({
        title: "Success",
        description: "Article created successfully!",
      })

      fetchAllArticles()
      return { success: true }
    } catch (error: any) {
      console.error('Error creating article:', error)
      toast({
        title: "Error",
        description: error.message || "Failed to create article",
        variant: "destructive",
      })
      return { success: false, error: error.message }
    }
  }

  const approveSubmission = async (submissionId: string) => {
    try {
      const { error } = await supabase
        .from('article_submissions' as any)
        .update({ 
          status: 'approved',
          reviewed_at: new Date().toISOString()
        })
        .eq('id', submissionId)

      if (error) throw error

      toast({
        title: "Success",
        description: "Submission approved and reward credited!",
      })

      fetchAllSubmissions()
      return { success: true }
    } catch (error: any) {
      console.error('Error approving submission:', error)
      toast({
        title: "Error",
        description: error.message || "Failed to approve submission",
        variant: "destructive",
      })
      return { success: false, error: error.message }
    }
  }

  const rejectSubmission = async (submissionId: string) => {
    try {
      const { error } = await supabase
        .from('article_submissions' as any)
        .update({ 
          status: 'rejected',
          reviewed_at: new Date().toISOString()
        })
        .eq('id', submissionId)

      if (error) throw error

      toast({
        title: "Success",
        description: "Submission rejected",
      })

      fetchAllSubmissions()
      return { success: true }
    } catch (error: any) {
      console.error('Error rejecting submission:', error)
      toast({
        title: "Error",
        description: error.message || "Failed to reject submission",
        variant: "destructive",
      })
      return { success: false, error: error.message }
    }
  }

  const updateArticle = async (id: string, updates: any) => {
    try {
      const { error } = await supabase
        .from('articles' as any)
        .update(updates)
        .eq('id', id)

      if (error) throw error

      toast({
        title: "Success",
        description: "Article updated successfully!",
      })

      fetchAllArticles()
      return { success: true }
    } catch (error: any) {
      console.error('Error updating article:', error)
      toast({
        title: "Error",
        description: error.message || "Failed to update article",
        variant: "destructive",
      })
      return { success: false, error: error.message }
    }
  }

  const deleteArticle = async (id: string) => {
    try {
      const { error } = await supabase
        .from('articles' as any)
        .delete()
        .eq('id', id)

      if (error) throw error

      toast({
        title: "Success",
        description: "Article deleted successfully!",
      })

      fetchAllArticles()
      return { success: true }
    } catch (error: any) {
      console.error('Error deleting article:', error)
      toast({
        title: "Error",
        description: error.message || "Failed to delete article",
        variant: "destructive",
      })
      return { success: false, error: error.message }
    }
  }

  return {
    articles,
    submissions,
    loading,
    createArticle,
    updateArticle,
    deleteArticle,
    approveSubmission,
    rejectSubmission,
    refetch: () => {
      fetchAllArticles()
      fetchAllSubmissions()
    }
  }
}
