import { useEffect, useState } from 'react'
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

interface Props {
  currentBalance: number
  onSuccess?: () => void
}

interface Bank { Code: string; Name: string }

export const PretiumWithdrawalCard = ({ currentBalance, onSuccess }: Props) => {
  const { transactionPin } = useUserSecrets()
  const [amount, setAmount] = useState('')
  const [bankCode, setBankCode] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [verifiedName, setVerifiedName] = useState<string | null>(null)
  const [bankName, setBankName] = useState<string>('')
  const [banks, setBanks] = useState<Bank[]>([])
  const [banksLoading, setBanksLoading] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [showPin, setShowPin] = useState(false)
  const [resolveError, setResolveError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setBanksLoading(true)
    supabase.functions.invoke('pretium-ramp', { body: { action: 'banks' } })
      .then(({ data, error }) => {
        if (cancelled) return
        if (error || !data?.success) {
          toast.error(data?.error || error?.message || 'Could not load banks')
          return
        }
        setBanks((data.banks || []) as Bank[])
      })
      .finally(() => !cancelled && setBanksLoading(false))
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    setVerifiedName(null); setResolveError(null)
    if (!bankCode || accountNumber.trim().length < 8) return
    let cancelled = false
    const t = setTimeout(async () => {
      setIsVerifying(true)
      const { data, error } = await supabase.functions.invoke('pretium-ramp', {
        body: { action: 'validateAccount', currency: 'NGN', bank_code: bankCode, account_number: accountNumber.trim() },
      })
      if (cancelled) return
      if (error || !data?.success) {
        setResolveError(data?.error || error?.message || 'Could not verify account')
      } else {
        setVerifiedName(data.account_name || null)
        setBankName(data.bank_name || (banks.find(b => b.Code === bankCode)?.Name ?? ''))
      }
      setIsVerifying(false)
    }, 500)
    return () => { cancelled = true; clearTimeout(t) }
  }, [bankCode, accountNumber, banks])

  const handleContinue = () => {
    const nc = parseFloat(amount)
    if (!nc || nc < 1000) return toast.error('Minimum withdrawal is NC 1000')
    if (nc > currentBalance) return toast.error(`Insufficient balance (NC ${currentBalance.toLocaleString()})`)
    if (!verifiedName) return toast.error('Verify your bank account first')
    setShowPin(true)
  }

  const handlePin = async (pin: string) => {
    if (pin !== transactionPin) return toast.error('Incorrect PIN')
    setShowPin(false)
    setIsLoading(true)
    try {
      const { data, error } = await supabase.functions.invoke('pretium-ramp', {
        body: {
          action: 'offrampNGN',
          ncAmount: parseFloat(amount),
          account_name: verifiedName,
          account_number: accountNumber.trim(),
          bank_name: bankName,
          bank_code: bankCode,
        },
      })
      if (error || !data?.success) throw new Error((data as any)?.error || error?.message || 'Failed')
      toast.success(data.message || 'Withdrawal submitted')
      setAmount(''); setAccountNumber(''); setBankCode(''); setVerifiedName(null)
      onSuccess?.()
    } catch (e: any) {
      toast.error(e?.message || 'Withdrawal failed')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="h-5 w-5 text-primary" />
          Pretium Bank Withdrawal (NGN)
        </CardTitle>
        <CardDescription>Direct bank payout via Pretium Finance — typically settled within minutes</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription className="text-xs">
            We verify the recipient's name with their bank before sending. Money only leaves once
            the name matches.
          </AlertDescription>
        </Alert>

        <div className="space-y-2">
          <Label>Bank</Label>
          <Select value={bankCode} onValueChange={setBankCode} disabled={banksLoading || banks.length === 0}>
            <SelectTrigger>
              <SelectValue placeholder={banksLoading ? 'Loading banks…' : 'Select bank'} />
            </SelectTrigger>
            <SelectContent className="max-h-72">
              {banks.map(b => (
                <SelectItem key={b.Code} value={b.Code}>{b.Name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Account Number</Label>
          <BrandInput value={accountNumber} onChange={e => setAccountNumber(e.target.value)} placeholder="10-digit NUBAN" />
          {isVerifying && (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" /> Verifying…
            </p>
          )}
          {verifiedName && (
            <p className="text-xs text-green-600 flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" /> {verifiedName}
            </p>
          )}
          {resolveError && !verifiedName && !isVerifying && (
            <p className="text-xs text-destructive">{resolveError}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label>Amount (NC)</Label>
          <BrandInput type="number" value={amount} onChange={e => setAmount(e.target.value)} min="1000" placeholder="Min NC 1,000" />
          <p className="text-xs text-muted-foreground">
            ≈ ₦{Math.round(parseFloat(amount || '0')).toLocaleString()} • Min: NC 1,000
          </p>
        </div>

        {showPin ? (
          <SecurePinInput
            onVerified={handlePin}
            onCancel={() => setShowPin(false)}
            title="Confirm Withdrawal"
            description={`Withdraw NC ${parseFloat(amount).toLocaleString()} to ${verifiedName}`}
          />
        ) : (
          <BrandButton
            className="w-full"
            onClick={handleContinue}
            disabled={isLoading || !amount || !verifiedName}
          >
            {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing…</> : <><Send className="mr-2 h-4 w-4" /> Withdraw via Pretium</>}
          </BrandButton>
        )}
      </CardContent>
    </Card>
  )
}
