import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/**
 * NC SAVINGS - Internal Yield System
 * 
 * Since Moola Market on Celo doesn't support USDT deposits,
 * we implement an internal savings system where:
 * - Users deposit NC to earn yield
 * - Platform pays interest from transaction fees revenue
 * - Interest compounds daily at a fixed APY
 * 
 * This is simpler, more reliable, and doesn't require on-chain transactions.
 */

// Fixed APY for NC savings (can be adjusted by admin)
const DEFAULT_APY = 5.0 // 5% annual yield

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get authenticated user
    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      throw new Error('Missing authorization header')
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      throw new Error('Unauthorized')
    }

    const { action, amount } = await req.json()
    console.log(`[NC_SAVINGS] Action: ${action}, User: ${user.id}, Amount: ${amount}`)

    switch (action) {
      case 'get_apy': {
        // Get APY from system settings or use default
        const { data: apySetting } = await supabase
          .from('system_settings')
          .select('value')
          .eq('key', 'savings_apy')
          .single()

        const apy = apySetting?.value ? parseFloat(apySetting.value) : DEFAULT_APY
        console.log(`[NC_SAVINGS] Current APY: ${apy}%`)

        return new Response(
          JSON.stringify({ success: true, apy: apy.toFixed(2) }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'get_balance': {
        // Get user's staked balance and calculate earned interest
        const { data: position } = await supabase
          .from('usdt_staking_positions')
          .select('*')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .single()

        if (!position) {
          return new Response(
            JSON.stringify({
              success: true,
              position: { amount_staked: 0, amount_earned: 0, total_deposited: 0, total_withdrawn: 0 },
              onChainBalance: '0'
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Calculate earned interest since last update
        const { data: apySetting } = await supabase
          .from('system_settings')
          .select('value')
          .eq('key', 'savings_apy')
          .single()
        
        const apy = apySetting?.value ? parseFloat(apySetting.value) : DEFAULT_APY
        const dailyRate = apy / 100 / 365

        const lastUpdate = new Date(position.updated_at || position.created_at)
        const now = new Date()
        const daysSinceUpdate = (now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24)
        
        // Compound interest calculation
        const interestEarned = position.amount_staked * dailyRate * daysSinceUpdate
        const totalEarned = (position.amount_earned || 0) + interestEarned

        console.log(`[NC_SAVINGS] Balance: ${position.amount_staked} NC, Earned: ${totalEarned.toFixed(4)} NC`)

        return new Response(
          JSON.stringify({
            success: true,
            position: {
              ...position,
              amount_earned: totalEarned,
              pending_interest: interestEarned
            },
            onChainBalance: position.amount_staked.toString()
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'deposit': {
        if (!amount || amount <= 0) {
          throw new Error('Invalid deposit amount')
        }

        // Amount is in NC
        const ncAmount = parseFloat(amount)
        if (ncAmount < 100) {
          throw new Error('Minimum deposit is 100 NC')
        }

        // Get user profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('wallet_balance, balance_withdrawable')
          .eq('user_id', user.id)
          .single()

        if (!profile) {
          throw new Error('Profile not found')
        }

        if (profile.balance_withdrawable < ncAmount) {
          throw new Error(`Insufficient balance. Available: ${profile.balance_withdrawable} NC`)
        }

        console.log(`[NC_SAVINGS] Depositing ${ncAmount} NC to savings`)

        // Deduct from user's withdrawable balance
        await supabase
          .from('profiles')
          .update({
            wallet_balance: profile.wallet_balance - ncAmount,
            balance_withdrawable: profile.balance_withdrawable - ncAmount
          })
          .eq('user_id', user.id)

        // Update or create staking position
        const { data: existingPosition } = await supabase
          .from('usdt_staking_positions')
          .select('*')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .single()

        if (existingPosition) {
          // Calculate and add any pending interest first
          const { data: apySetting } = await supabase
            .from('system_settings')
            .select('value')
            .eq('key', 'savings_apy')
            .single()
          
          const apy = apySetting?.value ? parseFloat(apySetting.value) : DEFAULT_APY
          const dailyRate = apy / 100 / 365
          const lastUpdate = new Date(existingPosition.updated_at)
          const now = new Date()
          const daysSinceUpdate = (now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24)
          const pendingInterest = existingPosition.amount_staked * dailyRate * daysSinceUpdate

          await supabase
            .from('usdt_staking_positions')
            .update({
              amount_staked: existingPosition.amount_staked + ncAmount,
              amount_earned: (existingPosition.amount_earned || 0) + pendingInterest,
              total_deposited: existingPosition.total_deposited + ncAmount,
              updated_at: new Date().toISOString()
            })
            .eq('id', existingPosition.id)
        } else {
          await supabase
            .from('usdt_staking_positions')
            .insert({
              user_id: user.id,
              amount_staked: ncAmount,
              total_deposited: ncAmount,
              amount_earned: 0,
              status: 'active'
            })
        }

        // Log transaction
        await supabase.from('staking_transactions').insert({
          user_id: user.id,
          transaction_type: 'deposit',
          amount: ncAmount,
          status: 'completed',
          completed_at: new Date().toISOString()
        })

        // Log wallet transaction
        await supabase.from('wallet_transactions').insert({
          user_id: user.id,
          kind: 'staking_deposit',
          amount: -ncAmount,
          status: 'completed',
          reference: `Saved ${ncAmount.toLocaleString()} NC to Savings`
        })

        // Notify user
        await supabase.from('notifications').insert({
          user_id: user.id,
          type: 'transaction',
          title: '📈 Savings Deposit Successful',
          message: `You saved ${ncAmount.toLocaleString()} NC. Start earning ${DEFAULT_APY}% APY!`,
          metadata: { amount: ncAmount }
        })

        console.log(`[NC_SAVINGS] ✅ Deposited ${ncAmount} NC`)

        return new Response(
          JSON.stringify({
            success: true,
            ncDeducted: ncAmount,
            message: `Successfully saved ${ncAmount.toLocaleString()} NC!`
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'withdraw': {
        if (!amount || amount <= 0) {
          throw new Error('Invalid withdraw amount')
        }

        const ncAmount = parseFloat(amount)

        // Get user's staking position
        const { data: position } = await supabase
          .from('usdt_staking_positions')
          .select('*')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .single()

        if (!position) {
          throw new Error('No active savings position found')
        }

        // Calculate earned interest
        const { data: apySetting } = await supabase
          .from('system_settings')
          .select('value')
          .eq('key', 'savings_apy')
          .single()
        
        const apy = apySetting?.value ? parseFloat(apySetting.value) : DEFAULT_APY
        const dailyRate = apy / 100 / 365
        const lastUpdate = new Date(position.updated_at)
        const now = new Date()
        const daysSinceUpdate = (now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24)
        const pendingInterest = position.amount_staked * dailyRate * daysSinceUpdate
        const totalEarned = (position.amount_earned || 0) + pendingInterest

        // Total available = staked + earned
        const totalAvailable = position.amount_staked + totalEarned

        if (ncAmount > totalAvailable) {
          throw new Error(`Insufficient savings balance. Available: ${totalAvailable.toFixed(2)} NC`)
        }

        console.log(`[NC_SAVINGS] Withdrawing ${ncAmount} NC (Available: ${totalAvailable.toFixed(2)})`)

        // Credit NC back to user
        const { data: profile } = await supabase
          .from('profiles')
          .select('wallet_balance, balance_withdrawable')
          .eq('user_id', user.id)
          .single()

        await supabase
          .from('profiles')
          .update({
            wallet_balance: (profile?.wallet_balance || 0) + ncAmount,
            balance_withdrawable: (profile?.balance_withdrawable || 0) + ncAmount
          })
          .eq('user_id', user.id)

        // Update staking position
        // If withdrawing everything, close the position
        const remainingStaked = totalAvailable - ncAmount

        if (remainingStaked < 1) {
          // Close position
          await supabase
            .from('usdt_staking_positions')
            .update({
              amount_staked: 0,
              amount_earned: 0,
              total_withdrawn: position.total_withdrawn + ncAmount,
              status: 'closed',
              updated_at: new Date().toISOString()
            })
            .eq('id', position.id)
        } else {
          // Partial withdrawal - withdraw from principal first, then from earnings
          let newStaked = position.amount_staked
          let newEarned = totalEarned
          let amountToWithdraw = ncAmount

          // First take from earnings
          if (amountToWithdraw <= newEarned) {
            newEarned -= amountToWithdraw
          } else {
            amountToWithdraw -= newEarned
            newEarned = 0
            newStaked -= amountToWithdraw
          }

          await supabase
            .from('usdt_staking_positions')
            .update({
              amount_staked: newStaked,
              amount_earned: newEarned,
              total_withdrawn: position.total_withdrawn + ncAmount,
              updated_at: new Date().toISOString()
            })
            .eq('id', position.id)
        }

        // Log transaction
        await supabase.from('staking_transactions').insert({
          user_id: user.id,
          position_id: position.id,
          transaction_type: 'withdraw',
          amount: ncAmount,
          status: 'completed',
          completed_at: new Date().toISOString()
        })

        // Log wallet transaction
        await supabase.from('wallet_transactions').insert({
          user_id: user.id,
          kind: 'staking_withdrawal',
          amount: ncAmount,
          status: 'completed',
          reference: `Withdrew ${ncAmount.toLocaleString()} NC from Savings`
        })

        // Notify user
        await supabase.from('notifications').insert({
          user_id: user.id,
          type: 'transaction',
          title: '💰 Savings Withdrawal Complete',
          message: `Withdrew ${ncAmount.toLocaleString()} NC to your wallet.`,
          metadata: { amount: ncAmount }
        })

        console.log(`[NC_SAVINGS] ✅ Withdrew ${ncAmount} NC`)

        return new Response(
          JSON.stringify({
            success: true,
            ncCredited: ncAmount,
            message: `Successfully withdrew ${ncAmount.toLocaleString()} NC!`
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      default:
        throw new Error(`Unknown action: ${action}`)
    }

  } catch (error: any) {
    console.error('[NC_SAVINGS] Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
