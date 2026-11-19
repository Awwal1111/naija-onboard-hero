import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { ethers } from 'https://esm.sh/ethers@6.13.4'
import CryptoJS from "https://esm.sh/crypto-js@4.1.1"
import { commitWithdrawal, refundWithdrawal, reserveWithdrawal } from "../_shared/withdrawal-security.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const CELO_RPC = "https://forno.celo.org"
const USDT_ADDRESS = "0x48065fbbe25f71c9282ddf5e1cd6d6a887483d5e" // USDT on Celo mainnet
const EXCHANGE_RATE_API = "https://v6.exchangerate-api.com/v6/c06b378e6d590d4c22aa2998/latest/USD"

const USDT_ABI = [
  "function transfer(address to, uint256 amount) returns (bool)",
  "function balanceOf(address account) view returns (uint256)"
]

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const encryptionSecret = Deno.env.get('WALLET_ENCRYPTION_SECRET') || 'default_secret_change_in_production'

    // Get master wallet from database (encrypted)
    const { data: masterWalletData, error: masterWalletError } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'master_wallet_encrypted')
      .single()

    if (masterWalletError || !masterWalletData?.value) {
      console.error('[QUIDAX SELL] Master wallet not found in database:', masterWalletError)
      throw new Error('Master wallet not initialized. Please contact admin.')
    }

    // Decrypt master wallet private key
    let masterWalletPrivateKey: string
    try {
      masterWalletPrivateKey = CryptoJS.AES.decrypt(masterWalletData.value, encryptionSecret).toString(CryptoJS.enc.Utf8)
      if (!masterWalletPrivateKey || masterWalletPrivateKey.length < 64) {
        throw new Error('Decryption failed - invalid key length')
      }
      console.log('[QUIDAX SELL] Master wallet decrypted successfully')
    } catch (decryptError) {
      console.error('[QUIDAX SELL] Failed to decrypt master wallet:', decryptError)
      throw new Error('Master wallet decryption failed. Please contact admin.')
    }

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

    const { reference, details, amount, transactionPin } = await req.json()

    console.log(`[QUIDAX SELL] Processing sell for user ${user.id}, ref: ${reference}`)
    console.log(`[QUIDAX SELL] Details:`, JSON.stringify({ amount, details }))

    // Get user profile to verify and deduct balance
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('wallet_balance, balance_withdrawable, celo_wallet_address')
      .eq('user_id', user.id)
      .single()

    // Get encrypted_wallet from user_secrets
    const { data: secrets } = await supabase
      .from('user_secrets')
      .select('encrypted_wallet')
      .eq('user_id', user.id)
      .single()
    
    const encryptedWallet = secrets?.encrypted_wallet || (profile as any)?.encrypted_wallet

    if (profileError) {
      throw new Error('Failed to fetch user profile')
    }

    const usdtAmount = Number(amount)
    if (!Number.isFinite(usdtAmount) || usdtAmount <= 0) {
      throw new Error('Invalid USDT amount')
    }
    
    // CRITICAL FIX: Get LIVE exchange rate instead of hardcoded 1600
    let usdToNgn = 1600 // Fallback only
    try {
      const rateResponse = await fetch(EXCHANGE_RATE_API, { signal: AbortSignal.timeout(5000) })
      if (rateResponse.ok) {
        const rateData = await rateResponse.json()
        if (rateData.conversion_rates?.NGN) {
          usdToNgn = rateData.conversion_rates.NGN
          console.log(`[QUIDAX SELL] Live exchange rate: $1 = ₦${usdToNgn}`)
        }
      }
    } catch (e) {
      console.log(`[QUIDAX SELL] Using fallback exchange rate: ${usdToNgn}`)
    }

    // Derive the debit from the server-validated token amount and live rate.
    const ncAmount = Math.floor(usdtAmount * usdToNgn)
    if (!Number.isSafeInteger(ncAmount) || ncAmount <= 0) {
      throw new Error('Invalid withdrawal amount')
    }
    if (ncAmount < 3200) {
      throw new Error('Minimum Quidax withdrawal is NC 3200')
    }
    
    console.log(`[QUIDAX SELL] NC Calculation: ${usdtAmount} USDT × ${usdToNgn} = ${ncAmount} NC`)

    console.log(`[QUIDAX SELL] Processing ${ncAmount} NC withdrawal for user ${user.id}`)

    // Get Quidax deposit address from details (check multiple possible keys)
    const quidaxDepositAddress = details?.deposit_address || details?.walletAddress || details?.wallet_address || details?.address || details?.depositAddress
    
    console.log(`[QUIDAX SELL] Received details:`, JSON.stringify(details))
    console.log(`[QUIDAX SELL] Extracted deposit address: ${quidaxDepositAddress}`)

    if (!quidaxDepositAddress) {
      console.error('[QUIDAX SELL] No deposit address found in details:', details)
      throw new Error('Quidax deposit address not provided. Please try again.')
    }
    if (!ethers.isAddress(quidaxDepositAddress)) {
      throw new Error('Invalid Quidax deposit address')
    }

    // DUAL WALLET SYSTEM: Try user wallet first, then master wallet
    const provider = new ethers.JsonRpcProvider(CELO_RPC)
    
    let senderWallet: any
    let walletSource = 'master'
    
    // Check if user has their own wallet with USDT
    if (profile.celo_wallet_address && encryptedWallet) {
      try {
        const decryptedUserKey = CryptoJS.AES.decrypt(encryptedWallet, encryptionSecret).toString(CryptoJS.enc.Utf8)
        if (decryptedUserKey) {
          const userWallet = new ethers.Wallet(decryptedUserKey, provider)
          const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, userWallet)
          const userBalance = await usdtContract.balanceOf(userWallet.address)
          const requiredAmount = ethers.parseUnits(usdtAmount.toString(), 6)
          
          if (userBalance >= requiredAmount) {
            senderWallet = userWallet
            walletSource = 'user'
            console.log(`[QUIDAX SELL] Using USER wallet: ${userWallet.address}`)
          }
        }
      } catch (err) {
        console.log(`[QUIDAX SELL] User wallet check failed, using master wallet`)
      }
    }
    
    // Use master wallet if user wallet not available or insufficient
    if (walletSource === 'master') {
      senderWallet = new ethers.Wallet(masterWalletPrivateKey, provider)
      console.log(`[QUIDAX SELL] Using MASTER wallet: ${senderWallet.address}`)
    }
    
    const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, senderWallet)

    // Check sender wallet USDT balance
    const senderBalance = await usdtContract.balanceOf(senderWallet.address)
    const usdtAmountWei = ethers.parseUnits(usdtAmount.toString(), 6) // USDT has 6 decimals

    console.log(`[QUIDAX SELL] ${walletSource} wallet USDT balance: ${ethers.formatUnits(senderBalance, 6)}`)
    console.log(`[QUIDAX SELL] Sending ${usdtAmount} USDT to ${quidaxDepositAddress}`)

    if (senderBalance < usdtAmountWei) {
      throw new Error('Insufficient USDT in sender wallet. Please try a smaller amount or wait for wallet to be funded.')
    }

    // Send USDT
    const withdrawalReference = crypto.randomUUID()
    await reserveWithdrawal(supabase, user.id, ncAmount, transactionPin, withdrawalReference)
    let tx
    try {
      tx = await usdtContract.transfer(quidaxDepositAddress, usdtAmountWei)
      console.log(`[QUIDAX SELL] Transaction sent: ${tx.hash}`)
    } catch (transferError) {
      await refundWithdrawal(supabase, withdrawalReference)
      throw transferError
    }

    const receipt = await tx.wait()
    await commitWithdrawal(supabase, withdrawalReference)
    console.log(`[QUIDAX SELL] Transaction confirmed: ${receipt.hash}`)

    console.log(`[QUIDAX SELL] Deducted ${ncAmount} NC from user ${user.id} after successful transfer`)

    // Log transaction with wallet source and rate info
    await supabase
      .from('wallet_transactions')
      .insert({
        user_id: user.id,
        amount: -ncAmount,
        kind: 'quidax_sell_pending',
        reference: `${withdrawalReference}: Sell ${usdtAmount} USDT via Quidax Ramp @ ₦${usdToNgn}/USDT (${walletSource} wallet)`,
        status: 'pending'
      })

    return new Response(
      JSON.stringify({ 
        success: true,
        txHash: receipt.hash,
        ncDeducted: ncAmount,
        usdtSent: usdtAmount,
        exchangeRate: usdToNgn,
        message: 'USDT sent to Quidax. Waiting for confirmation.'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )
  } catch (error) {
    console.error('Error in process-quidax-sell:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})
