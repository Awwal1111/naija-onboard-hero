import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { BrandButton } from '@/components/ui/brand-button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ArrowDownUp, Info } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useProfile } from '@/hooks/useProfile'
import { useUserSecrets } from '@/hooks/useUserSecrets'
import { SecurePinInput } from './SecurePinInput'
import { supabase } from '@/integrations/supabase/client'
import { toast } from 'sonner'

const QUIDAX_RAMP_SCRIPT_URL = 'https://d309lcjd52k0i0.cloudfront.net/ramp.js'
const NAIRA_PER_USDT_FALLBACK = 1600
const MIN_BUY_AMOUNT_NGN = 3000
const MIN_SELL_AMOUNT_NGN = 3200

let rampScriptPromise: Promise<void> | null = null

interface QuidaxRampWidgetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: 'buy' | 'sell'
}

declare global {
  interface Window {
    ramp?: {
      initialize: (config: any) => void
    }
  }
}

export const QuidaxRampWidget = ({ open, onOpenChange, mode }: QuidaxRampWidgetProps) => {
  const { user } = useAuth()
  const { profile } = useProfile()
  const { transactionPin } = useUserSecrets()
  const [amount, setAmount] = useState('')
  const [loading, setLoading] = useState(false)
  const [walletAddress, setWalletAddress] = useState<string>('')
  const [showPinInput, setShowPinInput] = useState(false)
  const [pendingAmount, setPendingAmount] = useState('')

  const ensureRampLoaded = async () => {
    if (window.ramp) return

    if (!rampScriptPromise) {
      rampScriptPromise = new Promise((resolve, reject) => {
        const existingScript = document.querySelector<HTMLScriptElement>(`script[src="${QUIDAX_RAMP_SCRIPT_URL}"]`)

        const handleLoad = () => resolve()
        const handleError = () => {
          rampScriptPromise = null
          reject(new Error('Failed to load Quidax widget'))
        }

        if (existingScript) {
          existingScript.addEventListener('load', handleLoad, { once: true })
          existingScript.addEventListener('error', handleError, { once: true })
          return
        }

        const script = document.createElement('script')
        script.src = QUIDAX_RAMP_SCRIPT_URL
        script.async = true
        script.dataset.quidaxRamp = 'true'
        script.addEventListener('load', handleLoad, { once: true })
        script.addEventListener('error', handleError, { once: true })
        document.body.appendChild(script)
      })
    }

    await rampScriptPromise

    if (!window.ramp) {
      rampScriptPromise = null
      throw new Error('Quidax widget is unavailable right now')
    }
  }

  const handleContinue = () => {
    if (!user || !profile) {
      toast.error('Please log in first')
      return
    }

    if (!amount || parseFloat(amount) <= 0) {
      toast.error('Please enter a valid amount')
      return
    }

    const minAmount = mode === 'buy' ? MIN_BUY_AMOUNT_NGN : MIN_SELL_AMOUNT_NGN
    if (parseFloat(amount) < minAmount) {
      toast.error(`Minimum ${mode === 'buy' ? 'deposit' : 'withdrawal'} is ${mode === 'buy' ? '₦3,000 NC' : '₦3,200 NC (~$2)'}`)
      return
    }

    // For sell (withdrawal), require PIN
    if (mode === 'sell') {
      setPendingAmount(amount)
      setShowPinInput(true)
      return
    }

    // For buy (deposit), no PIN needed
    handleInitializeWidget(amount)
  }

  const handlePinVerified = (pin: string) => {
    // Verify PIN
    if (pin !== transactionPin) {
      toast.error('Incorrect PIN')
      return
    }

    setShowPinInput(false)
    handleInitializeWidget(pendingAmount)
  }

  const handleInitializeWidget = async (amountToProcess: string) => {
    setLoading(true)

    try {
      if (!user) {
        throw new Error('Please log in first')
      }

      await ensureRampLoaded()

      // Get wallet address from profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('celo_wallet_address')
        .eq('user_id', user.id)
        .single()

      if (profileError) throw profileError

      let resolvedWalletAddress = profileData?.celo_wallet_address || ''

      if (!resolvedWalletAddress) {
        // Create wallet if not exists
        const { data: walletData, error: walletError } = await supabase.functions.invoke('create-user-wallet')
        if (walletError) throw walletError
        if (!walletData?.address) throw new Error('Failed to create wallet')
        resolvedWalletAddress = walletData.address
      }

      setWalletAddress(resolvedWalletAddress)

      // Get public key from edge function
      const { data: keysData, error: keysError } = await supabase.functions.invoke('get-quidax-public-key')
      
      if (keysError) throw keysError
      if (!keysData?.publicKey) throw new Error('Failed to get public key')

      const reference = `ref_${Date.now()}_${user.id}`
      const fiatAmount = parseFloat(amountToProcess)
      const sellTokenAmount = Number((fiatAmount / NAIRA_PER_USDT_FALLBACK).toFixed(6))

      // Pre-create transaction record for tracking
      console.log(`[QUIDAX] Creating pending transaction: ${reference}`)
      await supabase.from('quidax_transactions').insert({
        user_id: user.id,
        reference: reference,
        transaction_type: mode === 'buy' ? 'on_ramp' : 'off_ramp',
        status: 'pending',
        fiat_amount: fiatAmount,
        token_amount: mode === 'sell' ? sellTokenAmount : null,
        token: 'USDT',
        fiat_currency: 'NGN',
        wallet_address: resolvedWalletAddress,
        quidax_data: { initiated_at: new Date().toISOString() }
      })

      // Initialize Quidax Ramp Widget
      onOpenChange(false)

      const config: any = {
        public_key: keysData.publicKey,
        reference: reference, // CRITICAL: Pass reference to Quidax
        mode: mode,
        network: 'CELO',
        onClose: function(ref: string) {
          console.log('Quidax modal closed:', ref)
          setLoading(false)
        },
          onSuccess: async function(transaction: any) {
            console.log('[QUIDAX] Transaction successful:', transaction)
            
            // Send transaction details to backend for verification
            try {
              const { data, error } = await supabase.functions.invoke('verify-quidax-ramp-transaction', {
                body: {
                  reference: reference,
                  transaction: transaction,
                  mode: mode
                }
              })

              if (error) throw error

              if (data?.success) {
                if (mode === 'buy') {
                  // For buy: Crypto is being sent to user wallet, NC will be credited when it arrives
                  toast.success('Payment confirmed! Your NC will be credited automatically when crypto arrives.', {
                    duration: 5000,
                    description: 'This usually takes 1-3 minutes'
                  })
                } else {
                  // For sell: Transaction is complete
                  toast.success('Withdrawal successful! Funds sent to your bank.')
                }
              } else {
                toast.error('Transaction verification failed. Please contact support.')
              }
            } catch (err: any) {
              console.error('Verification error:', err)
              toast.error('Failed to verify transaction. Please contact support.')
            }

            setLoading(false)
            onOpenChange(false)
          }
        }

        if (mode === 'buy') {
          config.from_currency = 'ngn'
          config.to_currency = 'usdt'
          config.from_amount = amountToProcess
          config.address = resolvedWalletAddress
          config.onReceiveWalletDetails = function(details: any) {
            console.log('Wallet details:', details)
          }
        } else {
          config.from_currency = 'usdt'
          config.to_currency = 'ngn'
          config.from_amount = sellTokenAmount.toFixed(6)
          config.onReceiveWalletDetails = async function(details: any) {
            console.log('[QUIDAX SELL] onReceiveWalletDetails called')
            console.log('[QUIDAX SELL] Received details:', JSON.stringify(details))
            
            // Extract deposit address from various possible keys
            const depositAddress = details?.walletAddress || details?.wallet_address || details?.address || details?.depositAddress || details?.deposit_address
            
            if (!depositAddress) {
              console.error('[QUIDAX SELL] No deposit address found in wallet details:', details)
              toast.error('Failed to get deposit address from Quidax. Please try again.')
              setLoading(false)
              return
            }
            
            console.log('[QUIDAX SELL] Extracted deposit address:', depositAddress)
            
            // Backend will handle sending USDT to Quidax deposit address
            try {
              console.log('[QUIDAX SELL] Getting session...')
              const { data: { session }, error: sessionError } = await supabase.auth.getSession()
              
              if (sessionError || !session) {
                console.error('[QUIDAX SELL] Session error:', sessionError)
                toast.error('Session expired. Please log in again.')
                setLoading(false)
                return
              }
              
              console.log('[QUIDAX SELL] Calling process-quidax-sell with:', { reference, amount, deposit_address: depositAddress })
              
              const { data, error } = await supabase.functions.invoke('process-quidax-sell', {
                body: {
                  reference: reference,
                  amount: sellTokenAmount.toFixed(6),
                  ncAmount: fiatAmount,
                  details: {
                    deposit_address: depositAddress,
                    ...details
                  }
                },
                headers: {
                  Authorization: `Bearer ${session.access_token}`
                }
              })
              
              console.log('[QUIDAX SELL] Response:', { data, error })
              
              if (error) {
                console.error('[QUIDAX SELL] Edge function error:', error)
                throw error
              }
              
              if (data?.success) {
                toast.success('USDT sent to Quidax successfully')
              } else if (data?.error) {
                throw new Error(data.error)
              }
            } catch (err: any) {
              console.error('[QUIDAX SELL] Failed to process sell:', err)
              toast.error(err.message || 'Failed to initiate sell transaction')
              setLoading(false)
            }
          }
        }

        window.ramp.initialize(config)
    } catch (error: any) {
      console.error('Error initializing widget:', error)
      toast.error(error.message || 'Failed to initialize widget')
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowDownUp className="h-5 w-5" />
            {mode === 'buy' ? 'Bank Deposit' : 'Bank Withdrawal'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'buy' 
              ? 'Fund your account with Naira - Instant & Secure' 
              : 'Withdraw to your bank account - Fast & Reliable'}
          </DialogDescription>
        </DialogHeader>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Transaction Details</CardTitle>
            <CardDescription>
              Secure Banking Transaction - Protected & Instant
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="amount">
                Amount in NGN
              </Label>
              <Input
                id="amount"
                type="number"
                placeholder={mode === 'buy' ? 'Enter amount (min ₦3,000 NC)' : 'Enter amount (min ₦3,200 NC)'}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min={mode === 'buy' ? '3000' : '3200'}
              />
              <p className="text-xs text-muted-foreground">
                {mode === 'buy' 
                  ? 'Minimum deposit: ₦3,000 NC' 
                  : 'Enter your amount in Naira and we will convert it to the required USDT automatically.'}
              </p>
            </div>

            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription className="text-xs">
                {mode === 'buy' ? (
                  <>
                    Complete your payment through our secure banking partner. 
                    Your account will be credited instantly upon confirmation.
                  </>
                ) : (
                  <>
                    Your withdrawal amount stays in Naira while the app handles the USDT conversion for Quidax.
                    Funds will arrive in your bank account within minutes.
                  </>
                )}
              </AlertDescription>
            </Alert>

            {showPinInput ? (
              <SecurePinInput
                onVerified={handlePinVerified}
                onCancel={() => setShowPinInput(false)}
                title="Confirm Withdrawal"
                description={`Enter PIN to withdraw ${mode === 'sell' ? `₦${Number(amount || 0).toLocaleString()}` : `₦${Number(amount || 0).toLocaleString()}`}`}
              />
            ) : (
              <BrandButton
                onClick={handleContinue}
                disabled={loading || !amount || parseFloat(amount) <= 0}
                className="w-full"
              >
                {loading ? 'Processing...' : mode === 'sell' ? 'Continue to PIN' : `Proceed to Deposit`}
              </BrandButton>
            )}
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  )
}