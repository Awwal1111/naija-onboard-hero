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

// ---- Module-level shared wallet cache to eliminate duplicate egress ----
const WALLET_TTL_MS = 5 * 60 * 1000
const EMPTY_BALANCE: WalletBalance = { withdrawable: 0, non_withdrawable: 0, total: 0, escrow_hold: 0 }
const walletCache = new Map<string, { balance: WalletBalance; ts: number }>()
const walletInflight = new Map<string, Promise<WalletBalance>>()
const walletSubscribers = new Map<string, Set<(b: WalletBalance) => void>>()
const walletChannels = new Map<string, ReturnType<typeof supabase.channel>>()
const txCache = new Map<string, { data: WalletTransaction[]; ts: number }>()
const txInflight = new Map<string, Promise<WalletTransaction[]>>()

async function loadWalletBalance(userId: string, force = false): Promise<WalletBalance> {
  const cached = walletCache.get(userId)
  if (!force && cached && Date.now() - cached.ts < WALLET_TTL_MS) return cached.balance
  const existing = walletInflight.get(userId)
  if (existing) return existing
  const promise = (async () => {
    const { data: profile } = await supabase
      .from('profiles')
      .select('wallet_balance, balance_withdrawable, balance_non_withdrawable')
      .eq('user_id', userId)
      .maybeSingle()
    const { data: walletData } = await supabase
      .from('user_wallets')
      .select('escrow_hold')
      .eq('user_id', userId)
      .maybeSingle()
    const balance: WalletBalance = {
      withdrawable: Number(profile?.balance_withdrawable || 0),
      non_withdrawable: Number(profile?.balance_non_withdrawable || 0),
      total: Number(profile?.wallet_balance || 0),
      escrow_hold: Number(walletData?.escrow_hold || 0),
    }
    walletCache.set(userId, { balance, ts: Date.now() })
    walletSubscribers.get(userId)?.forEach((cb) => cb(balance))
    return balance
  })()
  walletInflight.set(userId, promise)
  try { return await promise } finally { walletInflight.delete(userId) }
}

function ensureWalletChannel(userId: string) {
  if (walletChannels.has(userId)) return
  const channel = supabase
    .channel(`wallet-${userId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles', filter: `user_id=eq.${userId}` }, () => {
      loadWalletBalance(userId, true)
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'wallet_transactions', filter: `user_id=eq.${userId}` }, () => {
      txCache.delete(userId)
      loadWalletBalance(userId, true)
    })
    .subscribe()
  walletChannels.set(userId, channel)
}

export const useWallet = () => {
  const { user } = useAuth()
  const { toast } = useToast()
  const [balance, setBalance] = useState<WalletBalance>(() =>
    user ? (walletCache.get(user.id)?.balance ?? EMPTY_BALANCE) : EMPTY_BALANCE
  )
  const [loading, setLoading] = useState(() => (user ? !walletCache.get(user.id) : true))
  const [transactions, setTransactions] = useState<WalletTransaction[]>(() =>
    user ? (txCache.get(user.id)?.data ?? []) : []
  )
  const [escrowPayments, setEscrowPayments] = useState<EscrowPayment[]>([])

  useEffect(() => {
    if (!user) { setLoading(false); return }
    let subs = walletSubscribers.get(user.id)
    if (!subs) { subs = new Set(); walletSubscribers.set(user.id, subs) }
    const cb = (b: WalletBalance) => setBalance(b)
    subs.add(cb)

    const cached = walletCache.get(user.id)
    if (cached && Date.now() - cached.ts < WALLET_TTL_MS) {
      setBalance(cached.balance); setLoading(false)
    } else {
      loadWalletBalance(user.id).then((b) => { setBalance(b); setLoading(false) }).catch(() => setLoading(false))
    }
    ensureWalletChannel(user.id)
    fetchTransactions()

    return () => { subs?.delete(cb) }
  }, [user?.id])

  const initializeWallet = async () => {
    if (!user) return
    const b = await loadWalletBalance(user.id, true)
    setBalance(b); setLoading(false)
  }

  const fetchTransactions = async () => {
    if (!user) return
    const cached = txCache.get(user.id)
    if (cached && Date.now() - cached.ts < WALLET_TTL_MS) {
      setTransactions(cached.data)
      return
    }
    const existing = txInflight.get(user.id)
    if (existing) { setTransactions(await existing); return }

    const promise = (async () => {
      const { data: walletData } = await supabase
        .from('wallet_transactions')
        .select('id, user_id, amount, kind, reference, status, created_at, currency, metadata')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50)

      const { data: cryptoData } = await supabase
        .from('crypto_transactions')
        .select('id, user_id, nc_amount, crypto_amount, crypto_currency, transaction_type, status, created_at, tx_hash, wallet_address, exchange_rate')
        .eq('user_id', user.id)
        .neq('wallet_address', 'ivorypay_checkout')
        .order('created_at', { ascending: false })
        .limit(50)

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
          exchange_rate: ct.exchange_rate,
        },
      }))

      const all = [...(walletData || []), ...cryptoAsWallet]
      const unique = all.filter((tx, i, self) =>
        i === self.findIndex((t) => t.reference === tx.reference || t.id === tx.id)
      )
      unique.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      const result = unique.slice(0, 50)
      txCache.set(user.id, { data: result, ts: Date.now() })
      return result
    })()
    txInflight.set(user.id, promise)
    try {
      const result = await promise
      setTransactions(result)
    } catch (e) {
      console.error('Error fetching transactions:', e)
    } finally {
      txInflight.delete(user.id)
    }
  }

  const fetchEscrowPayments = async () => {
    if (!user) return
    setEscrowPayments([])
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

  // NOTE: Paystack deposit/escrow flows removed — use IvoryPay/Pretium/Quidax instead



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
    initiateWithdrawal,
    releaseEscrow,
    refundEscrow,
    playSpinWheel,
    formatCurrency,
    refreshWallet: initializeWallet,
    refreshTransactions: fetchTransactions,
    refreshEscrow: fetchEscrowPayments
  }
}