import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/integrations/supabase/client'
import { toast } from 'sonner'

export const useDailySignin = () => {
  const { user } = useAuth()
  const [hasSignedInToday, setHasSignedInToday] = useState(false)
  const [loading, setLoading] = useState(true)
  const [claiming, setClaiming] = useState(false)

  useEffect(() => {
    if (user) {
      checkTodaySignin()
    }
  }, [user])

  const checkTodaySignin = async () => {
    if (!user) return

    try {
      setLoading(true)
      const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD format

      const { data, error } = await supabase
        .from('daily_signins')
        .select('id')
        .eq('user_id', user.id)
        .eq('signin_date', today)
        .maybeSingle()

      if (error) {
        console.error('Error checking daily signin:', error)
        return
      }

      setHasSignedInToday(!!data)
    } catch (error) {
      console.error('Error checking daily signin:', error)
    } finally {
      setLoading(false)
    }
  }

  const claimDailyBonus = async () => {
    if (!user || hasSignedInToday || claiming) return

    try {
      setClaiming(true)
      const today = new Date().toISOString().split('T')[0]
    const rewardAmount = 5.00

      // Start a transaction to ensure atomicity
      const { error: signinError } = await supabase
        .from('daily_signins')
        .insert({
          user_id: user.id,
          signin_date: today,
          reward_amount: rewardAmount
        })

      if (signinError) {
        // Check if it's a duplicate key error (user already signed in today)
        if (signinError.message.includes('duplicate key')) {
          toast.error('You have already signed in today!')
          setHasSignedInToday(true)
          return
        }
        throw signinError
      }

      // Update user's wallet balance using direct update
      const { data: currentProfile, error: fetchError } = await supabase
        .from('profiles')
        .select('wallet_balance')
        .eq('user_id', user.id)
        .single()

      if (fetchError) {
        console.error('Error fetching current balance:', fetchError)
        toast.error('Sign-in recorded but there was an error updating your wallet')
        return
      }

      const newBalance = (currentProfile.wallet_balance || 0) + rewardAmount

      const { error: walletError } = await supabase
        .from('profiles')
        .update({ wallet_balance: newBalance })
        .eq('user_id', user.id)

      if (walletError) {
        console.error('Error updating wallet balance:', walletError)
        toast.error('Sign-in recorded but there was an error updating your wallet')
      } else {
        toast.success(`You've earned ${rewardAmount} NC for today's sign-in!`)
      }

      setHasSignedInToday(true)
      
    } catch (error) {
      console.error('Error claiming daily bonus:', error)
      toast.error('Failed to claim daily bonus. Please try again.')
    } finally {
      setClaiming(false)
    }
  }

  return {
    hasSignedInToday,
    loading,
    claiming,
    claimDailyBonus,
    checkTodaySignin
  }
}