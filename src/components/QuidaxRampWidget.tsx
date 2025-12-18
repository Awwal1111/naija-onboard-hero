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
import { SecurePinInput } from './SecurePinInput'
import { supabase } from '@/integrations/supabase/client'
import { toast } from 'sonner'

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
  const [amount, setAmount] = useState('')
  const [loading, setLoading] = useState(false)
  const [walletAddress, setWalletAddress] = useState<string>('')
  const [showPinInput, setShowPinInput] = useState(false)
  const [pendingAmount, setPendingAmount] = useState('')

  const handleContinue = () => {
    if (!user || !profile) {
      toast.error('Please log in first')
      return
    }

    if (!amount || parseFloat(amount) <= 0) {
      toast.error('Please enter a valid amount')
      return
    }

    const minAmount = mode === 'buy' ? 3000 : 2
    if (parseFloat(amount) < minAmount) {
      toast.error(`Minimum ${mode === 'buy' ? 'deposit' : 'withdrawal'} is ${mode === 'buy' ? '3,000 NC (₦3,000)' : '$2 USD (3,000 NC)'}`)
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
    if (pin !== (profile as any)?.transaction_pin) {
      toast.error('Incorrect PIN')
      return
    }

    setShowPinInput(false)
    handleInitializeWidget(pendingAmount)
  }

  const handleInitializeWidget = async (amountToProcess: string) => {
    setLoading(true)

    try {
      // Get wallet address from profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('celo_wallet_address')
        .eq('user_id', user.id)
        .single()

      if (profileError) throw profileError

      if (!profileData?.celo_wallet_address) {
        // Create wallet if not exists
        const { data: walletData, error: walletError } = await supabase.functions.invoke('create-user-wallet')
        if (walletError) throw walletError
        if (!walletData?.address) throw new Error('Failed to create wallet')
        setWalletAddress(walletData.address)
      } else {
        setWalletAddress(profileData.celo_wallet_address)
      }

      // Get public key from edge function
      const { data: keysData, error: keysError } = await supabase.functions.invoke('get-quidax-public-key')
      
      if (keysError) throw keysError
      if (!keysData?.publicKey) throw new Error('Failed to get public key')

      const reference = `ref_${Date.now()}_${user.id}`

      // Pre-create transaction record for tracking
      console.log(`[QUIDAX] Creating pending transaction: ${reference}`)
      await supabase.from('quidax_transactions').insert({
        user_id: user.id,
        reference: reference,
        transaction_type: mode === 'buy' ? 'on_ramp' : 'off_ramp',
        status: 'pending',
        fiat_amount: mode === 'buy' ? parseFloat(amount) : 0,
        token_amount: mode === 'sell' ? parseFloat(amount) / 1600 : null,
        token: 'USDT',
        fiat_currency: 'NGN',
        wallet_address: profileData?.celo_wallet_address || walletAddress,
        quidax_data: { initiated_at: new Date().toISOString() }
      })

      // Initialize Quidax Ramp Widget
      if (window.ramp) {
      const config: any = {
        public_key: keysData.publicKey,
        reference: reference, // CRITICAL: Pass reference to Quidax
        mode: mode,
        network: 'CELO',
        onClose: function(ref: string) {
          console.log('Quidax modal closed:', ref)
          // Prevent closing by reopening the widget
          toast.info('Please complete the transaction')
          return false
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
          config.address = profileData?.celo_wallet_address || walletAddress
          config.onReceiveWalletDetails = function(details: any) {
            console.log('Wallet details:', details)
          }
        } else {
          config.from_currency = 'usdt'
          config.to_currency = 'ngn'
          config.from_amount = amountToProcess
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
                  amount: amount,
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
      } else {
        toast.error('Quidax Ramp widget not loaded. Please refresh the page.')
        setLoading(false)
      }
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
                Amount in {mode === 'buy' ? 'NGN' : 'USDT'}
              </Label>
              <Input
                id="amount"
                type="number"
                placeholder={mode === 'buy' ? 'Enter amount (min 3,000 NC / ₦3,000)' : 'Enter amount (min $2 / 3,000 NC)'}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min={mode === 'buy' ? '3000' : '2'}
              />
              <p className="text-xs text-muted-foreground">
                {mode === 'buy' 
                  ? 'Minimum deposit: 3,000 NC (₦3,000)' 
                  : 'Minimum withdrawal: $2 USD (3,000 NC)'}
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
                    Your withdrawal will be processed securely through our banking partner.
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
                description={`Enter PIN to withdraw ${mode === 'sell' ? `$${amount}` : amount}`}
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