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

  const handleInitializeWidget = async () => {
    if (!user || !profile) {
      toast.error('Please log in first')
      return
    }

    if (!amount || parseFloat(amount) <= 0) {
      toast.error('Please enter a valid amount')
      return
    }

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

      // Initialize Quidax Ramp Widget
      if (window.ramp) {
        const config: any = {
          public_key: keysData.publicKey,
          reference: reference,
          mode: mode,
          network: 'CELO',
          onClose: function(ref: string) {
            console.log('Quidax modal closed:', ref)
            setLoading(false)
            onOpenChange(false)
          },
          onSuccess: async function(transaction: any) {
            console.log('Transaction successful:', transaction)
            
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
                toast.success(`${mode === 'buy' ? 'Purchase' : 'Sale'} successful! Balance updated.`)
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
          config.from_amount = amount
          config.address = profileData?.celo_wallet_address || walletAddress
          config.onReceiveWalletDetails = function(details: any) {
            console.log('Wallet details:', details)
          }
        } else {
          config.from_currency = 'usdt'
          config.to_currency = 'ngn'
          config.from_amount = amount
          config.onReceiveWalletDetails = async function(details: any) {
            console.log('Receive wallet details for sell:', details)
            // Backend will handle sending USDT from master wallet to Quidax address
            try {
              await supabase.functions.invoke('process-quidax-sell', {
                body: {
                  reference: reference,
                  details: details,
                  amount: amount
                }
              })
            } catch (err) {
              console.error('Failed to process sell:', err)
              toast.error('Failed to initiate sell transaction')
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
            {mode === 'buy' ? 'Buy USDT' : 'Sell USDT'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'buy' 
              ? 'Purchase USDT on Celo network using Naira' 
              : 'Sell USDT and receive Naira to your bank account'}
          </DialogDescription>
        </DialogHeader>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Transaction Details</CardTitle>
            <CardDescription>
              Powered by Quidax Ramp - Secure & Fast
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
                placeholder={mode === 'buy' ? 'Enter amount in Naira' : 'Enter USDT amount'}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min={mode === 'buy' ? '1000' : '10'}
              />
              <p className="text-xs text-muted-foreground">
                {mode === 'buy' 
                  ? 'Minimum: ₦1,000' 
                  : 'Minimum: 10 USDT'}
              </p>
            </div>

            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription className="text-xs">
                {mode === 'buy' ? (
                  <>
                    You will receive USDT directly to your Celo wallet. 
                    The widget will guide you through the payment process.
                  </>
                ) : (
                  <>
                    USDT will be sent from our master wallet to Quidax.
                    You'll receive Naira in your bank account after confirmation.
                  </>
                )}
              </AlertDescription>
            </Alert>

            <BrandButton
              onClick={handleInitializeWidget}
              disabled={loading || !amount || parseFloat(amount) <= 0}
              className="w-full"
            >
              {loading ? 'Processing...' : `Continue to ${mode === 'buy' ? 'Buy' : 'Sell'}`}
            </BrandButton>
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  )
}