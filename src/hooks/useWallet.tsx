import { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from './useAuth'
import { useToast } from './use-toast'

export interface WalletTransaction {
  id: string
  user_id: string
  amount: number
  transaction_type: string
  description: string
  reference_id: string | null
  status: string
  created_at: string
}

export interface Transaction {
  id: string
  user_id: string
  amount: number
  type: string
  currency: string
  status: string
  reference: string | null
  metadata: any
  created_at: string
  updated_at: string
}

export interface EscrowPayment {
  id: string
  client_id: string
  expert_id: string
  job_id: string
  amount: number
  status: string
  created_at: string
  released_at?: string
  refunded_at?: string
}

export const useWallet = () => {
  const { user } = useAuth()
  const { toast } = useToast()
  const [balance, setBalance] = useState<number>(0)
  const [loading, setLoading] = useState(true)
  const [transactions, setTransactions] = useState<WalletTransaction[]>([])
  const [escrowPayments, setEscrowPayments] = useState<EscrowPayment[]>([])

  useEffect(() => {
    if (user) {
      initializeWallet()
      fetchTransactions()
      fetchEscrowPayments()
      setupRealtimeSubscription()
    }
  }, [user])

  const initializeWallet = async () => {
    if (!user) return

    try {
      // Check if wallet exists, create if not
      let { data: wallet } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (!wallet) {
        const { data: newWallet, error: createError } = await supabase
          .from('wallets')
          .insert({ user_id: user.id, balance: 0 })
          .select()
          .single()

        if (createError) throw createError
        wallet = newWallet
      }

      // Also sync with profiles table
      const { data: profile } = await supabase
        .from('profiles')
        .select('wallet_balance')
        .eq('user_id', user.id)
        .single()

      const walletBalance = wallet?.balance || profile?.wallet_balance || 0
      setBalance(walletBalance)
    } catch (error) {
      console.error('Error initializing wallet:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchTransactions = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('wallet_transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20)

      if (error) throw error
      setTransactions(data || [])
    } catch (error) {
      console.error('Error fetching transactions:', error)
    }
  }

  const fetchEscrowPayments = async () => {
    if (!user) return

    try {
      // For now, we'll use a simplified query until the table is properly set up
      setEscrowPayments([])
    } catch (error) {
      console.error('Error fetching escrow payments:', error)
    }
  }

  const setupRealtimeSubscription = () => {
    if (!user) return

    const channel = supabase
      .channel('wallet-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'wallets',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('Wallet updated:', payload)
          if (payload.new) {
            setBalance((payload.new as any).balance)
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'wallet_transactions',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          fetchTransactions()
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'transactions'
        },
        () => {
          // Refresh data when transactions change
          initializeWallet()
          fetchTransactions()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }

  const initiateDeposit = async (amount: number) => {
    if (!user || amount <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid amount",
        variant: "destructive"
      })
      return { success: false }
    }

    try {
      const { data, error } = await supabase.functions.invoke('create-transaction', {
        body: {
          type: 'deposit',
          amount: amount * 100, // Convert to kobo for Paystack
          currency: 'NGN',
          metadata: { purpose: 'wallet_topup' }
        }
      })

      if (error) throw error

      // Redirect to Paystack checkout
      if (data.checkout_url) {
        window.open(data.checkout_url, '_blank')
        return { success: true, reference: data.reference }
      }

      return { success: false, error: 'No checkout URL received' }
    } catch (error: any) {
      console.error('Error initiating deposit:', error)
      toast({
        title: "Deposit Failed",
        description: error.message || "Failed to initiate deposit",
        variant: "destructive"
      })
      return { success: false, error: error.message }
    }
  }

  const initiateWithdrawal = async (amount: number, bankDetails: any) => {
    if (!user || amount <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid amount",
        variant: "destructive"
      })
      return { success: false }
    }

    if (amount > balance) {
      toast({
        title: "Insufficient Funds",
        description: "You don't have enough balance for this withdrawal",
        variant: "destructive"
      })
      return { success: false }
    }

    try {
      const { data, error } = await supabase.functions.invoke('create-payout', {
        body: {
          amount,
          method: 'bank',
          bank_details: bankDetails
        }
      })

      if (error) throw error

      toast({
        title: "Withdrawal Initiated",
        description: "Your withdrawal request is being processed"
      })

      return { success: true, payout_id: data.payout_id }
    } catch (error: any) {
      console.error('Error initiating withdrawal:', error)
      toast({
        title: "Withdrawal Failed",
        description: error.message || "Failed to initiate withdrawal",
        variant: "destructive"
      })
      return { success: false, error: error.message }
    }
  }

  const createEscrowPayment = async (expertId: string, jobId: string, amount: number) => {
    if (!user || amount <= 0) return { success: false }

    try {
      const { data, error } = await supabase.functions.invoke('create-escrow', {
        body: {
          expert_id: expertId,
          job_id: jobId,
          amount: amount * 100, // Convert to kobo
          currency: 'NGN'
        }
      })

      if (error) throw error

      if (data.checkout_url) {
        window.open(data.checkout_url, '_blank')
        return { success: true, reference: data.reference }
      }

      return { success: false, error: 'No checkout URL received' }
    } catch (error: any) {
      console.error('Error creating escrow payment:', error)
      toast({
        title: "Payment Failed",
        description: error.message || "Failed to create escrow payment",
        variant: "destructive"
      })
      return { success: false, error: error.message }
    }
  }

  const releaseEscrow = async (escrowId: string) => {
    try {
      const { error } = await supabase.functions.invoke('release-escrow', {
        body: { escrow_id: escrowId }
      })

      if (error) throw error

      toast({
        title: "Payment Released",
        description: "The payment has been released to the expert"
      })

      return { success: true }
    } catch (error: any) {
      console.error('Error releasing escrow:', error)
      toast({
        title: "Release Failed",
        description: error.message || "Failed to release payment",
        variant: "destructive"
      })
      return { success: false, error: error.message }
    }
  }

  const refundEscrow = async (escrowId: string) => {
    try {
      const { error } = await supabase.functions.invoke('refund-escrow', {
        body: { escrow_id: escrowId }
      })

      if (error) throw error

      toast({
        title: "Payment Refunded",
        description: "The payment has been refunded to your wallet"
      })

      return { success: true }
    } catch (error: any) {
      console.error('Error refunding escrow:', error)
      toast({
        title: "Refund Failed",
        description: error.message || "Failed to refund payment",
        variant: "destructive"
      })
      return { success: false, error: error.message }
    }
  }

  return {
    balance,
    loading,
    transactions,
    escrowPayments,
    initiateDeposit,
    initiateWithdrawal,
    createEscrowPayment,
    releaseEscrow,
    refundEscrow,
    refreshWallet: initializeWallet,
    refreshTransactions: fetchTransactions,
    refreshEscrow: fetchEscrowPayments
  }
}