import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { BrandButton } from '@/components/ui/brand-button'
import { BrandInput } from '@/components/ui/brand-input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Globe, Info, Loader2, ExternalLink } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { toast } from 'sonner'

interface IvoryPayDepositCardProps {
  onPending?: () => void
}

export const IvoryPayDepositCard = ({ onPending }: IvoryPayDepositCardProps) => {
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState('NGN')
  const [isLoading, setIsLoading] = useState(false)

  const currencySymbols: Record<string, string> = {
    NGN: '₦',
    USD: '$',
    GHS: 'GH₵',
    KES: 'KSh',
    ZAR: 'R',
  }

  const handleDeposit = async () => {
    const numAmount = parseFloat(amount)
    if (!numAmount || numAmount <= 0) {
      toast.error('Please enter a valid amount')
      return
    }

    setIsLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      const response = await supabase.functions.invoke('ivorypay-deposit', {
        body: {
          action: 'initiate',
          amount: numAmount,
          currency,
        },
        headers: {
          Authorization: `Bearer ${session?.access_token}`
        }
      })

      if (response.error) throw new Error(response.error.message)
      
      const data = response.data
      if (!data?.success || !data?.checkoutUrl) {
        throw new Error(data?.error || 'Failed to create payment')
      }

      // Store reference for verification on return
      localStorage.setItem('ivorypay_pending_ref', data.reference)
      
      // Open IvoryPay checkout in new tab
      window.open(data.checkoutUrl, '_blank')
      toast.success('IvoryPay checkout opened! Complete payment in the new tab.')

      onPending?.()
    } catch (error: any) {
      console.error('IvoryPay deposit error:', error)
      toast.error(error.message || 'Failed to initiate deposit')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="h-5 w-5 text-amber-600" />
          IvoryPay Deposit
        </CardTitle>
        <CardDescription>
          Pay via bank transfer or crypto through IvoryPay's secure checkout
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert className="bg-amber-500/10 border-amber-500/30">
          <Info className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-xs">
            <p className="font-medium mb-1">Supported countries:</p>
            <p>Nigeria (NGN), Ghana (GHS), Kenya (KES), South Africa (ZAR), and USD</p>
          </AlertDescription>
        </Alert>

        <div className="space-y-2">
          <Label>Currency</Label>
          <Select value={currency} onValueChange={setCurrency}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="NGN">🇳🇬 Nigerian Naira (NGN)</SelectItem>
              <SelectItem value="USD">🇺🇸 US Dollar (USD)</SelectItem>
              <SelectItem value="GHS">🇬🇭 Ghanaian Cedi (GHS)</SelectItem>
              <SelectItem value="KES">🇰🇪 Kenyan Shilling (KES)</SelectItem>
              <SelectItem value="ZAR">🇿🇦 South African Rand (ZAR)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Amount ({currencySymbols[currency] || currency})</Label>
          <BrandInput
            type="number"
            placeholder={`Enter amount in ${currency}`}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            min="1"
          />
        </div>

        <BrandButton
          onClick={handleDeposit}
          disabled={isLoading || !amount}
          className="w-full"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <ExternalLink className="mr-2 h-4 w-4" />
              Pay with IvoryPay
            </>
          )}
        </BrandButton>

        <p className="text-xs text-muted-foreground text-center">
          You'll be redirected to IvoryPay's secure checkout to complete payment
        </p>
      </CardContent>
    </Card>
  )
}
