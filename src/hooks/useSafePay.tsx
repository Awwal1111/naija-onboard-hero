import { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/use-toast'

interface SafePayTransaction {
  id: string
  buyer_id: string
  seller_id: string
  amount: number
  status: 'proposed' | 'active' | 'complete' | 'cancelled' | 'disputed'
  cancellation_requester_id?: string
  expires_at?: string
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
      setActiveTransaction(data as SafePayTransaction | null)
    } catch (error) {
      console.error('Error fetching SafePay transaction:', error)
    }
  }

  const fetchWallet = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('user_wallets')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle()

      if (error && error.code !== 'PGRST116') throw error
      setWallet(data)
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
      // Check current wallet balance first
      const { data: currentWallet, error: walletError } = await supabase
        .from('user_wallets')
        .select('balance, escrow_hold')
        .eq('user_id', user.id)
        .maybeSingle()

      let availableBalance = 0
      if (currentWallet) {
        availableBalance = currentWallet.balance - currentWallet.escrow_hold
      }

      // Check if user has sufficient balance
      if (availableBalance < amount) {
        toast({
          title: "Insufficient Balance",
          description: `You need ${amount} NC but only have ${availableBalance} NC available. Please top up your wallet first.`,
          variant: "destructive"
        })
        return
      }

      // Ensure user has a wallet record
      await supabase
        .from('user_wallets')
        .insert({
          user_id: user.id,
          balance: 0,
          escrow_hold: 0
        })
        .select()
        .maybeSingle()

      const { error } = await supabase
        .from('safepay_transactions')
        .insert({
          buyer_id: user.id,
          seller_id: otherUserId,
          amount: amount,
          status: 'proposed'
        })

      if (error) throw error

      toast({
        title: "SafePay Proposed",
        description: `Proposed ${amount} NC SafePay transaction`
      })

      await fetchActiveTransaction()
    } catch (error) {
      console.error('Error proposing SafePay:', error)
      toast({
        title: "Error",
        description: "Failed to propose SafePay transaction",
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
      await supabase.rpc('accept_safepay', {
        p_safepay_id: activeTransaction.id
      })

      toast({
        title: "SafePay Accepted",
        description: "Funds are now secured in escrow"
      })

      await fetchActiveTransaction()
      await fetchWallet()
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
      const { error } = await supabase
        .from('safepay_transactions')
        .update({
          status: 'complete',
          expires_at: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString()
        })
        .eq('id', activeTransaction.id)

      if (error) throw error

      toast({
        title: "Work Completed",
        description: "Buyer has 5 days to release funds or dispute"
      })

      await fetchActiveTransaction()
    } catch (error) {
      console.error('Error completing SafePay:', error)
      toast({
        title: "Error",
        description: "Failed to mark work as complete",
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
      await supabase.rpc('release_safepay', {
        p_safepay_id: activeTransaction.id
      })

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
    cancelSafePay
  }
}