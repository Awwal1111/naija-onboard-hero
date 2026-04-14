import { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/use-toast'

interface SafePayTransaction {
  id: string
  buyer_id: string
  seller_id: string
  amount: number
  status: 'proposed' | 'active' | 'complete' | 'cancelled' | 'disputed' | 'released'
  cancel_requester_id?: string
  cancel_approved_by?: string
  completed_at?: string
  dispute_reason?: string
  admin_ruling?: string
  auto_release_at?: string
  created_at: string
  updated_at: string
}

interface UserWallet {
  user_id: string
  balance: number
  escrow_hold: number
  updated_at: string
}

export const useSafePay = (otherUserId: string) => {
  const { user } = useAuth()
  const { toast } = useToast()
  const [activeTransaction, setActiveTransaction] = useState<SafePayTransaction | null>(null)
  const [wallet, setWallet] = useState<UserWallet | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!user || !otherUserId) return

    const loadData = async () => {
      await fetchActiveTransaction()
      await fetchWallet()
    }
    
    loadData()
    const cleanup = subscribeToTransactionUpdates()
    
    return cleanup
  }, [user, otherUserId])

  const fetchActiveTransaction = async () => {
    if (!user || !otherUserId) return

    try {
      const { data, error } = await supabase
        .from('safepay_transactions')
        .select('id, buyer_id, seller_id, amount, description, status, escrow_deadline, created_at, updated_at')
        .or(`and(buyer_id.eq.${user.id},seller_id.eq.${otherUserId}),and(buyer_id.eq.${otherUserId},seller_id.eq.${user.id})`)
        .in('status', ['proposed', 'active', 'complete'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (error) throw error
      
      console.log('Fetched active transaction:', data)
      setActiveTransaction(data as SafePayTransaction | null)
    } catch (error) {
      console.error('Error fetching SafePay transaction:', error)
    }
  }

  const fetchWallet = async () => {
    if (!user) return

    try {
      // Try user_wallets first, then fallback to profiles table
      let { data: walletData, error: walletError } = await supabase
        .from('user_wallets')
        .select('user_id, balance, withdrawable_balance, non_withdrawable_balance')
        .eq('user_id', user.id)
        .maybeSingle()

      if (walletError && walletError.code !== 'PGRST116') throw walletError

      // If no wallet found, check profiles table for balance
      if (!walletData) {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('wallet_balance, balance_withdrawable, balance_non_withdrawable')
          .eq('user_id', user.id)
          .single()

        if (profileError) throw profileError

        // Create a user_wallets entry if it doesn't exist
        if (profileData) {
          const { data: newWallet, error: createError } = await supabase
            .from('user_wallets')
            .insert({
              user_id: user.id,
              balance: profileData.wallet_balance || 0,
              escrow_hold: 0
            })
            .select()
            .single()

          if (createError) throw createError
          walletData = newWallet
        }
      }

      setWallet(walletData)
    } catch (error) {
      console.error('Error fetching wallet:', error)
    }
  }

  const subscribeToTransactionUpdates = () => {
    if (!user || !otherUserId) return

    // Subscribe to any changes where the current user is involved
    const channel = supabase
      .channel(`safepay-updates-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'safepay_transactions',
          filter: `buyer_id=eq.${user.id}`
        },
        (payload) => {
          console.log('SafePay update (as buyer):', payload)
          fetchActiveTransaction()
          fetchWallet()
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'safepay_transactions',
          filter: `seller_id=eq.${user.id}`
        },
        (payload) => {
          console.log('SafePay update (as seller):', payload)
          fetchActiveTransaction()
          fetchWallet()
        }
      )
      .subscribe((status) => {
        console.log('SafePay subscription status:', status)
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }

  const proposeSafePay = async (amount: number) => {
    if (!user || !otherUserId || amount <= 0) return

    setLoading(true)
    try {
      const { data, error } = await supabase.rpc('propose_safepay', {
        p_buyer_id: user.id,
        p_seller_id: otherUserId,
        p_amount: amount
      })

      if (error) throw error

      const result = data as { success: boolean; error?: string }
      
      if (!result?.success) {
        toast({
          title: "Failed to Propose",
          description: result?.error || "Could not create SafePay",
          variant: "destructive"
        })
        return
      }

      toast({
        title: "SafePay Created",
        description: `${amount} NC locked in escrow`
      })

      await Promise.all([fetchActiveTransaction(), fetchWallet()])
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const acceptSafePay = async () => {
    if (!activeTransaction || activeTransaction.status !== 'proposed') return

    setLoading(true)
    try {
      const { error } = await supabase.rpc('accept_safepay', {
        p_safepay_id: activeTransaction.id
      })

      if (error) throw error

      toast({
        title: "Accepted",
        description: "Work can now begin"
      })

      await Promise.all([fetchActiveTransaction(), fetchWallet()])
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const completeSafePay = async () => {
    if (!activeTransaction || activeTransaction.status !== 'active') return

    setLoading(true)
    try {
      const { error } = await supabase.rpc('mark_safepay_complete', {
        p_safepay_id: activeTransaction.id
      })

      if (error) throw error

      toast({
        title: "Marked Complete",
        description: "Waiting for buyer to release funds"
      })

      await Promise.all([fetchActiveTransaction(), fetchWallet()])
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  // Removed complex cancel/dispute flows - keeping it simple

  const releaseFunds = async () => {
    if (!activeTransaction) return

    setLoading(true)
    try {
      const { error } = await supabase.rpc('release_safepay_funds', {
        p_safepay_id: activeTransaction.id
      })

      if (error) throw error

      toast({
        title: "Payment Released",
        description: "Seller has been paid"
      })

      await Promise.all([fetchActiveTransaction(), fetchWallet()])
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const cancelSafePay = async () => {
    if (!activeTransaction) return

    setLoading(true)
    try {
      const { error } = await supabase.rpc('cancel_safepay_proposal', {
        p_safepay_id: activeTransaction.id
      })

      if (error) throw error

      toast({
        title: "Cancelled",
        description: "Funds have been refunded"
      })

      await Promise.all([fetchActiveTransaction(), fetchWallet()])
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  return {
    activeTransaction,
    wallet,
    loading,
    proposeSafePay,
    acceptSafePay,
    completeSafePay,
    releaseFunds,
    cancelSafePay
  }
}