import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/integrations/supabase/client'
import { toast } from 'sonner'

// Streak rewards: Day 1 = 5 NC, Day 2 = 10 NC, etc up to Day 7 = 35 NC, then resets
const getStreakReward = (streakDay: number): number => {
  const day = Math.min(streakDay, 7) // Cap at 7 days
  return day * 5 // 5, 10, 15, 20, 25, 30, 35 NC
}

export const useDailySignin = () => {
  const { user } = useAuth()
  const [hasSignedInToday, setHasSignedInToday] = useState(false)
  const [loading, setLoading] = useState(true)
  const [claiming, setClaiming] = useState(false)
  const [currentStreak, setCurrentStreak] = useState(0)
  const [nextReward, setNextReward] = useState(5)

  useEffect(() => {
    if (user) {
      checkTodaySignin()
    }
  }, [user])

  const checkTodaySignin = async () => {
    if (!user) return

    try {
      setLoading(true)
      const today = new Date().toISOString().split('T')[0]

      // Check today's signin
      const { data: todaySignin, error: todayError } = await supabase
        .from('daily_signins')
        .select('id, streak_count')
        .eq('user_id', user.id)
        .eq('signin_date', today)
        .maybeSingle()

      if (todayError) {
        console.error('Error checking daily signin:', todayError)
        return
      }

      if (todaySignin) {
        setHasSignedInToday(true)
        setCurrentStreak(todaySignin.streak_count || 1)
        setNextReward(getStreakReward((todaySignin.streak_count || 1) + 1))
        return
      }

      // Get current streak from profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('current_streak, last_signin_date')
        .eq('user_id', user.id)
        .single()

      if (profile) {
        const yesterday = new Date()
        yesterday.setDate(yesterday.getDate() - 1)
        const yesterdayStr = yesterday.toISOString().split('T')[0]

        // Check if streak continues (signed in yesterday)
        if (profile.last_signin_date === yesterdayStr) {
          setCurrentStreak(profile.current_streak || 0)
          setNextReward(getStreakReward((profile.current_streak || 0) + 1))
        } else {
          // Streak broken, start fresh
          setCurrentStreak(0)
          setNextReward(5)
        }
      }

      setHasSignedInToday(false)
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
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      const yesterdayStr = yesterday.toISOString().split('T')[0]

      // Get current profile data
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('wallet_balance, balance_non_withdrawable, current_streak, last_signin_date')
        .eq('user_id', user.id)
        .single()

      if (profileError) throw profileError

      // Calculate new streak
      let newStreak = 1
      if (profile.last_signin_date === yesterdayStr) {
        // Continuing streak
        newStreak = (profile.current_streak || 0) + 1
        if (newStreak > 7) newStreak = 1 // Reset after 7 days
      }

      const rewardAmount = getStreakReward(newStreak)

      // Insert signin record
      const { error: signinError } = await supabase
        .from('daily_signins')
        .insert({
          user_id: user.id,
          signin_date: today,
          reward_amount: rewardAmount,
          streak_count: newStreak,
          streak_bonus: newStreak > 1 ? rewardAmount - 5 : 0
        })

      if (signinError) {
        if (signinError.message.includes('duplicate key')) {
          toast.error('You have already signed in today!')
          setHasSignedInToday(true)
          return
        }
        throw signinError
      }

      // Update profile with new balance and streak
      const newTotalBalance = (profile.wallet_balance || 0) + rewardAmount
      const newNonWithdrawable = (profile.balance_non_withdrawable || 0) + rewardAmount

      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          wallet_balance: newTotalBalance,
          balance_non_withdrawable: newNonWithdrawable,
          current_streak: newStreak,
          last_signin_date: today
        })
        .eq('user_id', user.id)

      if (updateError) {
        console.error('Error updating profile:', updateError)
        toast.error('Sign-in recorded but balance update failed')
      } else {
        const streakEmoji = newStreak >= 7 ? '🔥' : newStreak >= 3 ? '⚡' : '✨'
        toast.success(`${streakEmoji} Day ${newStreak} streak! You earned ${rewardAmount} NC!`)
      }

      setHasSignedInToday(true)
      setCurrentStreak(newStreak)
      setNextReward(getStreakReward(newStreak < 7 ? newStreak + 1 : 1))

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
    currentStreak,
    nextReward,
    claimDailyBonus,
    checkTodaySignin,
    getStreakReward
  }
}
