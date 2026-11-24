import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Lock, Check, AlertCircle, KeyRound } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  AlertDialog,
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
  const [recoveryOtp, setRecoveryOtp] = useState('')
  const [recoverySent, setRecoverySent] = useState(false)

  const [hasExistingPin, setHasExistingPin] = useState(false)
  const [storedPin, setStoredPin] = useState<string | null>(null)

  // Fetch PIN from user_secrets table
  useEffect(() => {
    const fetchPin = async () => {
      if (!user) return
      const { data } = await supabase
        .from('user_secrets')
        .select('transaction_pin')
        .eq('user_id', user.id)
        .single()
      
      const pin = data?.transaction_pin || (profile as any)?.transaction_pin
      setStoredPin(pin || null)
      setHasExistingPin(Boolean(pin))
    }
    fetchPin()
  }, [user, profile])
  
  // Initialize mode based on whether PIN exists
  useEffect(() => {
    if (hasExistingPin) {
      setMode('change')
      setStep('current')
    }
  }, [hasExistingPin])

  const handleResetPin = async () => {
    if (!user?.email) {
      toast({ title: 'Email unavailable', description: 'Please contact support to recover your transaction PIN.', variant: 'destructive' })
      return
    }

    setLoading(true)
    try {
      if (!recoverySent) {
        const { error } = await supabase.auth.signInWithOtp({
          email: user.email,
          options: { shouldCreateUser: false }
        })
        if (error) throw error
        setRecoverySent(true)
        toast({ title: 'Verification code sent', description: 'Check ' + user.email + ' for your one-time code.' })
        return
      }

      if (!/^\d{6}$/.test(recoveryOtp)) {
        toast({ title: 'Enter the code', description: 'Enter the 6-digit code sent to your email.', variant: 'destructive' })
        return
      }

      const { error } = await supabase.auth.verifyOtp({ email: user.email, token: recoveryOtp, type: 'email' })
      if (error) throw error

      setShowResetDialog(false)
      setMode('reset')
      setStep('new')
      setCurrentPin('')
      setNewPin('')
      setConfirmPin('')
      setRecoveryOtp('')
      setRecoverySent(false)
      toast({ title: 'Identity verified', description: 'Create and confirm your new transaction PIN.' })
    } catch (error: any) {
      console.error('PIN recovery failed:', error)
      toast({ title: 'Verification failed', description: error.message || 'Please request a new code and try again.', variant: 'destructive' })
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

      if (currentPin !== storedPin) {
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
          .from('user_secrets')
          .upsert({ user_id: user?.id, transaction_pin: newPin }, { onConflict: 'user_id' })

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
              For your security, we will verify your email before allowing you to choose a new transaction PIN. Your existing PIN stays active until the new one is saved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row">
            <AlertDialogCancel onClick={() => { setRecoverySent(false); setRecoveryOtp('') }}>Cancel</AlertDialogCancel>
            {recoverySent && (
              <div className="w-full sm:flex-1">
                <Label htmlFor="pin-recovery-code">6-digit email code</Label>
                <Input id="pin-recovery-code" value={recoveryOtp} onChange={(e) => setRecoveryOtp(e.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" placeholder="Enter code" maxLength={6} className="mt-2 text-center tracking-[0.4em] font-mono" />
              </div>
            )}
            <Button onClick={handleResetPin} disabled={loading || (recoverySent && recoveryOtp.length !== 6)} className="w-full sm:w-auto">
              {loading ? 'Please wait...' : recoverySent ? 'Verify & continue' : 'Send verification code'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export default SetupPin