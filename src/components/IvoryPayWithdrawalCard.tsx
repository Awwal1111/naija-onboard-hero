import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { BrandButton } from '@/components/ui/brand-button'
import { BrandInput } from '@/components/ui/brand-input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Globe, Info, Loader2, Send, CheckCircle2 } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { toast } from 'sonner'
import { SecurePinInput } from './SecurePinInput'
import { useUserSecrets } from '@/hooks/useUserSecrets'

interface IvoryPayWithdrawalCardProps {
  currentBalance: number
  onSuccess?: () => void
}

interface IvoryBank { code: string; name: string }


export const IvoryPayWithdrawalCard = ({ currentBalance, onSuccess }: IvoryPayWithdrawalCardProps) => {
  const { transactionPin } = useUserSecrets()
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState('NGN')
  const [bankCode, setBankCode] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [accountName, setAccountName] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showPin, setShowPin] = useState(false)

  const usdEquivalent = (parseFloat(amount) || 0) / 1600

  const handleContinue = () => {
    const ncAmount = parseFloat(amount)
    if (!ncAmount || ncAmount < 100) {
      toast.error('Minimum withdrawal is NC 100')
      return
    }
    if (ncAmount > currentBalance) {
      toast.error(`Insufficient balance. You have NC ${currentBalance.toLocaleString()}`)
      return
    }
    if (!bankCode || !accountNumber || !accountName) {
      toast.error('Please fill in all bank details')
      return
    }
    setShowPin(true)
  }

  const handlePinVerified = async (pin: string) => {
    if (pin !== transactionPin) {
      toast.error('Incorrect PIN')
      return
    }
    setShowPin(false)
    await processWithdrawal()
  }

  const processWithdrawal = async () => {
    setIsLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()

      const response = await supabase.functions.invoke('ivorypay-withdrawal', {
        body: {
          ncAmount: parseFloat(amount),
          currency,
          bankCode,
          accountNumber,
          accountName,
        },
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
      })

      if (response.error) throw new Error(response.error.message)

      const data = response.data
      if (!data?.success) throw new Error(data?.error || 'Withdrawal failed')

      toast.success(data.message || 'Withdrawal is being processed!')
      setAmount('')
      setAccountNumber('')
      setAccountName('')
      setBankCode('')
      onSuccess?.()
    } catch (error: any) {
      console.error('IvoryPay withdrawal error:', error)
      toast.error(error.message || 'Withdrawal failed')
    } finally {
      setIsLoading(false)
    }
  }

  const banks = BANK_OPTIONS[currency]?.banks || []

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="h-5 w-5 text-amber-600" />
          IvoryPay Withdrawal
        </CardTitle>
        <CardDescription>
          Withdraw to bank account or mobile money in Africa
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert className="bg-amber-500/10 border-amber-500/30">
          <Info className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-xs space-y-1">
            <p>Withdraw to bank accounts in Nigeria, Ghana, Kenya, and South Africa.</p>
            <p className="text-muted-foreground">
              No external page opens — IvoryPay sends the money straight to the bank account
              you enter. You'll see the result here.
            </p>
          </AlertDescription>
        </Alert>

        <div className="space-y-2">
          <Label>Country / Currency</Label>
          <Select value={currency} onValueChange={(v) => { setCurrency(v); setBankCode('') }}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="NGN">🇳🇬 Nigeria (NGN)</SelectItem>
              <SelectItem value="GHS">🇬🇭 Ghana (GHS)</SelectItem>
              <SelectItem value="KES">🇰🇪 Kenya (KES)</SelectItem>
              <SelectItem value="ZAR">🇿🇦 South Africa (ZAR)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Bank / Provider</Label>
          <Select value={bankCode} onValueChange={setBankCode}>
            <SelectTrigger><SelectValue placeholder="Select bank" /></SelectTrigger>
            <SelectContent>
              {banks.map((b) => (
                <SelectItem key={b.code} value={b.code}>{b.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Account Number</Label>
          <BrandInput
            placeholder="Enter account number"
            value={accountNumber}
            onChange={(e) => setAccountNumber(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label>Account Name</Label>
          <BrandInput
            placeholder="Enter account holder name"
            value={accountName}
            onChange={(e) => setAccountName(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label>Amount (NC)</Label>
          <BrandInput
            type="number"
            placeholder="Enter NC amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            min="100"
          />
          <p className="text-xs text-muted-foreground">
            ≈ ${usdEquivalent.toFixed(2)} USD • Min: NC 100
          </p>
        </div>

        {showPin ? (
          <SecurePinInput
            onVerified={handlePinVerified}
            onCancel={() => setShowPin(false)}
            title="Confirm Withdrawal"
            description={`Withdraw NC ${parseFloat(amount).toLocaleString()} to ${accountNumber}`}
          />
        ) : (
          <BrandButton
            onClick={handleContinue}
            disabled={isLoading || !amount || !bankCode || !accountNumber || !accountName}
            className="w-full"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Withdraw via IvoryPay
              </>
            )}
          </BrandButton>
        )}
      </CardContent>
    </Card>
  )
}
