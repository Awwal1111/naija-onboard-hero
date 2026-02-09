import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { supabase } from '@/integrations/supabase/client'
import { Loader2, Zap, Info } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Link } from 'react-router-dom'
import { useProfile } from '@/hooks/useProfile'
import { useUserSecrets } from '@/hooks/useUserSecrets'

interface VTUElectricityDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentBalance: number
  onSuccess: () => void
}

export function VTUElectricityDialog({ open, onOpenChange, currentBalance, onSuccess }: VTUElectricityDialogProps) {
  const { profile } = useProfile()
  const [loading, setLoading] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [provider, setProvider] = useState('')
  const [meterNumber, setMeterNumber] = useState('')
  const [meterType, setMeterType] = useState<'prepaid' | 'postpaid'>('prepaid')
  const [amount, setAmount] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [pin, setPin] = useState('')
  
  const { hasPin } = useUserSecrets()

  const providers = [
    { value: 'ikeja-electric', label: 'Ikeja Electric (IKEDC)' },
    { value: 'eko-electric', label: 'Eko Electric (EKEDC)' },
    { value: 'kano-electric', label: 'Kano Electric (KEDCO)' },
    { value: 'portharcourt-electric', label: 'Port Harcourt Electric (PHED)' },
    { value: 'jos-electric', label: 'Jos Electric (JED)' },
    { value: 'ibadan-electric', label: 'Ibadan Electric (IBEDC)' },
    { value: 'kaduna-electric', label: 'Kaduna Electric (KAEDCO)' },
    { value: 'abuja-electric', label: 'Abuja Electric (AEDC)' },
    { value: 'enugu-electric', label: 'Enugu Electric (EEDC)' },
    { value: 'benin-electric', label: 'Benin Electric (BEDC)' }
  ]

  const handleVerifyCustomer = async () => {
    if (!provider || !meterNumber) {
      toast.error('Please select provider and enter meter number')
      return
    }

    setVerifying(true)
    try {
      const { data, error } = await supabase.functions.invoke('verify-electricity-customer', {
        body: { provider, meter_number: meterNumber, meter_type: meterType }
      })

      if (error) throw error

      if (data.customer_name) {
        setCustomerName(data.customer_name)
        toast.success(`Customer verified: ${data.customer_name}`)
      } else {
        toast.error('Could not verify customer details')
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to verify customer')
    } finally {
      setVerifying(false)
    }
  }

  const handlePurchase = async () => {
    if (!provider || !meterNumber || !amount || !pin) {
      toast.error('Please fill all required fields')
      return
    }

    const amountNum = parseFloat(amount)
    if (amountNum < 500) {
      toast.error('Minimum purchase is ₦500')
      return
    }

    if (amountNum > currentBalance) {
      toast.error('Insufficient balance')
      return
    }

    setLoading(true)
    try {
      const { data, error } = await supabase.functions.invoke('buy-vtu-electricity', {
        body: {
          provider,
          meter_number: meterNumber,
          meter_type: meterType,
          amount: amountNum,
          pin
        }
      })

      if (error) throw error

      toast.success('Electricity purchase successful!')
      onSuccess()
      onOpenChange(false)
      resetForm()
    } catch (error: any) {
      toast.error(error.message || 'Purchase failed')
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setProvider('')
    setMeterNumber('')
    setMeterType('prepaid')
    setAmount('')
    setCustomerName('')
    setPin('')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:max-w-md p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <Zap className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
            Buy Electricity
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className="text-xs sm:text-sm">
              Balance: ₦{currentBalance.toFixed(2)}NC | Min: ₦500
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label htmlFor="provider" className="text-sm">Electricity Provider</Label>
            <Select value={provider} onValueChange={setProvider}>
              <SelectTrigger id="provider">
                <SelectValue placeholder="Select provider" />
              </SelectTrigger>
              <SelectContent>
                {providers.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="meterType" className="text-sm">Meter Type</Label>
            <Select value={meterType} onValueChange={(v) => setMeterType(v as 'prepaid' | 'postpaid')}>
              <SelectTrigger id="meterType">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="prepaid">Prepaid</SelectItem>
                <SelectItem value="postpaid">Postpaid</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="meterNumber" className="text-sm">Meter Number</Label>
            <div className="flex gap-2">
              <Input
                id="meterNumber"
                value={meterNumber}
                onChange={(e) => setMeterNumber(e.target.value)}
                placeholder="Enter meter number"
                className="text-sm"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={handleVerifyCustomer}
                disabled={verifying || !provider || !meterNumber}
              >
                {verifying ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Verify'}
              </Button>
            </div>
            {customerName && (
              <p className="text-xs text-green-600">✓ {customerName}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount" className="text-sm">Amount (₦)</Label>
            <Input
              id="amount"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Enter amount"
              min="500"
              className="text-sm"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="pin" className="text-sm">Transaction PIN</Label>
            <Input
              id="pin"
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="Enter your PIN"
              maxLength={4}
              className="text-sm"
            />
            {!hasPin ? (
              <p className="text-xs text-destructive">
                No PIN set. <Link to="/settings" className="underline text-primary">Set up in Settings</Link>
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">Enter PIN to confirm</p>
            )}
          </div>

          <Button
            onClick={handlePurchase}
            disabled={loading || !customerName}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              `Pay ₦${amount || '0'}`
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
