import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Lock, Check, AlertCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/hooks/useAuth'
import { useProfile } from '@/hooks/useProfile'
import { supabase } from '@/integrations/supabase/client'

export const SetupPin = () => {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { user } = useAuth()
  const { profile } = useProfile()
  
  const [step, setStep] = useState<'current' | 'new' | 'confirm'>('current')
  const [currentPin, setCurrentPin] = useState('')
  const [newPin, setNewPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [loading, setLoading] = useState(false)

  const hasExistingPin = (profile as any)?.transaction_pin

  const handleSetPin = async () => {
    // Validation
    if (hasExistingPin && step === 'current') {
      if (currentPin.length !== 4) {
        toast({
          title: "Invalid PIN",
          description: "Please enter your current 4-digit PIN",
          variant: "destructive"
        })
        return
      }

      // Verify current PIN
      if (currentPin !== (profile as any).transaction_pin) {
        toast({
          title: "Incorrect PIN",
          description: "The current PIN you entered is incorrect",
          variant: "destructive"
        })
        return
      }

      setStep('new')
      return
    }

    if (step === 'new' || (!hasExistingPin && step === 'current')) {
      if (newPin.length !== 4) {
        toast({
          title: "Invalid PIN",
          description: "PIN must be exactly 4 digits",
          variant: "destructive"
        })
        return
      }

      if (!/^\d{4}$/.test(newPin)) {
        toast({
          title: "Invalid PIN",
          description: "PIN must contain only numbers",
          variant: "destructive"
        })
        return
      }

      setStep('confirm')
      return
    }

    if (step === 'confirm') {
      if (confirmPin !== newPin) {
        toast({
          title: "PIN Mismatch",
          description: "PINs do not match. Please try again.",
          variant: "destructive"
        })
        setConfirmPin('')
        return
      }

      // Save PIN
      setLoading(true)
      try {
        const { error } = await supabase
          .from('profiles')
          .update({ transaction_pin: newPin })
          .eq('user_id', user?.id)

        if (error) throw error

        toast({
          title: "Success",
          description: hasExistingPin ? "PIN updated successfully" : "PIN created successfully"
        })

        navigate('/settings')
      } catch (error) {
        console.error('Error saving PIN:', error)
        toast({
          title: "Error",
          description: "Failed to save PIN. Please try again.",
          variant: "destructive"
        })
      } finally {
        setLoading(false)
      }
    }
  }

  const renderStep = () => {
    if (hasExistingPin && step === 'current') {
      return (
        <div className="space-y-4">
          <Alert>
            <Lock className="h-4 w-4" />
            <AlertDescription>
              Enter your current PIN to continue
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label htmlFor="current-pin">Current PIN</Label>
            <Input
              id="current-pin"
              type="password"
              placeholder="••••"
              value={currentPin}
              onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
              maxLength={4}
              className="text-center text-2xl tracking-widest"
            />
          </div>

          <Button 
            onClick={handleSetPin} 
            disabled={currentPin.length !== 4 || loading}
            className="w-full"
          >
            Continue
          </Button>
        </div>
      )
    }

    if (step === 'new' || (!hasExistingPin && step === 'current')) {
      return (
        <div className="space-y-4">
          <Alert>
            <Lock className="h-4 w-4" />
            <AlertDescription>
              Create a 4-digit PIN for secure transfers
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label htmlFor="new-pin">New PIN</Label>
            <Input
              id="new-pin"
              type="password"
              placeholder="••••"
              value={newPin}
              onChange={(e) => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
              maxLength={4}
              className="text-center text-2xl tracking-widest"
            />
            <p className="text-xs text-muted-foreground">
              Choose a 4-digit PIN you can remember
            </p>
          </div>

          <div className="flex gap-2">
            {hasExistingPin && (
              <Button 
                variant="outline" 
                onClick={() => setStep('current')}
                className="flex-1"
              >
                Back
              </Button>
            )}
            <Button 
              onClick={handleSetPin} 
              disabled={newPin.length !== 4 || loading}
              className={hasExistingPin ? "flex-1" : "w-full"}
            >
              Continue
            </Button>
          </div>
        </div>
      )
    }

    if (step === 'confirm') {
      return (
        <div className="space-y-4">
          <Alert>
            <Check className="h-4 w-4" />
            <AlertDescription>
              Confirm your new PIN
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label htmlFor="confirm-pin">Confirm PIN</Label>
            <Input
              id="confirm-pin"
              type="password"
              placeholder="••••"
              value={confirmPin}
              onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
              maxLength={4}
              className="text-center text-2xl tracking-widest"
            />
          </div>

          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => {
                setStep('new')
                setConfirmPin('')
              }}
              className="flex-1"
            >
              Back
            </Button>
            <Button 
              onClick={handleSetPin} 
              disabled={confirmPin.length !== 4 || loading}
              className="flex-1"
            >
              {loading ? 'Saving...' : 'Confirm'}
            </Button>
          </div>
        </div>
      )
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-background border-b border-border px-6 py-4 flex items-center gap-4">
        <button onClick={() => navigate('/settings')}>
          <ArrowLeft className="h-6 w-6 text-text-secondary hover:text-text-primary transition-colors" />
        </button>
        <h1 className="text-xl font-semibold text-text-primary">
          {hasExistingPin ? 'Change PIN' : 'Set Up PIN'}
        </h1>
      </header>

      <div className="px-6 py-6 max-w-md mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Transaction PIN
            </CardTitle>
          </CardHeader>
          <CardContent>
            {renderStep()}
          </CardContent>
        </Card>

        <Alert className="mt-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Important:</strong> Your PIN is stored securely and is required for all money transfers. Never share your PIN with anyone, including NaijaLancers support staff.
          </AlertDescription>
        </Alert>
      </div>
    </div>
  )
}

export default SetupPin