import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Fingerprint, Lock } from 'lucide-react'
import { useBiometric } from '@/hooks/useBiometric'
import { useProfile } from '@/hooks/useProfile'
import { toast } from 'sonner'

interface SecurePinInputProps {
  onVerified: (pin: string) => void
  onCancel?: () => void
  title?: string
  description?: string
}

export const SecurePinInput = ({ 
  onVerified, 
  onCancel, 
  title = "Enter Transaction PIN",
  description = "Enter your 4-digit PIN to confirm"
}: SecurePinInputProps) => {
  const [pin, setPin] = useState('')
  const [loading, setLoading] = useState(false)
  const { profile } = useProfile()
  const { isEnabled: biometricEnabled, isAvailable: biometricAvailable, authenticate } = useBiometric()

  const hasPin = Boolean((profile as any)?.transaction_pin)

  const handleBiometric = async () => {
    if (!biometricEnabled || !biometricAvailable) return

    setLoading(true)
    try {
      const success = await authenticate()
      if (success) {
        // If biometric succeeds, get the actual PIN from profile
        const actualPin = (profile as any)?.transaction_pin
        if (actualPin) {
          onVerified(actualPin)
        } else {
          toast.error('PIN not set. Please set up your PIN in Settings')
        }
      }
    } catch (error) {
      console.error('Biometric auth error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handlePinSubmit = () => {
    if (!hasPin) {
      toast.error('Please set up your transaction PIN in Settings first')
      return
    }

    if (pin.length !== 4) {
      toast.error('PIN must be 4 digits')
      return
    }

    onVerified(pin)
  }

  return (
    <div className="space-y-4">
      <div className="text-center">
        <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-3">
          <Lock className="h-6 w-6 text-primary" />
        </div>
        <h3 className="font-semibold text-lg">{title}</h3>
        <p className="text-sm text-muted-foreground mt-1">{description}</p>
      </div>

      {!hasPin && (
        <Alert variant="destructive">
          <AlertDescription>
            You need to set up a transaction PIN first. Go to Settings → Security → Transaction PIN
          </AlertDescription>
        </Alert>
      )}

      {/* Biometric Authentication - Show prominently when available */}
      {biometricAvailable && (
        <div className="space-y-2">
          <Button
            variant={biometricEnabled ? "default" : "outline"}
            className={`w-full h-14 ${biometricEnabled ? 'bg-gradient-to-r from-primary to-primary/80' : ''}`}
            onClick={handleBiometric}
            disabled={loading || !hasPin || !biometricEnabled}
          >
            <Fingerprint className="h-6 w-6 mr-3" />
            <div className="text-left">
              <div className="font-medium">
                {biometricEnabled ? 'Tap to Authenticate' : 'Biometric Not Enabled'}
              </div>
              <div className="text-xs opacity-70">
                {biometricEnabled ? 'Use fingerprint or Face ID' : 'Enable in Settings → Security'}
              </div>
            </div>
          </Button>
          
          {biometricEnabled && hasPin && (
            <p className="text-center text-xs text-muted-foreground">
              — or enter PIN below —
            </p>
          )}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="secure-pin">Transaction PIN</Label>
        <Input
          id="secure-pin"
          type="password"
          inputMode="numeric"
          placeholder="Enter 4-digit PIN"
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
          maxLength={4}
          autoFocus={!biometricEnabled}
          disabled={!hasPin}
          className="text-center text-2xl tracking-[1em] font-mono"
        />
      </div>

      <div className="flex gap-2">
        {onCancel && (
          <Button variant="outline" onClick={onCancel} className="flex-1">
            Cancel
          </Button>
        )}
        <Button 
          onClick={handlePinSubmit} 
          disabled={pin.length !== 4 || loading || !hasPin}
          className="flex-1"
        >
          {loading ? 'Verifying...' : 'Confirm'}
        </Button>
      </div>
    </div>
  )
}
