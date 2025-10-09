import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Lock, Check, AlertCircle, KeyRound } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/hooks/useAuth'
import { useProfile } from '@/hooks/useProfile'
import { supabase } from '@/integrations/supabase/client'

export const SetupPin = () => {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { user } = useAuth()
  const { profile, refetch } = useProfile()
  
  const [mode, setMode] = useState<'setup' | 'change' | 'reset'>('setup')
  const [step, setStep] = useState<'current' | 'new' | 'confirm'>('new')
  const [currentPin, setCurrentPin] = useState('')
  const [newPin, setNewPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [loading, setLoading] = useState(false)
  const [showResetDialog, setShowResetDialog] = useState(false)

  const hasExistingPin = Boolean((profile as any)?.transaction_pin)
  
  // Initialize mode based on whether PIN exists
  useState(() => {
    if (hasExistingPin) {
      setMode('change')
      setStep('current')
    }
  })

  const handleResetPin = async () => {
    setLoading(true)
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ transaction_pin: null })
        .eq('user_id', user?.id)

      if (error) throw error

      await refetch()
      
      toast({
        title: "PIN Reset",
        description: "Your PIN has been reset. Please set a new PIN."
      })

      setShowResetDialog(false)
      setMode('setup')
      setStep('new')
      setCurrentPin('')
      setNewPin('')
      setConfirmPin('')
    } catch (error) {
      console.error('Error resetting PIN:', error)
      toast({
        title: "Error",
        description: "Failed to reset PIN. Please try again.",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSetPin = async () => {
    // Step 1: Verify current PIN (for change mode only)
    if (mode === 'change' && step === 'current') {
      if (currentPin.length !== 4) {
        toast({
          title: "Invalid PIN",
          description: "Please enter your current 4-digit PIN",
          variant: "destructive"
        })
        return
      }

      if (currentPin !== (profile as any).transaction_pin) {
        toast({
          title: "Incorrect PIN",
          description: "The current PIN you entered is incorrect",
          variant: "destructive"
        })
        setCurrentPin('')
        return
      }

      setStep('new')
      return
    }

    // Step 2: Enter new PIN
    if (step === 'new') {
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

      // Don't allow reusing current PIN when changing
      if (mode === 'change' && newPin === currentPin) {
        toast({
          title: "Same PIN",
          description: "New PIN must be different from current PIN",
          variant: "destructive"
        })
        setNewPin('')
        return
      }

      setStep('confirm')
      return
    }

    // Step 3: Confirm new PIN and save
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

      setLoading(true)
      try {
        const { error } = await supabase
          .from('profiles')
          .update({ transaction_pin: newPin })
          .eq('user_id', user?.id)

        if (error) throw error

        await refetch()

        toast({
          title: "Success! ✓",
          description: mode === 'change' ? "PIN changed successfully" : "PIN created successfully"
        })

        setTimeout(() => navigate('/settings'), 500)
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
    // Step 1: Verify current PIN (change mode only)
    if (mode === 'change' && step === 'current') {
      return (
        <div className="space-y-4">
          <Alert>
            <Lock className="h-4 w-4" />
            <AlertTitle>Verify Your Identity</AlertTitle>
            <AlertDescription>
              Enter your current PIN to continue
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label htmlFor="current-pin">Current PIN</Label>
            <Input
              id="current-pin"
              type="password"
              inputMode="numeric"
              placeholder="••••"
              value={currentPin}
              onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
              maxLength={4}
              className="text-center text-2xl tracking-widest font-mono"
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Button 
              onClick={handleSetPin} 
              disabled={currentPin.length !== 4 || loading}
              className="w-full"
            >
              {loading ? 'Verifying...' : 'Continue'}
            </Button>
            
            <Button 
              variant="ghost" 
              onClick={() => setShowResetDialog(true)}
              className="w-full text-sm"
            >
              <KeyRound className="h-3 w-3 mr-2" />
              Forgot PIN? Reset it
            </Button>
          </div>
        </div>
      )
    }

    // Step 2: Enter new PIN
    if (step === 'new') {
      return (
        <div className="space-y-4">
          <Alert>
            <Lock className="h-4 w-4" />
            <AlertTitle>{mode === 'change' ? 'Choose New PIN' : 'Create PIN'}</AlertTitle>
            <AlertDescription>
              {mode === 'change' ? 'Enter a new 4-digit PIN' : 'Choose a 4-digit PIN for secure transfers'}
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label htmlFor="new-pin">New PIN</Label>
            <Input
              id="new-pin"
              type="password"
              inputMode="numeric"
              placeholder="••••"
              value={newPin}
              onChange={(e) => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
              maxLength={4}
              className="text-center text-2xl tracking-widest font-mono"
              autoFocus
            />
            <p className="text-xs text-muted-foreground">
              {mode === 'change' ? 'Must be different from your current PIN' : 'Choose a PIN you can remember'}
            </p>
          </div>

          <div className="flex gap-2">
            {mode === 'change' && (
              <Button 
                variant="outline" 
                onClick={() => {
                  setStep('current')
                  setNewPin('')
                }}
                className="flex-1"
              >
                Back
              </Button>
            )}
            <Button 
              onClick={handleSetPin} 
              disabled={newPin.length !== 4 || loading}
              className={mode === 'change' ? "flex-1" : "w-full"}
            >
              Continue
            </Button>
          </div>
        </div>
      )
    }

    // Step 3: Confirm new PIN
    if (step === 'confirm') {
      return (
        <div className="space-y-4">
          <Alert>
            <Check className="h-4 w-4" />
            <AlertTitle>Confirm PIN</AlertTitle>
            <AlertDescription>
              Re-enter your PIN to confirm
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label htmlFor="confirm-pin">Confirm PIN</Label>
            <Input
              id="confirm-pin"
              type="password"
              inputMode="numeric"
              placeholder="••••"
              value={confirmPin}
              onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
              maxLength={4}
              className="text-center text-2xl tracking-widest font-mono"
              autoFocus
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
              {loading ? 'Saving...' : 'Confirm & Save'}
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
          {mode === 'change' ? 'Change PIN' : mode === 'reset' ? 'Reset PIN' : 'Set Up PIN'}
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
            <strong>Security Notice:</strong> Your PIN is encrypted and required for all money transfers. Never share your PIN with anyone, including NaijaLancers support staff.
          </AlertDescription>
        </Alert>
      </div>

      {/* Reset PIN Confirmation Dialog */}
      <AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset Transaction PIN?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete your current PIN. You'll need to create a new PIN immediately after. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleResetPin} disabled={loading} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {loading ? 'Resetting...' : 'Reset PIN'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export default SetupPin