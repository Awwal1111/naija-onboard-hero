import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { supabase } from '@/integrations/supabase/client'
import { Loader2, GraduationCap, Info } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface VTUEducationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentBalance: number
  onSuccess: () => void
}

interface EPin {
  code: string
  name: string
  price: number
}

export function VTUEducationDialog({ open, onOpenChange, currentBalance, onSuccess }: VTUEducationDialogProps) {
  const [loading, setLoading] = useState(false)
  const [loadingPins, setLoadingPins] = useState(false)
  const [service, setService] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [pinType, setPinType] = useState('')
  const [pinTypes, setPinTypes] = useState<EPin[]>([])
  const [pin, setPin] = useState('')

  const services = [
    { value: 'waec', label: 'WAEC Result Checker' },
    { value: 'neco', label: 'NECO Result Checker' },
    { value: 'nabteb', label: 'NABTEB Result Checker' },
    { value: 'jamb', label: 'JAMB ePIN' }
  ]

  useEffect(() => {
    if (service) {
      loadEPins()
    }
  }, [service])

  const loadEPins = async () => {
    setLoadingPins(true)
    try {
      const { data, error } = await supabase.functions.invoke('get-epin-variations', {
        body: { service }
      })

      if (error) throw error
      setPinTypes(data.variations || [])
    } catch (error: any) {
      toast.error('Failed to load ePIN types')
    } finally {
      setLoadingPins(false)
    }
  }

  const handlePurchase = async () => {
    if (!service || !pinType || !quantity || !pin) {
      toast.error('Please fill all required fields')
      return
    }

    const selectedPin = pinTypes.find(p => p.code === pinType)
    if (!selectedPin) {
      toast.error('Invalid PIN type selected')
      return
    }

    const totalAmount = selectedPin.price * parseInt(quantity)
    
    if (totalAmount > currentBalance) {
      toast.error('Insufficient balance')
      return
    }

    setLoading(true)
    try {
      const { data, error } = await supabase.functions.invoke('buy-vtu-education', {
        body: {
          service,
          pin_type: pinType,
          quantity: parseInt(quantity),
          pin
        }
      })

      if (error) throw error

      toast.success(`Education PIN(s) purchased successfully! Check your email for details.`)
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
    setService('')
    setPinType('')
    setPinTypes([])
    setQuantity('1')
    setPin('')
  }

  const selectedPin = pinTypes.find(p => p.code === pinType)
  const totalAmount = selectedPin ? selectedPin.price * parseInt(quantity || '1') : 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:max-w-md p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <GraduationCap className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
            Education ePINs
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className="text-xs sm:text-sm">
              Balance: ₦{currentBalance.toFixed(2)}NC | Result checker PINs delivered instantly
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label htmlFor="service" className="text-sm">Exam Board</Label>
            <Select value={service} onValueChange={setService}>
              <SelectTrigger id="service">
                <SelectValue placeholder="Select exam board" />
              </SelectTrigger>
              <SelectContent>
                {services.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="pinType" className="text-sm">PIN Type</Label>
            <Select value={pinType} onValueChange={setPinType} disabled={loadingPins || !service}>
              <SelectTrigger id="pinType">
                <SelectValue placeholder={loadingPins ? "Loading..." : "Select PIN type"} />
              </SelectTrigger>
              <SelectContent>
                {pinTypes.map((p) => (
                  <SelectItem key={p.code} value={p.code}>
                    {p.name} - ₦{p.price}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="quantity" className="text-sm">Quantity</Label>
            <Input
              id="quantity"
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="Enter quantity"
              min="1"
              max="10"
              className="text-sm"
            />
          </div>

          {totalAmount > 0 && (
            <Alert>
              <AlertDescription className="text-sm font-semibold">
                Total: ₦{totalAmount.toFixed(2)}
              </AlertDescription>
            </Alert>
          )}

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
          </div>

          <Button
            onClick={handlePurchase}
            disabled={loading || !selectedPin}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              `Pay ₦${totalAmount.toFixed(2)}`
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
