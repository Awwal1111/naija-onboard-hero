import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { supabase } from '@/integrations/supabase/client'
import { Loader2, Tv, Info } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Link } from 'react-router-dom'
import { useProfile } from '@/hooks/useProfile'

interface VTUCableTVDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentBalance: number
  onSuccess: () => void
}

interface TVPlan {
  code: string
  name: string
  price: number
}

export function VTUCableTVDialog({ open, onOpenChange, currentBalance, onSuccess }: VTUCableTVDialogProps) {
  const { profile } = useProfile()
  const [loading, setLoading] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [loadingPlans, setLoadingPlans] = useState(false)
  const [provider, setProvider] = useState('')
  const [smartCardNumber, setSmartCardNumber] = useState('')
  const [plan, setPlan] = useState('')
  const [plans, setPlans] = useState<TVPlan[]>([])
  const [customerName, setCustomerName] = useState('')
  const [pin, setPin] = useState('')
  
  const hasPin = Boolean((profile as any)?.transaction_pin)

  const providers = [
    { value: 'dstv', label: 'DStv' },
    { value: 'gotv', label: 'GOtv' },
    { value: 'startimes', label: 'Startimes' },
    { value: 'showmax', label: 'Showmax' }
  ]

  useEffect(() => {
    if (provider) {
      loadTVPlans()
    }
  }, [provider])

  const loadTVPlans = async () => {
    setLoadingPlans(true)
    try {
      const { data, error } = await supabase.functions.invoke('get-tv-variations', {
        body: { provider }
      })

      if (error) throw error
      setPlans(data.variations || [])
    } catch (error: any) {
      toast.error('Failed to load TV plans')
    } finally {
      setLoadingPlans(false)
    }
  }

  const handleVerifyCustomer = async () => {
    if (!provider || !smartCardNumber) {
      toast.error('Please select provider and enter smart card number')
      return
    }

    setVerifying(true)
    try {
      const { data, error } = await supabase.functions.invoke('verify-cable-customer', {
        body: { provider, smart_card_number: smartCardNumber }
      })

      if (error) throw error

      if (data.customer_name) {
        setCustomerName(data.customer_name)
        toast.success(`Customer verified: ${data.customer_name}`)
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to verify customer')
    } finally {
      setVerifying(false)
    }
  }

  const handlePurchase = async () => {
    if (!provider || !smartCardNumber || !plan || !pin) {
      toast.error('Please fill all required fields')
      return
    }

    const selectedPlan = plans.find(p => p.code === plan)
    if (!selectedPlan) {
      toast.error('Invalid plan selected')
      return
    }

    if (selectedPlan.price > currentBalance) {
      toast.error('Insufficient balance')
      return
    }

    setLoading(true)
    try {
      const { data, error } = await supabase.functions.invoke('buy-vtu-cable-tv', {
        body: {
          provider,
          smart_card_number: smartCardNumber,
          plan_code: plan,
          pin
        }
      })

      if (error) throw error

      toast.success('Cable TV subscription successful!')
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
    setSmartCardNumber('')
    setPlan('')
    setPlans([])
    setCustomerName('')
    setPin('')
  }

  const selectedPlan = plans.find(p => p.code === plan)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:max-w-md p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <Tv className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
            Cable TV Subscription
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className="text-xs sm:text-sm">
              Balance: ₦{currentBalance.toFixed(2)}NC
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label htmlFor="provider" className="text-sm">TV Provider</Label>
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
            <Label htmlFor="smartCard" className="text-sm">Smart Card Number</Label>
            <div className="flex gap-2">
              <Input
                id="smartCard"
                value={smartCardNumber}
                onChange={(e) => setSmartCardNumber(e.target.value)}
                placeholder="Enter smart card number"
                className="text-sm"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={handleVerifyCustomer}
                disabled={verifying || !provider || !smartCardNumber}
              >
                {verifying ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Verify'}
              </Button>
            </div>
            {customerName && (
              <p className="text-xs text-green-600">✓ {customerName}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="plan" className="text-sm">Subscription Plan</Label>
            <Select value={plan} onValueChange={setPlan} disabled={loadingPlans || !provider}>
              <SelectTrigger id="plan">
                <SelectValue placeholder={loadingPlans ? "Loading plans..." : "Select plan"} />
              </SelectTrigger>
              <SelectContent>
                {plans.map((p) => (
                  <SelectItem key={p.code} value={p.code}>
                    {p.name} - ₦{p.price}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
            disabled={loading || !customerName || !selectedPlan}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              `Pay ₦${selectedPlan?.price || '0'}`
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
