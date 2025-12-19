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
 * CRITICAL FIX: Use Quidax's actual transaction rate, not hardcoded values.
 * 
 * For deposits (buy): User pays ₦X, gets Y USDT → Credit ₦X as NC (what they paid)
 * For withdrawals (sell): User sells Y USDT, gets ₦X → Deduct ₦X as NC (what Quidax pays)
 * 
 * This ensures users get exactly what they pay/receive from Quidax.
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

    // Get user profile with wallet info
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('wallet_balance, balance_withdrawable, celo_wallet_address, encrypted_wallet, full_name')
      .eq('user_id', user.id)
      .single()

    if (profileError || !profile) {
      throw new Error('Failed to fetch user profile')
    }

    console.log(`[VERIFY_QUIDAX] User wallet: ${profile.celo_wallet_address}`)

    // Verify transaction with Quidax API
    console.log(`[VERIFY_QUIDAX] Calling Quidax API...`)
    const verifyResponse = await fetch(`https://ramp-be.quidax.io/api/v1/merchants/on_ramp_transaction/${reference}`, {
      method: 'GET',
      headers: {
        'x-private-key': quidaxPrivateKey,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    })

    if (!verifyResponse.ok) {
      const errorText = await verifyResponse.text()
      console.error('[VERIFY_QUIDAX] Quidax verification failed:', errorText)
      throw new Error('Transaction verification failed')
    }

    const verifiedTransaction = await verifyResponse.json()
    console.log('[VERIFY_QUIDAX] Quidax API response:', JSON.stringify(verifiedTransaction))

    // Check if transaction is successful
    const status = verifiedTransaction.data?.status
    if (status !== 'successful' && status !== 'completed') {
      console.log(`[VERIFY_QUIDAX] Transaction not yet complete. Status: ${status}`)
      throw new Error(`Transaction not successful. Status: ${status}`)
    }

    // CRITICAL FIX: Extract amounts from correct Quidax payload paths
    // For on-ramp: fiat_deposit.amount = what user paid, crypto_payout.amount = USDT received
    const cryptoAmount = parseFloat(
      verifiedTransaction.data?.crypto_payout?.amount || 
      verifiedTransaction.data?.token_amount || 
      verifiedTransaction.data?.crypto_amount || 
      '0'
    )
    const fiatAmount = parseFloat(
      verifiedTransaction.data?.fiat_deposit?.amount || 
      verifiedTransaction.data?.fiat_amount || 
      '0'
    )

    console.log('[VERIFY_QUIDAX] Extracted amounts:', { cryptoAmount, fiatAmount })

    // Validate amounts
    if (fiatAmount <= 0 || cryptoAmount <= 0) {
      console.error('[VERIFY_QUIDAX] Invalid amounts from Quidax:', { fiatAmount, cryptoAmount })
      throw new Error('Invalid transaction amounts from Quidax')
    }

    // Calculate the actual rate from this transaction
    const actualRate = fiatAmount / cryptoAmount
    console.log(`[VERIFY_QUIDAX] Actual Quidax rate: ₦${actualRate.toFixed(2)} per USDT`)

    if (mode === 'buy') {
      // ===== ON-RAMP (BUY): User paid fiatAmount NGN, gets cryptoAmount USDT =====
      // CREDIT the user with fiatAmount as NC (what they actually paid)
      console.log(`[VERIFY_QUIDAX] ON-RAMP: Processing buy transaction`)

      if (!profile.celo_wallet_address) {
        throw new Error('User wallet address not found')
      }

      // Check if already processed
      const { data: existingTx } = await supabase
        .from('wallet_transactions')
        .select('id')
        .eq('reference', reference)
        .eq('status', 'completed')
        .single()

      if (existingTx) {
        console.log(`[VERIFY_QUIDAX] Transaction already processed: ${reference}`)
        return new Response(
          JSON.stringify({ success: true, message: 'Transaction already processed' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Connect to Celo
      const provider = new ethers.JsonRpcProvider("https://forno.celo.org")
      
      // USDT contract on Celo
      const usdtAddress = "0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e"
      const tokenContract = new ethers.Contract(
        usdtAddress,
        ["function balanceOf(address account) view returns (uint256)"],
        provider
      )

      // Wait for deposit to arrive (up to 60 seconds)
      console.log(`[VERIFY_QUIDAX] Waiting for USDT to arrive in wallet...`)
      let userBalance = BigInt(0)
      const expectedAmount = ethers.parseUnits(cryptoAmount.toFixed(6), 6)
      const tolerance = expectedAmount * BigInt(95) / BigInt(100) // 95% tolerance

      for (let attempt = 1; attempt <= 12; attempt++) {
        userBalance = await tokenContract.balanceOf(profile.celo_wallet_address)
        const balanceFormatted = ethers.formatUnits(userBalance, 6)
        console.log(`[VERIFY_QUIDAX] Attempt ${attempt}/12 - USDT balance: ${balanceFormatted}`)

        if (userBalance >= tolerance) {
          console.log(`[VERIFY_QUIDAX] ✅ USDT arrived in wallet!`)
          break
        }

        if (attempt < 12) {
          console.log(`[VERIFY_QUIDAX] Waiting 5 seconds...`)
          await new Promise(resolve => setTimeout(resolve, 5000))
        }
      }

      if (userBalance < tolerance) {
        console.log(`[VERIFY_QUIDAX] ⏳ USDT not yet arrived. Will be credited when detected.`)
        
        await supabase
          .from('quidax_transactions')
          .update({
            status: 'awaiting_crypto',
            quidax_data: { ...verifiedTransaction, awaiting_since: new Date().toISOString() }
          })
          .eq('reference', reference)

        return new Response(
          JSON.stringify({ 
            success: true, 
            message: 'Payment confirmed. USDT is being sent to your wallet. You will be credited automatically.',
            status: 'awaiting_crypto'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // CRITICAL FIX: Credit user with the FIAT AMOUNT they paid (as NC)
      // User paid ₦X, so they get X NC (1 NC = 1 NGN)
      const ncAmount = Math.round(fiatAmount)
      const actualCryptoReceived = parseFloat(ethers.formatUnits(userBalance, 6))

      console.log(`[VERIFY_QUIDAX] NC Calculation:`)
      console.log(`  - User paid: ₦${fiatAmount}`)
      console.log(`  - User receives: ${actualCryptoReceived} USDT`)
      console.log(`  - Rate: ₦${actualRate.toFixed(2)}/USDT`)
      console.log(`  - NC to credit: ${ncAmount} NC`)

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

      console.log(`[VERIFY_QUIDAX] ✅ Credited ${ncAmount} NC to user. New balance: ${newBalance}`)

      // Log wallet transaction with accurate info
      await supabase.from('wallet_transactions').insert({
        user_id: user.id,
        kind: 'quidax_deposit',
        amount: ncAmount,
        status: 'completed',
        reference: `Deposit ₦${fiatAmount.toLocaleString()} → ${actualCryptoReceived.toFixed(4)} USDT @ ₦${actualRate.toFixed(0)}/USDT | Ref: ${reference}`
      })

      // Update quidax_transactions
      await supabase
        .from('quidax_transactions')
        .update({
          status: 'completed',
          token_amount: actualCryptoReceived,
          fiat_amount: fiatAmount,
          quidax_data: { 
            ...verifiedTransaction, 
            credited_at: new Date().toISOString(), 
            nc_amount: ncAmount,
            exchange_rate: actualRate 
          }
        })
        .eq('reference', reference)

      // Send notifications
      await sendAllNotifications(supabase, {
        userId: user.id,
        type: 'deposit_completed',
        title: '💰 Deposit Successful',
        message: `Credited ${ncAmount.toLocaleString()} NC (${actualCryptoReceived.toFixed(4)} USDT @ ₦${actualRate.toFixed(0)}/USDT)`,
        amount: ncAmount,
        metadata: { reference, cryptoAmount: actualCryptoReceived, fiatAmount, exchangeRate: actualRate }
      })

      // ===== SWEEP FUNDS TO MASTER WALLET =====
      console.log(`[VERIFY_QUIDAX] Starting sweep to master wallet...`)
      
      try {
        if (!profile.encrypted_wallet) {
          console.log(`[VERIFY_QUIDAX] No encrypted wallet - skipping sweep`)
        } else {
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
            const userPrivateKey = CryptoJS.AES.decrypt(profile.encrypted_wallet, encryptionSecret).toString(CryptoJS.enc.Utf8)

            if (masterPrivateKey && userPrivateKey) {
              const masterWallet = new ethers.Wallet(masterPrivateKey, provider)
              const userWallet = new ethers.Wallet(userPrivateKey, provider)

              const gasAmount = ethers.parseEther("0.003")
              const masterCeloBalance = await provider.getBalance(masterAddress)

              if (masterCeloBalance >= gasAmount) {
                console.log(`[VERIFY_QUIDAX] Sending gas to user wallet...`)
                const gasTx = await masterWallet.sendTransaction({
                  to: profile.celo_wallet_address,
                  value: gasAmount
                })
                await gasTx.wait()
                console.log(`[VERIFY_QUIDAX] ✅ Gas sent`)

                await new Promise(resolve => setTimeout(resolve, 2000))

                const sweepContract = new ethers.Contract(
                  usdtAddress,
                  ["function transfer(address to, uint256 amount) returns (bool)"],
                  userWallet
                )

                const sweepBalance = await tokenContract.balanceOf(profile.celo_wallet_address)
                if (sweepBalance > BigInt(0)) {
                  console.log(`[VERIFY_QUIDAX] Sweeping ${ethers.formatUnits(sweepBalance, 6)} USDT...`)
                  const sweepTx = await sweepContract.transfer(masterAddress, sweepBalance)
                  await sweepTx.wait()
                  console.log(`[VERIFY_QUIDAX] ✅ USDT swept to master wallet`)
                }
              } else {
                console.log(`[VERIFY_QUIDAX] ⚠️ Insufficient CELO in master wallet for gas`)
              }
            }
          }
        }
      } catch (sweepError: any) {
        console.error(`[VERIFY_QUIDAX] Sweep failed:`, sweepError.message)
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
      // ===== OFF-RAMP (SELL): User sells cryptoAmount USDT, gets fiatAmount NGN =====
      console.log(`[VERIFY_QUIDAX] OFF-RAMP: Verifying sell completion`)
      
      // For sell, the fiatAmount is what Quidax will send to user's bank
      const ncAmount = Math.round(fiatAmount) // What user receives in NGN = their NC value

      console.log(`[VERIFY_QUIDAX] Sell calculation:`)
      console.log(`  - User sold: ${cryptoAmount} USDT`)
      console.log(`  - User receives: ₦${fiatAmount}`)
      console.log(`  - Rate: ₦${actualRate.toFixed(2)}/USDT`)

      // Update quidax_transactions to completed
      await supabase
        .from('quidax_transactions')
        .update({
          status: 'completed',
          fiat_amount: fiatAmount,
          token_amount: cryptoAmount,
          quidax_data: { 
            ...verifiedTransaction, 
            verified_at: new Date().toISOString(),
            exchange_rate: actualRate 
          }
        })
        .eq('reference', reference)

      // Update wallet transaction
      await supabase
        .from('wallet_transactions')
        .update({ 
          status: 'completed',
          reference: `Sold ${cryptoAmount} USDT → ₦${fiatAmount.toLocaleString()} @ ₦${actualRate.toFixed(0)}/USDT | Ref: ${reference}`
        })
        .eq('reference', reference)
        .eq('user_id', user.id)

      // Send notification
      await sendAllNotifications(supabase, {
        userId: user.id,
        type: 'withdrawal_completed',
        title: '✅ Withdrawal Successful',
        message: `₦${fiatAmount.toLocaleString()} has been sent to your bank account.`,
        amount: ncAmount,
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

  } catch (error) {
    console.error('[VERIFY_QUIDAX] Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
