import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { ethers } from 'https://esm.sh/ethers@6.13.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const CELO_RPC = "https://forno.celo.org"
const USDT_ADDRESS = "0x48065fbbe25f71c9282ddf5e1cd6d6a887483d5e" // USDT on Celo mainnet

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
    const masterWalletPrivateKey = Deno.env.get('CELO_MASTER_WALLET_PRIVATE_KEY')
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

    const { reference, details, amount } = await req.json()

    console.log(`[QUIDAX SELL] Processing sell for user ${user.id}, ref: ${reference}`)

    // Get user profile to verify and deduct balance
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('wallet_balance, balance_withdrawable')
      .eq('user_id', user.id)
      .single()

    if (profileError) {
      throw new Error('Failed to fetch user profile')
    }

    const usdtAmount = parseFloat(amount)
    const ncAmount = Math.floor(usdtAmount * 1600) // Convert USDT to NC

    if (profile.balance_withdrawable < ncAmount) {
      throw new Error('Insufficient balance')
    }

    // Deduct balance from user
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        wallet_balance: profile.wallet_balance - ncAmount,
        balance_withdrawable: profile.balance_withdrawable - ncAmount
      })
      .eq('user_id', user.id)

    if (updateError) {
      throw new Error('Failed to deduct balance')
    }

    console.log(`[QUIDAX SELL] Deducted ${ncAmount} NC from user ${user.id}`)

    // Get Quidax deposit address from details
    const quidaxDepositAddress = details.address || details.wallet_address

    if (!quidaxDepositAddress) {
      throw new Error('Quidax deposit address not provided')
    }

    // Send USDT from master wallet to Quidax
    const provider = new ethers.JsonRpcProvider(CELO_RPC)
    const masterWallet = new ethers.Wallet(masterWalletPrivateKey!, provider)
    const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, masterWallet)

    // Check master wallet USDT balance
    const masterBalance = await usdtContract.balanceOf(masterWallet.address)
    const usdtAmountWei = ethers.parseUnits(usdtAmount.toString(), 6) // USDT has 6 decimals

    console.log(`[QUIDAX SELL] Master wallet USDT balance: ${ethers.formatUnits(masterBalance, 6)}`)
    console.log(`[QUIDAX SELL] Sending ${usdtAmount} USDT to ${quidaxDepositAddress}`)

    if (masterBalance < usdtAmountWei) {
      // Refund user
      await supabase
        .from('profiles')
        .update({
          wallet_balance: profile.wallet_balance,
          balance_withdrawable: profile.balance_withdrawable
        })
        .eq('user_id', user.id)

      throw new Error('Insufficient USDT in master wallet')
    }

    // Send USDT
    const tx = await usdtContract.transfer(quidaxDepositAddress, usdtAmountWei)
    console.log(`[QUIDAX SELL] Transaction sent: ${tx.hash}`)

    const receipt = await tx.wait()
    console.log(`[QUIDAX SELL] Transaction confirmed: ${receipt.hash}`)

    // Log transaction
    await supabase
      .from('wallet_transactions')
      .insert({
        user_id: user.id,
        amount: -ncAmount,
        type: 'quidax_sell_pending',
        description: `Sell ${usdtAmount} USDT via Quidax Ramp (pending confirmation)`,
        status: 'pending',
        reference: reference,
        tx_hash: receipt.hash
      })

    return new Response(
      JSON.stringify({ 
        success: true,
        txHash: receipt.hash,
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