import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { BrandButton } from '@/components/ui/brand-button'
import { BrandInput } from '@/components/ui/brand-input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Globe, Info, Loader2, Send } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { toast } from 'sonner'
import { SecurePinInput } from './SecurePinInput'
import { useUserSecrets } from '@/hooks/useUserSecrets'

interface IvoryPayWithdrawalCardProps {
  currentBalance: number
  onSuccess?: () => void
}

const BANK_OPTIONS: Record<string, { name: string; banks: { code: string; name: string }[] }> = {
  NGN: {
    name: 'Nigeria',
    banks: [
      { code: '044', name: 'Access Bank' },
      { code: '023', name: 'Citibank' },
      { code: '050', name: 'Ecobank' },
      { code: '070', name: 'Fidelity Bank' },
      { code: '011', name: 'First Bank' },
      { code: '214', name: 'FCMB' },
      { code: '058', name: 'GTBank' },
      { code: '030', name: 'Heritage Bank' },
      { code: '301', name: 'Jaiz Bank' },
      { code: '082', name: 'Keystone Bank' },
      { code: '526', name: 'Kuda Bank' },
      { code: '076', name: 'Polaris Bank' },
      { code: '101', name: 'Providus Bank' },
      { code: '221', name: 'Stanbic IBTC' },
      { code: '068', name: 'Standard Chartered' },
      { code: '232', name: 'Sterling Bank' },
      { code: '032', name: 'Union Bank' },
      { code: '033', name: 'UBA' },
      { code: '215', name: 'Unity Bank' },
      { code: '035', name: 'Wema Bank' },
      { code: '057', name: 'Zenith Bank' },
      { code: '999', name: 'OPay' },
      { code: '305', name: 'PalmPay' },
      { code: '100', name: 'Moniepoint' },
    ],
  },
  GHS: {
    name: 'Ghana',
    banks: [
      { code: 'MTN_GH', name: 'MTN Mobile Money' },
      { code: 'VODAFONE_GH', name: 'Vodafone Cash' },
      { code: 'AIRTELTIGO_GH', name: 'AirtelTigo Money' },
    ],
  },
  KES: {
    name: 'Kenya',
    banks: [
      { code: 'MPESA', name: 'M-Pesa' },
      { code: 'AIRTEL_KE', name: 'Airtel Money' },
    ],
  },
  ZAR: {
    name: 'South Africa',
    banks: [
      { code: 'FNB_ZA', name: 'FNB' },
      { code: 'ABSA_ZA', name: 'ABSA' },
      { code: 'STD_ZA', name: 'Standard Bank' },
      { code: 'NED_ZA', name: 'Nedbank' },
      { code: 'CAP_ZA', name: 'Capitec Bank' },
    ],
  },
}

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
          <AlertDescription className="text-xs">
            Withdraw to bank accounts in Nigeria, Ghana, Kenya, and South Africa
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
