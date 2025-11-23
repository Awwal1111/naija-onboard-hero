import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { sendAllNotifications } from '../_shared/notification-helper.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const quidaxPrivateKey = Deno.env.get('QUIDAX_PRIVATE_KEY')
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

    const { reference, transaction, mode } = await req.json()

    console.log(`[QUIDAX RAMP] Verifying ${mode} transaction:`, reference)

    // Verify transaction with Quidax API - Using correct authentication
    const verifyResponse = await fetch(`https://ramp-be.quidax.io/api/v1/merchants/on_ramp_transaction/${reference}`, {
      method: 'GET',
      headers: {
        'x-private-key': quidaxPrivateKey,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    })

    if (!verifyResponse.ok) {
      console.error('Quidax verification failed:', await verifyResponse.text())
      throw new Error('Transaction verification failed')
    }

    const verifiedTransaction = await verifyResponse.json()
    console.log('[QUIDAX RAMP] Verified transaction:', verifiedTransaction)

    // Check if transaction is successful
    if (verifiedTransaction.data?.status !== 'successful' && verifiedTransaction.data?.status !== 'completed') {
      throw new Error(`Transaction not successful. Status: ${verifiedTransaction.data?.status}`)
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('wallet_balance, balance_withdrawable')
      .eq('user_id', user.id)
      .single()

    if (profileError) {
      console.error('Profile fetch error:', profileError)
      throw new Error('Failed to fetch user profile')
    }

    let updateAmount = 0
    let transactionType = ''
    let description = ''

    if (mode === 'buy') {
      // Extract amounts from correct Quidax payload paths
      const cryptoAmount = parseFloat(verifiedTransaction.data?.crypto_payout?.amount || '0')
      const fiatAmount = parseFloat(verifiedTransaction.data?.fiat_deposit?.amount || '0')

      console.log('[QUIDAX RAMP] Extracted amounts:', {
        cryptoAmount,
        fiatAmount,
        userId: user.id,
        reference,
        fullData: verifiedTransaction.data
      })

      // Validate amounts
      if (fiatAmount <= 0 || cryptoAmount <= 0) {
        console.error('[QUIDAX RAMP] Invalid amounts:', { fiatAmount, cryptoAmount })
        throw new Error('Invalid fiat or crypto amount in Quidax payload')
      }

      // Calculate NC dynamically based on actual transaction rate
      const ncPerUSDT = fiatAmount / cryptoAmount
      updateAmount = Math.floor(cryptoAmount * ncPerUSDT)
      transactionType = 'quidax_buy'
      description = `Bought ${cryptoAmount.toFixed(4)} USDT via Quidax Ramp (₦${fiatAmount.toFixed(2)})`

      const previousWallet = profile.wallet_balance || 0
      const previousWithdrawable = profile.balance_withdrawable || 0

      console.log('[QUIDAX RAMP] NC Calculation:', {
        userId: user.id,
        cryptoAmount,
        fiatAmount,
        ncPerUSDT: ncPerUSDT.toFixed(2),
        updateAmount,
        previousWallet
      })

      // Update user balance
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          wallet_balance: previousWallet + updateAmount,
          balance_withdrawable: previousWithdrawable + updateAmount
        })
        .eq('user_id', user.id)

      if (updateError) {
        console.error('[QUIDAX RAMP] Balance update error:', updateError)
        throw new Error('Failed to update balance')
      }

      console.log(`[QUIDAX RAMP] ✅ Credited ${updateAmount} NC to user ${user.id}`)

      // Send all notifications for deposit
      await sendAllNotifications(supabase, {
        userId: user.id,
        type: 'deposit_completed',
        title: '💰 Deposit Successful',
        message: `Your account has been credited with ${updateAmount.toLocaleString()} NC (${cryptoAmount.toFixed(4)} USDT)`,
        amount: updateAmount,
        metadata: {
          reference,
          cryptoAmount,
          fiatAmount,
          transactionType: 'quidax_buy'
        }
      })
    } else if (mode === 'sell') {
      // For sell transactions, deduct user's balance (already done before initiating)
      const cryptoAmount = parseFloat(verifiedTransaction.data?.crypto_payout?.amount || '0')
      const fiatAmount = parseFloat(verifiedTransaction.data?.fiat_deposit?.amount || '0')
      
      if (fiatAmount > 0 && cryptoAmount > 0) {
        const ncPerUSDT = fiatAmount / cryptoAmount
        updateAmount = Math.floor(cryptoAmount * ncPerUSDT)
      } else {
        updateAmount = 0
      }
      
      transactionType = 'quidax_sell'
      description = `Sold ${cryptoAmount.toFixed(4)} USDT via Quidax Ramp`

      console.log(`[QUIDAX RAMP] Confirmed sell of ${updateAmount} NC for user ${user.id}`)

      // Send all notifications for withdrawal
      await sendAllNotifications(supabase, {
        userId: user.id,
        type: 'withdrawal_completed',
        title: '✅ Withdrawal Successful',
        message: `Your withdrawal of ${updateAmount.toLocaleString()} NC (${cryptoAmount.toFixed(4)} USDT) has been completed`,
        amount: updateAmount,
        metadata: {
          reference,
          cryptoAmount,
          fiatAmount,
          transactionType: 'quidax_sell'
        }
      })
    }

    // Log transaction
    const { error: txError } = await supabase
      .from('wallet_transactions')
      .insert({
        user_id: user.id,
        amount: updateAmount,
        kind: transactionType,
        description: description,
        status: 'completed',
        reference: reference
      })

    if (txError) {
      console.error('Transaction log error:', txError)
    }

    // Store Quidax transaction details
    const { error: quidaxTxError } = await supabase
      .from('quidax_transactions')
      .insert({
        user_id: user.id,
        reference: reference,
        transaction_type: mode,
        status: verifiedTransaction.data?.status || 'completed',
        amount_ngn: verifiedTransaction.data?.fiat_amount || 0,
        amount_crypto: verifiedTransaction.data?.crypto_amount || 0,
        crypto_currency: 'USDT',
        raw_response: verifiedTransaction
      })

    if (quidaxTxError) {
      console.error('Quidax transaction storage error:', quidaxTxError)
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Transaction verified and balance updated`,
        amount: updateAmount
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )
  } catch (error) {
    console.error('Error in verify-quidax-ramp-transaction:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})
