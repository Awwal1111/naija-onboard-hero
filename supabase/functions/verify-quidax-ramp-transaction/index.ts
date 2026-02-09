import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { ethers } from "https://esm.sh/ethers@6.7.0"
import CryptoJS from "https://esm.sh/crypto-js@4.1.1"
import { sendAllNotifications } from '../_shared/notification-helper.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/**
 * VERIFY QUIDAX RAMP TRANSACTION
 * 
 * FIX: Use Quidax's actual transaction amounts directly.
 * 
 * For deposits (buy): User pays ₦X → gets Y USDT → Credit X NC (what they paid)
 * For withdrawals (sell): User deducted X NC → sends Y USDT → gets ₦Z in bank
 * 
 * Quidax handles the rate, we just credit/debit based on their actual amounts.
 */

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const quidaxPrivateKey = Deno.env.get('QUIDAX_PRIVATE_KEY')
    const encryptionSecret = Deno.env.get('WALLET_ENCRYPTION_SECRET') || 'default_secret'
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

    console.log(`[VERIFY_QUIDAX] ========== Starting verification ==========`)
    console.log(`[VERIFY_QUIDAX] Mode: ${mode}, Reference: ${reference}`)
    console.log(`[VERIFY_QUIDAX] User: ${user.id}`)

    // DEDUPLICATION CHECK - Critical to prevent double crediting
    const { data: existingTx } = await supabase
      .from('wallet_transactions')
      .select('id')
      .eq('reference', reference)
      .eq('status', 'completed')
      .single()

    if (existingTx) {
      console.log(`[VERIFY_QUIDAX] ⚠️ Transaction already processed: ${reference}`)
      return new Response(
        JSON.stringify({ success: true, message: 'Transaction already processed' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check quidax_transactions for double processing
    const { data: existingQuidaxTx } = await supabase
      .from('quidax_transactions')
      .select('id, status')
      .eq('reference', reference)
      .single()

    if (existingQuidaxTx?.status === 'completed') {
      console.log(`[VERIFY_QUIDAX] ⚠️ Quidax transaction already completed: ${reference}`)
      return new Response(
        JSON.stringify({ success: true, message: 'Transaction already completed' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get user profile with wallet info
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('wallet_balance, balance_withdrawable, celo_wallet_address, full_name')
      .eq('user_id', user.id)
      .single()

    // Get encrypted_wallet from user_secrets
    const { data: secrets } = await supabase
      .from('user_secrets')
      .select('encrypted_wallet')
      .eq('user_id', user.id)
      .single()
    
    const encryptedWallet = secrets?.encrypted_wallet || (profile as any)?.encrypted_wallet

    if (profileError || !profile) {
      throw new Error('Failed to fetch user profile')
    }

    console.log(`[VERIFY_QUIDAX] User wallet: ${profile.celo_wallet_address}`)

    // Verify transaction with Quidax API
    console.log(`[VERIFY_QUIDAX] Calling Quidax API to verify...`)
    const verifyResponse = await fetch(`https://ramp-be.quidax.io/api/v1/merchants/on_ramp_transaction/${reference}`, {
      method: 'GET',
      headers: {
        'x-private-key': quidaxPrivateKey!,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    })

    if (!verifyResponse.ok) {
      const errorText = await verifyResponse.text()
      console.error('[VERIFY_QUIDAX] Quidax verification failed:', errorText)
      throw new Error('Transaction verification failed with Quidax')
    }

    const verifiedTransaction = await verifyResponse.json()
    console.log('[VERIFY_QUIDAX] Quidax API response:', JSON.stringify(verifiedTransaction, null, 2))

    // Check if transaction is successful
    const status = verifiedTransaction.data?.status
    if (status !== 'successful' && status !== 'completed') {
      console.log(`[VERIFY_QUIDAX] Transaction not yet complete. Status: ${status}`)
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: `Transaction status: ${status}. Please wait for completion.` 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Extract amounts from Quidax response
    // For on-ramp: fiat_deposit.amount = what user paid in NGN
    // For on-ramp: crypto_payout.amount = USDT they receive
    const quidaxData = verifiedTransaction.data
    
    const fiatAmount = parseFloat(
      quidaxData?.fiat_deposit?.amount || 
      quidaxData?.fiat_amount || 
      quidaxData?.from_amount ||
      '0'
    )
    const cryptoAmount = parseFloat(
      quidaxData?.crypto_payout?.amount || 
      quidaxData?.token_amount || 
      quidaxData?.to_amount ||
      '0'
    )

    console.log('[VERIFY_QUIDAX] Quidax transaction amounts:')
    console.log(`  - Fiat (NGN) paid/received: ₦${fiatAmount}`)
    console.log(`  - Crypto (USDT): ${cryptoAmount}`)

    if (fiatAmount <= 0) {
      console.error('[VERIFY_QUIDAX] Invalid fiat amount from Quidax:', fiatAmount)
      throw new Error('Invalid transaction amount from Quidax')
    }

    // Calculate the actual rate from Quidax
    const actualRate = cryptoAmount > 0 ? fiatAmount / cryptoAmount : 0
    console.log(`[VERIFY_QUIDAX] Quidax rate: ₦${actualRate.toFixed(2)} per USDT`)

    if (mode === 'buy') {
      // ===== ON-RAMP (BUY): User paid fiatAmount NGN, gets cryptoAmount USDT =====
      // CREDIT the user with EXACTLY what they paid (fiatAmount) as NC
      // 1 NC = 1 NGN, so if they paid ₦10,000, they get 10,000 NC
      
      console.log(`[VERIFY_QUIDAX] ON-RAMP: Processing deposit`)
      const ncAmount = Math.round(fiatAmount) // User paid this in NGN, credit this as NC

      console.log(`[VERIFY_QUIDAX] ✅ Crediting ${ncAmount} NC (user paid ₦${fiatAmount})`)

      // Credit user
      const newBalance = (profile.wallet_balance || 0) + ncAmount
      const newWithdrawable = (profile.balance_withdrawable || 0) + ncAmount

      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          wallet_balance: newBalance,
          balance_withdrawable: newWithdrawable
        })
        .eq('user_id', user.id)

      if (updateError) {
        console.error('[VERIFY_QUIDAX] Failed to update balance:', updateError)
        throw new Error('Failed to credit balance')
      }

      console.log(`[VERIFY_QUIDAX] New balance: ${newBalance} NC`)

      // Log wallet transaction
      await supabase.from('wallet_transactions').insert({
        user_id: user.id,
        kind: 'quidax_deposit',
        amount: ncAmount,
        status: 'completed',
        reference: reference
      })

      // Update quidax_transactions
      await supabase
        .from('quidax_transactions')
        .update({
          status: 'completed',
          token_amount: cryptoAmount,
          fiat_amount: fiatAmount,
          quidax_data: { 
            ...quidaxData, 
            credited_at: new Date().toISOString(), 
            nc_amount: ncAmount,
            exchange_rate: actualRate 
          }
        })
        .eq('reference', reference)

      // Send notification
      await sendAllNotifications(supabase, {
        userId: user.id,
        type: 'deposit_completed',
        title: '💰 Deposit Successful',
        message: `${ncAmount.toLocaleString()} NC credited to your wallet`,
        amount: ncAmount,
        metadata: { reference, fiatAmount, cryptoAmount, exchangeRate: actualRate }
      })

      // ===== SWEEP FUNDS TO MASTER WALLET =====
      if (encryptedWallet && profile.celo_wallet_address) {
        console.log(`[VERIFY_QUIDAX] Attempting sweep to master wallet...`)
        
        try {
          const provider = new ethers.JsonRpcProvider("https://forno.celo.org")
          const usdtAddress = "0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e"
          
          const { data: masterAddressData } = await supabase
            .from("system_settings")
            .select("value")
            .eq("key", "master_wallet_address")
            .single()

          const { data: masterKeyData } = await supabase
            .from("system_settings")
            .select("value")
            .eq("key", "master_wallet_encrypted")
            .single()

          if (masterAddressData && masterKeyData) {
            const masterAddress = masterAddressData.value
            const masterPrivateKey = CryptoJS.AES.decrypt(masterKeyData.value, encryptionSecret).toString(CryptoJS.enc.Utf8)
            const userPrivateKey = CryptoJS.AES.decrypt(encryptedWallet, encryptionSecret).toString(CryptoJS.enc.Utf8)

            if (masterPrivateKey && userPrivateKey) {
              const masterWallet = new ethers.Wallet(masterPrivateKey, provider)
              const userWallet = new ethers.Wallet(userPrivateKey, provider)

              // Check user's USDT balance
              const tokenContract = new ethers.Contract(
                usdtAddress,
                ["function balanceOf(address account) view returns (uint256)", "function transfer(address to, uint256 amount) returns (bool)"],
                userWallet
              )

              // Wait a moment for Quidax to send the USDT
              await new Promise(resolve => setTimeout(resolve, 3000))

              const userUsdtBalance = await tokenContract.balanceOf(profile.celo_wallet_address)
              console.log(`[VERIFY_QUIDAX] User USDT balance: ${ethers.formatUnits(userUsdtBalance, 6)}`)

              if (userUsdtBalance > BigInt(0)) {
                // Send gas for the sweep
                const gasAmount = ethers.parseEther("0.003")
                const masterCeloBalance = await provider.getBalance(masterAddress)

                if (masterCeloBalance >= gasAmount) {
                  console.log(`[VERIFY_QUIDAX] Sending gas...`)
                  const gasTx = await masterWallet.sendTransaction({
                    to: profile.celo_wallet_address,
                    value: gasAmount
                  })
                  await gasTx.wait()

                  await new Promise(resolve => setTimeout(resolve, 2000))

                  // Sweep USDT
                  console.log(`[VERIFY_QUIDAX] Sweeping USDT...`)
                  const sweepTx = await tokenContract.transfer(masterAddress, userUsdtBalance)
                  await sweepTx.wait()
                  console.log(`[VERIFY_QUIDAX] ✅ Swept ${ethers.formatUnits(userUsdtBalance, 6)} USDT to master wallet`)
                }
              }
            }
          }
        } catch (sweepError: any) {
          console.error(`[VERIFY_QUIDAX] Sweep failed:`, sweepError.message)
          // Don't fail the transaction, just log the error
        }
      }

      console.log(`[VERIFY_QUIDAX] ========== BUY COMPLETE ==========`)

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: `Credited ${ncAmount.toLocaleString()} NC to your wallet!`,
          amount: ncAmount,
          exchangeRate: actualRate
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )

    } else if (mode === 'sell') {
      // ===== OFF-RAMP (SELL): Verify the sell completed =====
      console.log(`[VERIFY_QUIDAX] OFF-RAMP: Verifying sell completion`)
      
      // For sell, fiatAmount is what Quidax sends to user's bank
      console.log(`[VERIFY_QUIDAX] Sell complete:`)
      console.log(`  - Sold: ${cryptoAmount} USDT`)
      console.log(`  - Receiving: ₦${fiatAmount} to bank`)

      // Update quidax_transactions to completed
      await supabase
        .from('quidax_transactions')
        .update({
          status: 'completed',
          fiat_amount: fiatAmount,
          token_amount: cryptoAmount,
          quidax_data: { 
            ...quidaxData, 
            verified_at: new Date().toISOString(),
            exchange_rate: actualRate 
          }
        })
        .eq('reference', reference)

      // Update wallet transaction to completed
      await supabase
        .from('wallet_transactions')
        .update({ 
          status: 'completed',
          reference: reference
        })
        .eq('reference', reference)
        .eq('user_id', user.id)

      // Send notification
      await sendAllNotifications(supabase, {
        userId: user.id,
        type: 'withdrawal_completed',
        title: '✅ Withdrawal Successful',
        message: `₦${fiatAmount.toLocaleString()} sent to your bank account.`,
        amount: fiatAmount,
        metadata: { reference, fiatAmount, cryptoAmount, exchangeRate: actualRate }
      })

      console.log(`[VERIFY_QUIDAX] ========== SELL COMPLETE ==========`)

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: `Withdrawal completed. ₦${fiatAmount.toLocaleString()} sent to your bank.`,
          fiatAmount,
          exchangeRate: actualRate
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    throw new Error(`Unknown mode: ${mode}`)

  } catch (error: any) {
    console.error('[VERIFY_QUIDAX] Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
