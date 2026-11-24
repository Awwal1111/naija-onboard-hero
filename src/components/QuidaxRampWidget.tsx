import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { BrandButton } from '@/components/ui/brand-button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ArrowDownUp, Info, ExternalLink } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useProfile } from '@/hooks/useProfile'
import { useUserSecrets } from '@/hooks/useUserSecrets'
import { SecurePinInput } from './SecurePinInput'
import { supabase } from '@/integrations/supabase/client'
import { toast } from 'sonner'

const NAIRA_PER_USDT_FALLBACK = 1600
const MIN_BUY_AMOUNT_NGN = 3000
const MIN_SELL_AMOUNT_NGN = 3200

interface QuidaxRampWidgetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: 'buy' | 'sell'
}

export const QuidaxRampWidget = ({ open, onOpenChange, mode }: QuidaxRampWidgetProps) => {
  const { user } = useAuth()
  const { profile } = useProfile()
  const { transactionPin } = useUserSecrets()
  const [amount, setAmount] = useState('')
  const [loading, setLoading] = useState(false)
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

    const minAmount = mode === 'buy' ? MIN_BUY_AMOUNT_NGN : MIN_SELL_AMOUNT_NGN
    if (parseFloat(amount) < minAmount) {
      toast.error(`Minimum ${mode === 'buy' ? 'deposit' : 'cash-out'} is ${mode === 'buy' ? '₦3,000' : '₦3,200'}`)
      return
    }

    if (mode === 'sell') {
      setPendingAmount(amount)
      setShowPinInput(true)
      return
    }

    handleInitializeRamp(amount)
  }

  const handlePinVerified = (pin: string) => {
    if (pin !== transactionPin) {
      toast.error('Incorrect PIN')
      return
    }
    setShowPinInput(false)
    handleInitializeRamp(pendingAmount)
  }

  const handleInitializeRamp = async (amountToProcess: string) => {
    setLoading(true)

    try {
      if (!user) throw new Error('Please log in first')

      // Get wallet address
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('celo_wallet_address')
        .eq('user_id', user.id)
        .single()

      if (profileError) throw profileError

      let walletAddress = profileData?.celo_wallet_address || ''

      if (!walletAddress) {
        const { data: walletData, error: walletError } = await supabase.functions.invoke('create-user-wallet')
        if (walletError) throw walletError
        if (!walletData?.address) throw new Error('Failed to create wallet')
        walletAddress = walletData.address
      }

      // Get Quidax public key for constructing the redirect URL
      const { data: keysData, error: keysError } = await supabase.functions.invoke('get-quidax-public-key')
      if (keysError) throw keysError
      if (!keysData?.publicKey) throw new Error('Failed to get public key')

      const reference = `ref_${Date.now()}_${user.id}`
      const fiatAmount = parseFloat(amountToProcess)
      const sellTokenAmount = Number((fiatAmount / NAIRA_PER_USDT_FALLBACK).toFixed(6))

      // Pre-create transaction record
      await supabase.from('quidax_transactions').insert({
        user_id: user.id,
        reference,
        transaction_type: mode === 'buy' ? 'on_ramp' : 'off_ramp',
        status: 'pending',
        fiat_amount: fiatAmount,
        token_amount: mode === 'sell' ? sellTokenAmount : null,
        token: 'USDT',
        fiat_currency: 'NGN',
        wallet_address: walletAddress,
        quidax_data: { initiated_at: new Date().toISOString() }
      })

      // Build Quidax redirect URL - opens in new tab to avoid ERR_BLOCKED_BY_RESPONSE
      const params = new URLSearchParams()
      params.set('public_key', keysData.publicKey)
      params.set('reference', reference)
      params.set('mode', mode)
      params.set('network', 'CELO')

      if (mode === 'buy') {
        params.set('from_currency', 'ngn')
        params.set('to_currency', 'usdt')
        params.set('from_amount', amountToProcess)
        params.set('address', walletAddress)
      } else {
        params.set('from_currency', 'usdt')
        params.set('to_currency', 'ngn')
        params.set('from_amount', sellTokenAmount.toFixed(6))
      }

      // Open Quidax in a new tab since they block iframe embedding
      const quidaxUrl = `https://ramp.quidax.io/?${params.toString()}`
      window.open(quidaxUrl, '_blank', 'noopener,noreferrer')

      toast.success(
        mode === 'buy'
          ? 'Quidax payment page opened! Complete your payment there.'
          : 'Quidax withdrawal page opened! Complete the process there.',
        { duration: 6000 }
      )

      onOpenChange(false)
    } catch (error: any) {
      console.error('Error initializing ramp:', error)
      toast.error(error.message || 'Failed to initialize payment')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowDownUp className="h-5 w-5" />
            {mode === 'buy' ? 'Naira deposit' : 'Quidax cash-out'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'buy'
              ? 'Pay through Quidax using a supported Naira payment method.'
              : 'Sell USDT through Quidax using its supported cash-out process.'}
          </DialogDescription>
        </DialogHeader>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Transaction Details</CardTitle>
            <CardDescription>
              Payment details
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Amount in NGN</Label>
              <Input
                id="amount"
                type="number"
                placeholder={mode === 'buy' ? 'Enter amount (min ₦3,000)' : 'Enter amount (min ₦3,200)'}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min={mode === 'buy' ? '3000' : '3200'}
              />
              <p className="text-xs text-muted-foreground">
                {mode === 'buy'
                  ? 'Minimum deposit: ₦3,000'
                  : 'Enter the Naira value you want to cash out. Quidax will show the final quote.'}
              </p>
            </div>

            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription className="text-xs">
                {mode === 'buy' ? (
                  <>
                    You'll be redirected to Quidax to complete your payment securely.
                    Your account will be credited upon confirmation.
                  </>
                ) : (
                  <>
                    You'll complete the USDT sale and any available cash-out directly with Quidax. Availability and timing are determined by Quidax.
                  </>
                )}
              </AlertDescription>
            </Alert>

            {showPinInput ? (
              <SecurePinInput
                onVerified={handlePinVerified}
                onCancel={() => setShowPinInput(false)}
                title="Confirm Withdrawal"
                description={`Enter PIN to withdraw ₦${Number(amount || 0).toLocaleString()}`}
              />
            ) : (
              <BrandButton
                onClick={handleContinue}
                disabled={loading || !amount || parseFloat(amount) <= 0}
                className="w-full"
              >
                {loading ? 'Processing...' : (
                  <span className="flex items-center gap-2">
                    <ExternalLink className="h-4 w-4" />
                    {mode === 'sell' ? 'Continue to PIN' : 'Open Quidax to Deposit'}
                  </span>
                )}
              </BrandButton>
            )}
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  )
}