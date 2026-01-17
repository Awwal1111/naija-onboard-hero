import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { BrandInput } from '@/components/ui/brand-input'
import { Progress } from '@/components/ui/progress'
import { Logo } from '@/components/ui/logo'
import { 
  User, 
  ArrowRight, 
  Briefcase, 
  CheckCircle2, 
  Sparkles,
  X
} from 'lucide-react'
import { useProfile } from '@/hooks/useProfile'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/use-toast'

interface QuickOnboardingProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onComplete?: () => void
}

export const QuickOnboarding: React.FC<QuickOnboardingProps> = ({ 
  open, 
  onOpenChange,
  onComplete 
}) => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { profile, updateProfile } = useProfile()
  const { toast } = useToast()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    full_name: '',
    profession: ''
  })

  const totalSteps = 2

  useEffect(() => {
    if (profile) {
      setFormData({
        full_name: profile.full_name || '',
        profession: profile.profession || ''
      })
    }
  }, [profile])

  const handleNext = async () => {
    if (step === 1 && !formData.full_name.trim()) {
      toast({ title: 'Please enter your name', variant: 'destructive' })
      return
    }

    if (step < totalSteps) {
      setStep(step + 1)
    } else {
      // Final step - save and complete
      setLoading(true)
      try {
        await updateProfile({
          full_name: formData.full_name.trim(),
          profession: formData.profession.trim() || null
        } as any)
        
        toast({
          title: 'Welcome to NaijaLancers! 🎉',
          description: 'Your profile is set up. Start exploring!'
        })
        
        onOpenChange(false)
        onComplete?.()
      } catch (error) {
        toast({
          title: 'Error',
          description: 'Failed to save profile',
          variant: 'destructive'
        })
      } finally {
        setLoading(false)
      }
    }
  }

  const handleSkip = async () => {
    // Just close - no need to update profile for skip
    onOpenChange(false)
    onComplete?.()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 overflow-hidden">
        {/* Progress Bar */}
        <Progress value={(step / totalSteps) * 100} className="h-1 rounded-none" />
        
        {/* Skip Button */}
        <button
          onClick={handleSkip}
          className="absolute right-4 top-4 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="p-6 pt-4">
          {/* Logo */}
          <div className="flex justify-center mb-6">
            <Logo />
          </div>

          {/* Step 1: Name */}
          {step === 1 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
              <div className="text-center">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <User className="h-8 w-8 text-primary" />
                </div>
                <h2 className="text-2xl font-bold text-foreground">What's your name?</h2>
                <p className="text-muted-foreground mt-2">Let's personalize your experience</p>
              </div>
              
              <BrandInput
                placeholder="Enter your full name"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                className="text-center text-lg py-6"
                autoFocus
              />
            </div>
          )}

          {/* Step 2: Profession */}
          {step === 2 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
              <div className="text-center">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Briefcase className="h-8 w-8 text-primary" />
                </div>
                <h2 className="text-2xl font-bold text-foreground">What do you do?</h2>
                <p className="text-muted-foreground mt-2">Help others find you</p>
              </div>
              
              <BrandInput
                placeholder="e.g., Web Developer, Graphic Designer"
                value={formData.profession}
                onChange={(e) => setFormData({ ...formData, profession: e.target.value })}
                className="text-center text-lg py-6"
                autoFocus
              />
              
              {/* Quick suggestions */}
              <div className="flex flex-wrap gap-2 justify-center">
                {['Graphic Designer', 'Web Developer', 'Writer', 'Virtual Assistant', 'Video Editor'].map((prof) => (
                  <button
                    key={prof}
                    onClick={() => setFormData({ ...formData, profession: prof })}
                    className={`px-3 py-1.5 rounded-full text-sm transition-all ${
                      formData.profession === prof
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground hover:bg-accent'
                    }`}
                  >
                    {prof}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 mt-8">
            {step > 1 && (
              <Button 
                variant="outline" 
                onClick={() => setStep(step - 1)}
                className="flex-1"
              >
                Back
              </Button>
            )}
            {step === 1 && (
              <Button 
                variant="ghost" 
                onClick={handleSkip}
                className="flex-1"
              >
                Skip for now
              </Button>
            )}
            <Button 
              onClick={handleNext}
              disabled={loading}
              className="flex-1"
            >
              {loading ? (
                <div className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full" />
              ) : step < totalSteps ? (
                <>
                  Continue
                  <ArrowRight className="h-4 w-4 ml-2" />
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Get Started
                </>
              )}
            </Button>
          </div>

          {/* Step indicator */}
          <div className="flex justify-center gap-2 mt-6">
            {Array.from({ length: totalSteps }).map((_, idx) => (
              <div
                key={idx}
                className={`w-2 h-2 rounded-full transition-colors ${
                  idx + 1 <= step ? 'bg-primary' : 'bg-muted'
                }`}
              />
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}