import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from './useAuth'
import { toast } from 'sonner'

interface StakingPosition {
  id: string
  amount_staked: number
  amount_earned: number
  total_deposited: number
  total_withdrawn: number
  pending_interest?: number
  status: string
  created_at: string
  updated_at: string
}

export const useUSDTStaking = () => {
  const { user } = useAuth()
  const [position, setPosition] = useState<StakingPosition | null>(null)
  const [apy, setApy] = useState<string>('5.00')
  const [loading, setLoading] = useState(false)
  const [apyLoading, setApyLoading] = useState(true)

  const fetchAPY = useCallback(async () => {
    setApyLoading(true)
    try {
      const { data, error } = await supabase.functions.invoke('moola-staking', {
        body: { action: 'get_apy' }
      })
      
      if (error) throw error
      if (data?.apy) {
        setApy(data.apy)
      }
    } catch (error: any) {
      console.error('Error fetching APY:', error)
      setApy('5.00') // Fallback
    } finally {
      setApyLoading(false)
    }
  }, [])

  const fetchPosition = useCallback(async () => {
    if (!user) return

    try {
      const { data, error } = await supabase.functions.invoke('moola-staking', {
        body: { action: 'get_balance' }
      })
      
      if (error) throw error
      if (data?.position) {
        setPosition(data.position)
      }
    } catch (error: any) {
      console.error('Error fetching staking position:', error)
    }
  }, [user])

  const deposit = async (ncAmount: number) => {
    if (!user) {
      toast.error('Please login to save')
      return { success: false, error: 'Not logged in' }
    }

    if (ncAmount < 100) {
      toast.error('Minimum deposit is 100 NC')
      return { success: false, error: 'Minimum 100 NC' }
    }

    setLoading(true)
    try {
      const { data, error } = await supabase.functions.invoke('moola-staking', {
        body: { action: 'deposit', amount: ncAmount }
      })
      
      if (error) throw error
      if (data?.error) throw new Error(data.error)
      
      toast.success(data.message || 'Savings deposit successful!')
      await fetchPosition()
      
      return { success: true, data }
    } catch (error: any) {
      console.error('Deposit error:', error)
      toast.error(error.message || 'Deposit failed')
      return { success: false, error: error.message }
    } finally {
      setLoading(false)
    }
  }

  const withdraw = async (ncAmount: number) => {
    if (!user) {
      toast.error('Please login to withdraw')
      return { success: false, error: 'Not logged in' }
    }

    if (ncAmount <= 0) {
      toast.error('Please enter a valid amount')
      return { success: false, error: 'Invalid amount' }
    }

    setLoading(true)
    try {
      const { data, error } = await supabase.functions.invoke('moola-staking', {
        body: { action: 'withdraw', amount: ncAmount }
      })
      
      if (error) throw error
      if (data?.error) throw new Error(data.error)
      
      toast.success(data.message || 'Withdrawal successful!')
      await fetchPosition()
      
      return { success: true, data }
    } catch (error: any) {
      console.error('Withdraw error:', error)
      toast.error(error.message || 'Withdrawal failed')
      return { success: false, error: error.message }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAPY()
  }, [fetchAPY])

  useEffect(() => {
    if (user) {
      fetchPosition()
    }
  }, [user, fetchPosition])

  return {
    position,
    apy,
    apyLoading,
    loading,
    deposit,
    withdraw,
    refresh: () => {
      fetchAPY()
      fetchPosition()
    }
  }
}
