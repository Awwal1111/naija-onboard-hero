import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { ethers } from 'https://esm.sh/ethers@6.13.4'
import CryptoJS from "https://esm.sh/crypto-js@4.1.1"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Moola Market Mainnet Contract Addresses (Aave V2 fork on Celo)
const MOOLA_LENDING_POOL = "0xc1548F5AA1D76CDcAB7385FA6B5cEA70f941e535"
const USDT_ADDRESS = "0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e"
const CELO_RPC = "https://forno.celo.org"

// Aave V2 Lending Pool ABI (subset we need)
const LENDING_POOL_ABI = [
  "function deposit(address asset, uint256 amount, address onBehalfOf, uint16 referralCode) external",
  "function withdraw(address asset, uint256 amount, address to) external returns (uint256)",
  "function getUserAccountData(address user) external view returns (uint256 totalCollateralETH, uint256 totalDebtETH, uint256 availableBorrowsETH, uint256 currentLiquidationThreshold, uint256 ltv, uint256 healthFactor)",
  "function getReserveData(address asset) external view returns (uint256 configuration, uint128 liquidityIndex, uint128 variableBorrowIndex, uint128 currentLiquidityRate, uint128 currentVariableBorrowRate, uint128 currentStableBorrowRate, uint40 lastUpdateTimestamp, address aTokenAddress, address stableDebtTokenAddress, address variableDebtTokenAddress, address interestRateStrategyAddress, uint8 id)"
]

