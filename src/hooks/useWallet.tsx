import { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from './useAuth'
import { useToast } from './use-toast'

export interface WalletBalance {
  withdrawable: number
  non_withdrawable: number
  total: number
  escrow_hold: number
}

export interface WalletTransaction {
  id: string
  user_id: string
  amount: number
  kind: string // Changed from transaction_type
  reference: string // Changed from description
  status: string
  created_at: string
  currency?: string
  metadata?: any
  safepay_id?: string
}

export interface Transaction {
  id: string
  user_id: string
  transaction_type: string
  amount: number
  balance_type: string
  recipient_id?: string
  description?: string
  status: string
  metadata?: any
  created_at: string
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
  const [balance, setBalance] = useState<WalletBalance>({
    withdrawable: 0,
    non_withdrawable: 0,
    total: 0,
    escrow_hold: 0
  })
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
      // Get balance from profiles table (correct structure)
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('wallet_balance, balance_withdrawable, balance_non_withdrawable')
        .eq('user_id', user.id)
        .single()

      if (error) throw error

      // Get escrow hold from user_wallets table
      const { data: walletData } = await supabase
        .from('user_wallets')
        .select('escrow_hold')
        .eq('user_id', user.id)
        .maybeSingle()

      const walletBalance = {
        withdrawable: Number(profile?.balance_withdrawable || 0),
        non_withdrawable: Number(profile?.balance_non_withdrawable || 0),
        total: Number(profile?.wallet_balance || 0), // Use wallet_balance as total
        escrow_hold: Number(walletData?.escrow_hold || 0)
      }

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
      // Fetch from wallet transactions table
      const { data: walletData, error: walletError } = await supabase
        .from('wallet_transactions')
        .select('id, user_id, amount, kind, reference, status, created_at, currency, metadata')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50)

      if (walletError) throw walletError

      // Also fetch crypto transactions (deposits/withdrawals)
      const { data: cryptoData, error: cryptoError } = await supabase
        .from('crypto_transactions')
        .select('id, user_id, nc_amount, crypto_amount, crypto_currency, transaction_type, status, created_at, tx_hash, wallet_address, exchange_rate')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50)

      // Merge and convert crypto transactions to wallet transaction format
      const cryptoAsWallet: WalletTransaction[] = (cryptoData || []).map((ct: any) => ({
        id: ct.id,
        user_id: ct.user_id,
        amount: ct.transaction_type === 'deposit' ? ct.nc_amount : -ct.nc_amount,
        kind: ct.transaction_type === 'deposit' ? 'crypto_deposit' : 'crypto_withdrawal',
        reference: ct.transaction_type === 'deposit' 
          ? `Crypto deposit: ${ct.crypto_amount} ${ct.crypto_currency}`
          : `Crypto withdrawal: ${ct.crypto_amount} ${ct.crypto_currency} to ${ct.wallet_address?.substring(0, 10)}...`,
        status: ct.status,
        created_at: ct.created_at,
        currency: 'NGN',
        metadata: {
          tx_hash: ct.tx_hash,
          crypto_amount: ct.crypto_amount,
          crypto_currency: ct.crypto_currency,
          wallet_address: ct.wallet_address,
          exchange_rate: ct.exchange_rate
        }
      }))

      // Merge, deduplicate by reference, and sort
      const allTransactions = [...(walletData || []), ...cryptoAsWallet]
      const uniqueTransactions = allTransactions.filter((tx, index, self) =>
        index === self.findIndex(t => t.reference === tx.reference || t.id === tx.id)
      )
      
      // Sort by created_at descending
      uniqueTransactions.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )

      setTransactions(uniqueTransactions.slice(0, 50))
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
          table: 'profiles',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          initializeWallet()
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
          initializeWallet() // Also refresh balance when transactions change
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }

  // Play spin wheel
  const playSpinWheel = async () => {
    const cost = 10
    
    // Check available balance (prefer non-withdrawable first)
    let deductFrom: 'withdrawable' | 'non_withdrawable' = 'non_withdrawable'
    let availableBalance = balance.non_withdrawable
    
    if (availableBalance < cost) {
      deductFrom = 'withdrawable'
      availableBalance = balance.withdrawable
    }
    
    if (availableBalance < cost) {
      toast({
        title: "Insufficient Balance",
        description: `You need NC ${cost} to play Spin Wheel`,
        variant: "destructive",
      })
      return null
    }

    // Determine winnings (70% = 0, 20% = 5, 9% = 10, 1% = 100)
    const random = Math.random()
    let winnings = 0
    
    if (random > 0.99) {
      winnings = 100 // 1%
    } else if (random > 0.91) {
      winnings = 10 // 9%
    } else if (random > 0.70) {
      winnings = 5 // 20%
    }
    // else 0 (70%)

    try {
      // Deduct cost from appropriate balance and update total
      const columnName = deductFrom === 'withdrawable' ? 'balance_withdrawable' : 'balance_non_withdrawable'
      const currentBalance = balance[deductFrom]
      const newBalance = currentBalance - cost
      const newTotal = balance.total - cost

      await supabase
        .from('profiles')
        .update({ 
          [columnName]: newBalance,
          wallet_balance: newTotal
        })
        .eq('user_id', user.id)

      // Log cost transaction
      await supabase
        .from('wallet_transactions')
        .insert({
          user_id: user.id,
          kind: 'game_loss',
          amount: cost,
          status: 'completed',
          reference: 'Spin Wheel entry fee'
        })

      // Add winnings if any
      if (winnings > 0) {
        const newWithdrawableBalance = balance.withdrawable + winnings
        const newTotal = balance.total - cost + winnings // Total after deducting cost and adding winnings
        
        await supabase
          .from('profiles')
          .update({ 
            balance_withdrawable: newWithdrawableBalance,
            wallet_balance: newTotal
          })
          .eq('user_id', user.id)

        await supabase
          .from('wallet_transactions')
          .insert({
            user_id: user.id,
            kind: 'game_win',
            amount: winnings,
            status: 'completed',
            reference: 'Spin Wheel winnings'
          })

        toast({
          title: "Congratulations!",
          description: `You won NC ${winnings}!`,
        })
      } else {
        toast({
          title: "Better luck next time!",
          description: "No winnings this time",
        })
      }

      // Refresh balance
      await initializeWallet()
      await fetchTransactions()

      return winnings
    } catch (error) {
      console.error('Error playing spin wheel:', error)
      toast({
        title: "Game Error",
        description: "Please try again later",
        variant: "destructive",
      })
      return null
    }
  }

  // Format currency display
  const formatCurrency = (amount: number) => {
    return `NC ${amount.toLocaleString()}`
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

    if (amount > balance.withdrawable) {
      toast({
        title: "Insufficient Funds",
        description: "You don't have enough withdrawable balance",
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
    playSpinWheel,
    formatCurrency,
    refreshWallet: initializeWallet,
    refreshTransactions: fetchTransactions,
    refreshEscrow: fetchEscrowPayments
  }
}