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

    fetchActiveTransaction()
    fetchWallet()
    subscribeToTransactionUpdates()
  }, [user, otherUserId])

  const fetchActiveTransaction = async () => {
    if (!user || !otherUserId) return

    try {
      const { data, error } = await supabase
        .from('safepay_transactions')
        .select('*')
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
        .select('*')
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

    const channel = supabase
      .channel(`safepay-${user.id}-${otherUserId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'safepay_transactions',
          filter: `buyer_id=eq.${user.id},seller_id=eq.${otherUserId}`
        },
        () => {
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
          filter: `buyer_id=eq.${otherUserId},seller_id=eq.${user.id}`
        },
        () => {
          fetchActiveTransaction()
          fetchWallet()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }

  const proposeSafePay = async (amount: number) => {
    if (!user || !otherUserId || amount <= 0) return

    setLoading(true)
    try {
      // Use the new propose_safepay function which handles all the logic
      const { data, error } = await supabase.rpc('propose_safepay', {
        p_buyer_id: user.id,
        p_seller_id: otherUserId,
        p_amount: amount
      })

      if (error) {
        console.error('RPC Error:', error)
        throw error
      }

      // Check if the function returned an error
      const result = data as { success: boolean; error?: string; safepay_id?: string }
      
      if (!result || !result.success) {
        toast({
          title: "Cannot Propose SafePay",
          description: result?.error || "Failed to propose SafePay transaction",
          variant: "destructive"
        })
        return
      }

      toast({
        title: "SafePay Proposed",
        description: `${amount} NC has been locked in escrow. Waiting for acceptance.`
      })

      await fetchActiveTransaction()
      await fetchWallet()
    } catch (error: any) {
      console.error('Error proposing SafePay:', error)
      toast({
        title: "Error",
        description: error.message || "Failed to propose SafePay transaction",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const acceptSafePay = async () => {
    if (!activeTransaction || activeTransaction.status !== 'proposed') {
      console.log('Cannot accept SafePay:', { activeTransaction, status: activeTransaction?.status })
      return
    }

    setLoading(true)
    try {
      console.log('Accepting SafePay:', activeTransaction.id)
      const { error } = await supabase.rpc('accept_safepay', {
        p_safepay_id: activeTransaction.id
      })

      if (error) {
        console.error('RPC Error:', error)
        throw error
      }

      console.log('SafePay accepted successfully')

      toast({
        title: "SafePay Accepted",
        description: "Funds are now secured in escrow"
      })

      // Force immediate refresh
      await Promise.all([fetchActiveTransaction(), fetchWallet()])
      
      // Set a short timeout to ensure state updates
      setTimeout(() => {
        fetchActiveTransaction()
      }, 500)
    } catch (error: any) {
      console.error('Error accepting SafePay:', error)
      toast({
        title: "Error",
        description: error.message || "Failed to accept SafePay",
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
      await supabase.rpc('complete_safepay_work' as any, {
        p_safepay_id: activeTransaction.id
      })

      toast({
        title: "Work Marked Complete",
        description: "Buyer has 5 days to release funds or file a dispute"
      })

      await fetchActiveTransaction()
    } catch (error: any) {
      console.error('Error completing SafePay:', error)
      toast({
        title: "Error",
        description: error.message || "Failed to mark work as complete",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const requestCancel = async () => {
    if (!activeTransaction || activeTransaction.status !== 'active') return

    setLoading(true)
    try {
      await supabase.rpc('request_cancel_safepay' as any, {
        p_safepay_id: activeTransaction.id
      })

      toast({
        title: "Cancel Requested",
        description: "Waiting for the other party to agree"
      })

      await fetchActiveTransaction()
    } catch (error: any) {
      console.error('Error requesting cancel:', error)
      toast({
        title: "Error",
        description: error.message || "Failed to request cancellation",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const approveCancel = async () => {
    if (!activeTransaction) return

    setLoading(true)
    try {
      await supabase.rpc('approve_cancel_safepay' as any, {
        p_safepay_id: activeTransaction.id
      })

      toast({
        title: "SafePay Cancelled",
        description: "Funds have been returned to the buyer"
      })

      await fetchActiveTransaction()
      await fetchWallet()
    } catch (error: any) {
      console.error('Error approving cancel:', error)
      toast({
        title: "Error",
        description: error.message || "Failed to approve cancellation",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const fileDispute = async (reason: string) => {
    if (!activeTransaction || activeTransaction.status !== 'complete') return

    setLoading(true)
    try {
      await supabase.rpc('file_dispute_safepay' as any, {
        p_safepay_id: activeTransaction.id,
        p_reason: reason
      })

      toast({
        title: "Dispute Filed",
        description: "An admin will review the case and make a ruling"
      })

      await fetchActiveTransaction()
    } catch (error: any) {
      console.error('Error filing dispute:', error)
      toast({
        title: "Error",
        description: error.message || "Failed to file dispute",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const releaseFunds = async () => {
    if (!activeTransaction) return

    setLoading(true)
    try {
      const { error } = await supabase.rpc('release_safepay', {
        p_safepay_id: activeTransaction.id
      })

      if (error) {
        console.error('RPC Error:', error)
        throw error
      }

      toast({
        title: "Funds Released",
        description: "Payment has been sent to the seller"
      })

      await fetchActiveTransaction()
      await fetchWallet()
    } catch (error: any) {
      console.error('Error releasing funds:', error)
      toast({
        title: "Error",
        description: error.message || "Failed to release funds",
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
      await supabase.rpc('cancel_safepay', {
        p_safepay_id: activeTransaction.id
      })

      toast({
        title: "SafePay Cancelled",
        description: "Transaction has been cancelled"
      })

      await fetchActiveTransaction()
      await fetchWallet()
    } catch (error: any) {
      console.error('Error cancelling SafePay:', error)
      toast({
        title: "Error",
        description: error.message || "Failed to cancel SafePay",
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
    cancelSafePay,
    requestCancel,
    approveCancel,
    fileDispute
  }
}