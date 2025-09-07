import { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from './useAuth'
import { useToast } from './use-toast'

interface PortfolioItem {
  id: string
  user_id: string
  title: string
  description?: string
  project_url?: string
  media_url?: string
  created_at: string
  updated_at: string
}

export const usePortfolio = (userId?: string) => {
  const { user } = useAuth()
  const { toast } = useToast()
  const [items, setItems] = useState<PortfolioItem[]>([])
  const [loading, setLoading] = useState(true)

  const targetUserId = userId || user?.id

  const fetchPortfolioItems = async () => {
    if (!targetUserId) return

    try {
      const { data, error } = await supabase
        .from('portfolio_items')
        .select('*')
        .eq('user_id', targetUserId)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching portfolio items:', error)
        return
      }

      setItems(data || [])
    } catch (error) {
      console.error('Error fetching portfolio items:', error)
    } finally {
      setLoading(false)
    }
  }

  const addPortfolioItem = async (item: Omit<PortfolioItem, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    if (!user?.id) return { error: 'Not authenticated' }

    try {
      const { data, error } = await supabase
        .from('portfolio_items')
        .insert({
          ...item,
          user_id: user.id
        })
        .select()
        .single()

      if (error) {
        toast({
          title: "Error",
          description: "Failed to add portfolio item",
          variant: "destructive",
        })
        return { error: error.message }
      }

      setItems(prev => [data, ...prev])
      toast({
        title: "Success",
        description: "Portfolio item added successfully",
      })
      return { data }
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to add portfolio item",
        variant: "destructive",
      })
      return { error: error.message }
    }
  }

  const updatePortfolioItem = async (id: string, updates: Partial<PortfolioItem>) => {
    if (!user?.id) return { error: 'Not authenticated' }

    try {
      const { data, error } = await supabase
        .from('portfolio_items')
        .update(updates)
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single()

      if (error) {
        toast({
          title: "Error",
          description: "Failed to update portfolio item",
          variant: "destructive",
        })
        return { error: error.message }
      }

      setItems(prev => prev.map(item => item.id === id ? data : item))
      toast({
        title: "Success",
        description: "Portfolio item updated successfully",
      })
      return { data }
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to update portfolio item",
        variant: "destructive",
      })
      return { error: error.message }
    }
  }

  const deletePortfolioItem = async (id: string) => {
    if (!user?.id) return { error: 'Not authenticated' }

    try {
      const { error } = await supabase
        .from('portfolio_items')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id)

      if (error) {
        toast({
          title: "Error",
          description: "Failed to delete portfolio item",
          variant: "destructive",
        })
        return { error: error.message }
      }

      setItems(prev => prev.filter(item => item.id !== id))
      toast({
        title: "Success",
        description: "Portfolio item deleted successfully",
      })
      return { success: true }
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to delete portfolio item",
        variant: "destructive",
      })
      return { error: error.message }
    }
  }

  useEffect(() => {
    fetchPortfolioItems()
  }, [targetUserId])

  return {
    items,
    loading,
    addPortfolioItem,
    updatePortfolioItem,
    deletePortfolioItem,
    refetch: fetchPortfolioItems
  }
}