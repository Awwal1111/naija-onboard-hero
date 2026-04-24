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
  const [verifiedName, setVerifiedName] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)
  const [showPin, setShowPin] = useState(false)
  const [banks, setBanks] = useState<IvoryBank[]>([])
  const [banksLoading, setBanksLoading] = useState(false)
  const [accountResolutionError, setAccountResolutionError] = useState<string | null>(null)

  const usdEquivalent = (parseFloat(amount) || 0) / 1600

  // Fetch the official IvoryPay bank list whenever the currency changes — this
  // avoids the "Unable to get bank by code" rejections we got from hardcoded codes.
  useEffect(() => {
    let cancelled = false
    const loadBanks = async () => {
      setBanksLoading(true)
      setBankCode('')
      setVerifiedName(null)
      setAccountResolutionError(null)
      try {
        const { data: { session } } = await supabase.auth.getSession()
        const response = await supabase.functions.invoke('ivorypay-withdrawal', {
          body: { action: 'listBanks', currency },
          headers: { Authorization: `Bearer ${session?.access_token}` },
        })
        if (cancelled) return
        if (response.error) throw new Error(response.error.message)
        if (response.data?.success === false) {
          throw new Error(response.data?.error || 'Could not load bank list')
        }
        const list = (response.data?.banks || []) as any[]
        const normalized: IvoryBank[] = list
          .map((b) => ({
            code: String(b.code || b.bankCode || b.id || ''),
            name: String(b.name || b.bankName || b.label || b.code || ''),
          }))
          .filter((b) => b.code && b.name)
        setBanks(normalized)
      } catch (err: any) {
        console.error('IvoryPay bank list error:', err)
        if (!cancelled) {
          setBanks([])
          toast.error('Could not load bank list — try again in a moment')
        }
      } finally {
        if (!cancelled) setBanksLoading(false)
      }
    }
    loadBanks()
    return () => { cancelled = true }
  }, [currency])

  // Auto-verify the account name once we have a bank + ≥8-digit account number.
  useEffect(() => {
    setVerifiedName(null)
    setAccountResolutionError(null)
    if (!bankCode || accountNumber.trim().length < 8) return
    let cancelled = false
    const t = setTimeout(async () => {
      setIsVerifying(true)
      try {
        const { data: { session } } = await supabase.auth.getSession()
        const response = await supabase.functions.invoke('ivorypay-withdrawal', {
          body: { action: 'resolveAccount', currency, bankCode, accountNumber },
          headers: { Authorization: `Bearer ${session?.access_token}` },
        })
        if (cancelled) return
        if (response.error) throw new Error(response.error.message)
        const data = response.data
        if (data?.success && data?.accountName) {
          setVerifiedName(data.accountName)
          setAccountName(data.accountName)
          setAccountResolutionError(null)
        } else {
          setVerifiedName(null)
          setAccountName('')
          setAccountResolutionError(data?.error || 'Could not verify account details')
        }
      } catch (err: any) {
        console.error('Account resolution error:', err)
        if (!cancelled) {
          setVerifiedName(null)
          setAccountName('')
          setAccountResolutionError(err.message || 'Could not verify account details')
        }
      } finally {
        if (!cancelled) setIsVerifying(false)
      }
    }, 500)
    return () => { cancelled = true; clearTimeout(t) }
  }, [bankCode, accountNumber, currency])

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
    if (!bankCode || !accountNumber) {
      toast.error('Please pick a bank and enter an account number')
      return
    }
    if (!verifiedName) {
      toast.error('Please wait for the account name to be verified')
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
          accountName: verifiedName || accountName,
        },
        headers: { Authorization: `Bearer ${session?.access_token}` },
      })

      if (response.error) throw new Error(response.error.message)

      const data = response.data
      if (!data?.success) throw new Error(data?.error || 'Withdrawal failed')

      toast.success(data.message || 'Withdrawal is being processed!')
      setAmount('')
      setAccountNumber('')
      setAccountName('')
      setBankCode('')
      setVerifiedName(null)
      onSuccess?.()
    } catch (error: any) {
      console.error('IvoryPay withdrawal error:', error)
      toast.error(error.message || 'Withdrawal failed')
    } finally {
      setIsLoading(false)
    }
  }

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
              We verify your bank account name with IvoryPay before sending — money
              only leaves once the name is confirmed.
            </p>
          </AlertDescription>
        </Alert>

        <div className="space-y-2">
          <Label>Country / Currency</Label>
          <Select value={currency} onValueChange={setCurrency}>
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
          <Select
            value={bankCode}
            onValueChange={setBankCode}
            disabled={banksLoading || banks.length === 0}
          >
            <SelectTrigger>
              <SelectValue placeholder={banksLoading ? 'Loading banks…' : (banks.length ? 'Select bank' : 'No banks available')} />
            </SelectTrigger>
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
          {isVerifying && (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" /> Verifying account…
            </p>
          )}
          {verifiedName && (
            <p className="text-xs text-green-600 flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" /> {verifiedName}
            </p>
          )}
          {accountResolutionError && !isVerifying && !verifiedName && (
            <p className="text-xs text-destructive">{accountResolutionError}</p>
          )}
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
            description={`Withdraw NC ${parseFloat(amount).toLocaleString()} to ${verifiedName || accountNumber}`}
          />
        ) : (
          <BrandButton
            onClick={handleContinue}
            disabled={isLoading || !amount || !bankCode || !accountNumber || !verifiedName}
            className="w-full"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing…
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