const ERC20_ABI = [
  "function approve(address spender, uint256 amount) returns (bool)",
  "function balanceOf(address account) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)"
]

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const encryptionSecret = Deno.env.get('WALLET_ENCRYPTION_SECRET') || 'default_secret'

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
    console.log(`[MOOLA_STAKING] Action: ${action}, User: ${user.id}, Amount: ${amount}`)

    const provider = new ethers.JsonRpcProvider(CELO_RPC)

    switch (action) {
      case 'get_apy': {
        // Get current APY from Moola Market
        try {
          const lendingPool = new ethers.Contract(MOOLA_LENDING_POOL, LENDING_POOL_ABI, provider)
          const reserveData = await lendingPool.getReserveData(USDT_ADDRESS)
          
          // currentLiquidityRate is in RAY (27 decimals), APY = rate / 1e27 * 100
          const liquidityRate = BigInt(reserveData[3])
          const apy = Number(liquidityRate) / 1e27 * 100
          
          console.log(`[MOOLA_STAKING] Current APY: ${apy.toFixed(2)}%`)
          
          return new Response(
            JSON.stringify({ success: true, apy: apy.toFixed(2) }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        } catch (e: any) {
          console.log(`[MOOLA_STAKING] Error fetching APY:`, e.message)
          // Return a reasonable fallback APY
          return new Response(
            JSON.stringify({ success: true, apy: '3.50' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
      }

      case 'get_balance': {
        // Get user's staked balance from database and on-chain
        const { data: position } = await supabase
          .from('usdt_staking_positions')
          .select('*')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .single()

        // Get user's wallet to check mToken balance
        const { data: profile } = await supabase
          .from('profiles')
          .select('celo_wallet_address, encrypted_wallet')
          .eq('user_id', user.id)
          .single()

        let onChainBalance = '0'
        if (profile?.celo_wallet_address) {
          try {
            // mUSDT address (mToken) - would need to query from reserve data
            // For now use database tracking
            onChainBalance = position?.amount_staked?.toString() || '0'
          } catch (e) {
            console.log(`[MOOLA_STAKING] Error fetching on-chain balance`)
          }
        }

        return new Response(
          JSON.stringify({
            success: true,
            position: position || { amount_staked: 0, amount_earned: 0, total_deposited: 0, total_withdrawn: 0 },
            onChainBalance
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'deposit': {
        if (!amount || amount <= 0) {
          throw new Error('Invalid deposit amount')
        }

        // Get user profile and master wallet
        const { data: profile } = await supabase
          .from('profiles')
          .select('wallet_balance, balance_withdrawable, celo_wallet_address, encrypted_wallet')
          .eq('user_id', user.id)
          .single()

        if (!profile) {
          throw new Error('Profile not found')
        }

        // Get exchange rate for NC to USDT conversion
        let usdToNgn = 1600
        try {
          const rateResponse = await fetch(
            "https://v6.exchangerate-api.com/v6/c06b378e6d590d4c22aa2998/latest/USD",
            { signal: AbortSignal.timeout(5000) }
          )
          if (rateResponse.ok) {
            const rateData = await rateResponse.json()
            if (rateData.conversion_rates?.NGN) {
              usdToNgn = rateData.conversion_rates.NGN
            }
          }
        } catch (e) {
          console.log(`[MOOLA_STAKING] Using fallback rate`)
        }

        // amount is in NC, convert to USDT
        const usdtAmount = amount / usdToNgn

        if (profile.balance_withdrawable < amount) {
          throw new Error(`Insufficient balance. Required: ${amount} NC, Available: ${profile.balance_withdrawable} NC`)
        }

        console.log(`[MOOLA_STAKING] Depositing ${amount} NC (${usdtAmount.toFixed(6)} USDT) to Moola`)

        // Get master wallet
        const { data: masterWalletData } = await supabase
          .from('system_settings')
          .select('value')
          .eq('key', 'master_wallet_encrypted')
          .single()

        if (!masterWalletData?.value) {
          throw new Error('Master wallet not configured')
        }

        const masterPrivateKey = CryptoJS.AES.decrypt(masterWalletData.value, encryptionSecret).toString(CryptoJS.enc.Utf8)
        if (!masterPrivateKey || masterPrivateKey.length < 64) {
          throw new Error('Master wallet decryption failed')
        }

        const masterWallet = new ethers.Wallet(masterPrivateKey, provider)
        console.log(`[MOOLA_STAKING] Using master wallet: ${masterWallet.address}`)

        // Check USDT balance in master wallet
        const usdtContract = new ethers.Contract(USDT_ADDRESS, ERC20_ABI, masterWallet)
        const masterBalance = await usdtContract.balanceOf(masterWallet.address)
        const usdtAmountWei = ethers.parseUnits(usdtAmount.toFixed(6), 6)

        if (masterBalance < usdtAmountWei) {
          throw new Error(`Insufficient USDT in master wallet. Available: ${ethers.formatUnits(masterBalance, 6)}, Required: ${usdtAmount.toFixed(6)}`)
        }

        // Approve USDT for Moola Lending Pool
        const currentAllowance = await usdtContract.allowance(masterWallet.address, MOOLA_LENDING_POOL)
        if (currentAllowance < usdtAmountWei) {
          console.log(`[MOOLA_STAKING] Approving USDT...`)
          const approveTx = await usdtContract.approve(MOOLA_LENDING_POOL, ethers.MaxUint256)
          await approveTx.wait()
          console.log(`[MOOLA_STAKING] Approval confirmed`)
        }

        // Deposit to Moola Market
        const lendingPool = new ethers.Contract(MOOLA_LENDING_POOL, LENDING_POOL_ABI, masterWallet)
        console.log(`[MOOLA_STAKING] Depositing to Moola...`)
        const depositTx = await lendingPool.deposit(
          USDT_ADDRESS,
          usdtAmountWei,
          masterWallet.address,
          0 // referral code
        )
        const receipt = await depositTx.wait()
        console.log(`[MOOLA_STAKING] ✅ Deposit confirmed: ${receipt.hash}`)

        // Deduct NC from user
        await supabase
          .from('profiles')
          .update({
            wallet_balance: profile.wallet_balance - amount,
            balance_withdrawable: profile.balance_withdrawable - amount
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
          await supabase
            .from('usdt_staking_positions')
            .update({
              amount_staked: existingPosition.amount_staked + usdtAmount,
              total_deposited: existingPosition.total_deposited + usdtAmount,
              updated_at: new Date().toISOString()
            })
            .eq('id', existingPosition.id)
        } else {
          await supabase
            .from('usdt_staking_positions')
            .insert({
              user_id: user.id,
              amount_staked: usdtAmount,
              total_deposited: usdtAmount,
              status: 'active'
            })
        }

        // Log transaction
        await supabase.from('staking_transactions').insert({
          user_id: user.id,
          transaction_type: 'deposit',
          amount: usdtAmount,
          tx_hash: receipt.hash,
          status: 'completed',
          completed_at: new Date().toISOString()
        })

        // Log wallet transaction
        await supabase.from('wallet_transactions').insert({
          user_id: user.id,
          kind: 'staking_deposit',
          amount: -amount,
          status: 'completed',
          reference: `Staked ${usdtAmount.toFixed(4)} USDT to Moola Market | TX: ${receipt.hash.slice(0, 10)}...`
        })

        // Notify user
        await supabase.from('notifications').insert({
          user_id: user.id,
          type: 'transaction',
          title: '📈 Staking Deposit Successful',
          message: `You have staked ${usdtAmount.toFixed(4)} USDT ($${amount.toLocaleString()} NC). You'll start earning interest immediately!`,
          metadata: { txHash: receipt.hash, amount: usdtAmount }
        })

        return new Response(
          JSON.stringify({
            success: true,
            txHash: receipt.hash,
            usdtAmount: usdtAmount.toFixed(6),
            ncDeducted: amount,
            message: `Successfully staked ${usdtAmount.toFixed(4)} USDT to Moola Market!`
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'withdraw': {
        if (!amount || amount <= 0) {
          throw new Error('Invalid withdraw amount')
        }

        // Get user's staking position
        const { data: position } = await supabase
          .from('usdt_staking_positions')
          .select('*')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .single()

        if (!position || position.amount_staked < amount) {
          throw new Error(`Insufficient staked balance. Staked: ${position?.amount_staked || 0} USDT, Requested: ${amount} USDT`)
        }

        // Get master wallet
        const { data: masterWalletData } = await supabase
          .from('system_settings')
          .select('value')
          .eq('key', 'master_wallet_encrypted')
          .single()

        if (!masterWalletData?.value) {
          throw new Error('Master wallet not configured')
        }

        const masterPrivateKey = CryptoJS.AES.decrypt(masterWalletData.value, encryptionSecret).toString(CryptoJS.enc.Utf8)
        const masterWallet = new ethers.Wallet(masterPrivateKey, provider)

        // Withdraw from Moola Market
        const lendingPool = new ethers.Contract(MOOLA_LENDING_POOL, LENDING_POOL_ABI, masterWallet)
        const withdrawAmountWei = ethers.parseUnits(amount.toFixed(6), 6)
        
        console.log(`[MOOLA_STAKING] Withdrawing ${amount} USDT from Moola...`)
        const withdrawTx = await lendingPool.withdraw(
          USDT_ADDRESS,
          withdrawAmountWei,
          masterWallet.address
        )
        const receipt = await withdrawTx.wait()
        console.log(`[MOOLA_STAKING] ✅ Withdrawal confirmed: ${receipt.hash}`)

        // Get exchange rate
        let usdToNgn = 1600
        try {
          const rateResponse = await fetch(
            "https://v6.exchangerate-api.com/v6/c06b378e6d590d4c22aa2998/latest/USD",
            { signal: AbortSignal.timeout(5000) }
          )
          if (rateResponse.ok) {
            const rateData = await rateResponse.json()
            if (rateData.conversion_rates?.NGN) {
              usdToNgn = rateData.conversion_rates.NGN
            }
          }
        } catch (e) {}

        const ncAmount = Math.round(amount * usdToNgn)

        // Credit NC to user
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
        await supabase
          .from('usdt_staking_positions')
          .update({
            amount_staked: position.amount_staked - amount,
            total_withdrawn: position.total_withdrawn + amount,
            updated_at: new Date().toISOString()
          })
          .eq('id', position.id)

        // Log transaction
        await supabase.from('staking_transactions').insert({
          user_id: user.id,
          position_id: position.id,
          transaction_type: 'withdraw',
          amount: amount,
          tx_hash: receipt.hash,
          status: 'completed',
          completed_at: new Date().toISOString()
        })

        // Log wallet transaction
        await supabase.from('wallet_transactions').insert({
          user_id: user.id,
          kind: 'staking_withdrawal',
          amount: ncAmount,
          status: 'completed',
          reference: `Unstaked ${amount.toFixed(4)} USDT from Moola Market | TX: ${receipt.hash.slice(0, 10)}...`
        })

        // Notify user
        await supabase.from('notifications').insert({
          user_id: user.id,
          type: 'transaction',
          title: '💰 Staking Withdrawal Complete',
          message: `You have withdrawn ${amount.toFixed(4)} USDT and received ${ncAmount.toLocaleString()} NC.`,
          metadata: { txHash: receipt.hash, amount }
        })

        return new Response(
          JSON.stringify({
            success: true,
            txHash: receipt.hash,
            usdtAmount: amount.toFixed(6),
            ncCredited: ncAmount,
            message: `Successfully withdrew ${amount.toFixed(4)} USDT! ${ncAmount.toLocaleString()} NC credited.`
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      default:
        throw new Error(`Unknown action: ${action}`)
    }

  } catch (error: any) {
    console.error('[MOOLA_STAKING] Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
