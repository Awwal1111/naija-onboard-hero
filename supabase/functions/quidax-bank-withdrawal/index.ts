import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { ethers } from "https://esm.sh/ethers@6.7.0"
import CryptoJS from "https://esm.sh/crypto-js@4.1.1"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Environment variables
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const MASTER_WALLET_PRIVATE_KEY = Deno.env.get('MASTER_WALLET_PRIVATE_KEY')
const QUIDAX_PRIVATE_KEY = Deno.env.get('QUIDAX_PRIVATE_KEY')
const CELO_RPC = 'https://forno.celo.org'
const USDT_ADDRESS = '0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    // Get authenticated user
    const authHeader = req.headers.get('authorization')
    if (!authHeader) throw new Error('Missing authorization header')

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) throw new Error('Unauthorized')

    const { ncAmount, usdtAmount } = await req.json()

    console.log(`[QUIDAX WITHDRAWAL] User ${user.id} withdrawing ${ncAmount} NC (${usdtAmount} USDT)`)

    // 1. Get user's profile and wallet
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('balance_withdrawable, wallet_balance, celo_wallet_address, bank_name, bank_account_number, bank_account_name')
      .eq('user_id', user.id)
      .single()

    if (profileError || !profile) throw new Error('Failed to fetch user profile')

    // Validate balance
    if (profile.balance_withdrawable < ncAmount) {
      throw new Error('Insufficient withdrawable balance')
    }

    // Validate bank details
    if (!profile.bank_name || !profile.bank_account_number) {
      throw new Error('Please add your bank details in Settings first')
    }

    // Validate user has wallet
    if (!profile.celo_wallet_address) {
      throw new Error('Wallet not initialized. Please visit the Wallet page.')
    }

    // 2. Get user's encrypted wallet from localStorage equivalent (stored in profile or separate table)
    // For security, we'll need the user to provide their wallet somehow
    // Since we can't access localStorage from backend, user must have their wallet synced
    // Alternative: Store encrypted wallet in database

    // 3. Connect to blockchain
    const provider = new ethers.JsonRpcProvider(CELO_RPC)
    const usdtContract = new ethers.Contract(
      USDT_ADDRESS,
      ['function balanceOf(address) view returns (uint256)', 'function transfer(address, uint256) returns (bool)'],
      provider
    )

    // Check user's USDT balance on chain
    const userBalance = await usdtContract.balanceOf(profile.celo_wallet_address)
    const userBalanceFormatted = parseFloat(ethers.formatUnits(userBalance, 6))

    console.log(`[QUIDAX WITHDRAWAL] User on-chain USDT balance: ${userBalanceFormatted}`)

    if (userBalanceFormatted < usdtAmount) {
      throw new Error(`Insufficient USDT in wallet. You have ${userBalanceFormatted.toFixed(2)} USDT`)
    }

    // 4. Request Quidax deposit address for off-ramp
    const quidaxDepositResponse = await fetch('https://www.quidax.com/api/v1/off-ramp/deposit-address', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${QUIDAX_PRIVATE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        currency: 'USDT',
        network: 'CELO'
      })
    })

    if (!quidaxDepositResponse.ok) {
      console.error('[QUIDAX] Failed to get deposit address:', await quidaxDepositResponse.text())
      throw new Error('Failed to get Quidax deposit address')
    }

    const quidaxDepositData = await quidaxDepositResponse.json()
    const quidaxAddress = quidaxDepositData.data?.address

    if (!quidaxAddress) throw new Error('No deposit address received from Quidax')

    console.log(`[QUIDAX WITHDRAWAL] Quidax deposit address: ${quidaxAddress}`)

    // 5. Since we can't access user's private key here, we need to:
    // Option A: Have user send USDT themselves (not ideal)
    // Option B: Use a relayer system where master wallet sends gas + user approves
    // Option C: Store encrypted wallet in database (security risk)
    
    // For now, let's use the master wallet to facilitate this
    // The user's USDT should already be swept to master wallet from deposits

    if (!MASTER_WALLET_PRIVATE_KEY) {
      throw new Error('Master wallet not configured')
    }

    const masterWallet = new ethers.Wallet(MASTER_WALLET_PRIVATE_KEY, provider)
    const masterUsdtContract = usdtContract.connect(masterWallet)

    // Check master wallet balance
    const masterBalance = await usdtContract.balanceOf(masterWallet.address)
    const masterBalanceFormatted = parseFloat(ethers.formatUnits(masterBalance, 6))

    console.log(`[QUIDAX WITHDRAWAL] Master wallet USDT balance: ${masterBalanceFormatted}`)

    if (masterBalanceFormatted < usdtAmount) {
      throw new Error('Insufficient USDT in master wallet. Please contact support.')
    }

    // 6. Send USDT from master wallet to Quidax
    const usdtWei = ethers.parseUnits(usdtAmount.toString(), 6)
    console.log(`[QUIDAX WITHDRAWAL] Sending ${usdtAmount} USDT to Quidax...`)

    const tx = await masterUsdtContract.transfer(quidaxAddress, usdtWei)
    const receipt = await tx.wait()

    console.log(`[QUIDAX WITHDRAWAL] USDT sent to Quidax. TX: ${receipt.hash}`)

    // 7. Initiate Quidax off-ramp to bank
    const offRampResponse = await fetch('https://www.quidax.com/api/v1/off-ramp/initiate', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${QUIDAX_PRIVATE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: usdtAmount,
        currency: 'USDT',
        network: 'CELO',
        fiat_currency: 'NGN',
        bank_code: profile.bank_name, // Assuming bank_name stores the bank code
        account_number: profile.bank_account_number,
        account_name: profile.bank_account_name,
        tx_hash: receipt.hash
      })
    })

    if (!offRampResponse.ok) {
      console.error('[QUIDAX] Off-ramp initiation failed:', await offRampResponse.text())
      throw new Error('Failed to initiate bank withdrawal with Quidax')
    }

    const offRampData = await offRampResponse.json()
    const reference = offRampData.data?.reference

    console.log(`[QUIDAX WITHDRAWAL] Off-ramp initiated. Reference: ${reference}`)

    // 8. Deduct NC from user's balance
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        wallet_balance: profile.wallet_balance - ncAmount,
        balance_withdrawable: profile.balance_withdrawable - ncAmount
      })
      .eq('user_id', user.id)

    if (updateError) throw new Error('Failed to update balance')

    // 9. Log transaction
    await supabase
      .from('wallet_transactions')
      .insert({
        user_id: user.id,
        amount: -ncAmount,
        kind: 'quidax_withdrawal',
        status: 'pending',
        reference: `Quidax withdrawal: ${reference}`,
        description: `Withdrew ${usdtAmount} USDT to bank via Quidax`
      })

    // 10. Store Quidax transaction
    await supabase
      .from('quidax_transactions')
      .insert({
        user_id: user.id,
        reference: reference,
        transaction_type: 'sell',
        status: 'pending',
        amount_crypto: usdtAmount,
        crypto_currency: 'USDT',
        tx_hash: receipt.hash,
        raw_response: offRampData
      })

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Withdrawal initiated successfully',
        reference: reference,
        usdtAmount: usdtAmount,
        txHash: receipt.hash
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error: any) {
    console.error('[QUIDAX WITHDRAWAL] Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
