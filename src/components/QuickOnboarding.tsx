import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { BrandInput } from '@/components/ui/brand-input'
import { Progress } from '@/components/ui/progress'
import { Logo } from '@/components/ui/logo'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  User, 
  ArrowRight, 
  Briefcase, 
  MapPin,
  Target,
  Sparkles,
  X,
  Search,
  UserCheck,
  Bot,
  Globe,
  ChevronLeft
} from 'lucide-react'
import { useProfile } from '@/hooks/useProfile'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/use-toast'
import { useNigerianStates } from '@/hooks/useNigerianStates'
import { useMiniPayContext } from '@/components/MiniPayAuthWrapper'

// Popular countries list
const COUNTRIES = [
  'Nigeria',
  'United States',
  'United Kingdom',
  'Canada',
  'Ghana',
  'Kenya',
  'South Africa',
  'India',
  'Germany',
  'France',
  'Australia',
  'United Arab Emirates',
  'Saudi Arabia',
  'Netherlands',
  'Singapore',
  'Other'
]

interface QuickOnboardingProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onComplete?: () => void
}

type AccountType = 'freelancer' | 'client' | 'both'
type UserGoal = 'freelancer' | 'exploring' | 'hire'

export const QuickOnboarding: React.FC<QuickOnboardingProps> = ({ 
  open, 
  onOpenChange,
  onComplete 
}) => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { profile, updateProfile } = useProfile()
  const { toast } = useToast()
  const { isMiniPay, userId: miniPayUserId, refreshUserState } = useMiniPayContext()
  const { states, lgas, loadingStates, loadingLGAs, fetchLGAs } = useNigerianStates()
  
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  
  const [formData, setFormData] = useState({
    full_name: '',
    account_type: 'freelancer' as AccountType,
    profession: '',
    country: '',
    state: '',
    lga: '',
    city: '',
    remote: false,
    goal: 'freelancer' as UserGoal
  })

  const totalSteps = 3
  const effectiveUserId = isMiniPay ? miniPayUserId : user?.id

  // Pre-fill from existing profile
  useEffect(() => {
    if (profile) {
      setFormData(prev => ({
        ...prev,
        full_name: profile.full_name || '',
        profession: profile.profession || '',
        country: (profile as any).country || '',
        state: (profile as any).state || '',
        lga: (profile as any).lga || '',
        city: (profile as any).city || ''
      }))
    }
  }, [profile])

  // Fetch LGAs when state changes (Nigeria only)
  useEffect(() => {
    if (formData.country === 'Nigeria' && formData.state) {
      fetchLGAs(formData.state)
    }
  }, [formData.state, formData.country])

  // Auto-set remote for non-Nigeria
  useEffect(() => {
    if (formData.country && formData.country !== 'Nigeria') {
      setFormData(prev => ({ ...prev, remote: true, state: '', lga: '' }))
    } else if (formData.country === 'Nigeria') {
      setFormData(prev => ({ ...prev, remote: false, city: '' }))
    }
  }, [formData.country])

  const isNigeria = formData.country === 'Nigeria'

  const handleNext = async () => {
    // Validation per step
    if (step === 1) {
      if (!formData.full_name.trim()) {
        toast({ title: 'Please enter your name', variant: 'destructive' })
        return
      }
      if (formData.account_type === 'freelancer' && !formData.profession.trim()) {
        toast({ title: 'Please select your profession', variant: 'destructive' })
        return
      }
    }

    if (step === 2) {
      if (!formData.country) {
        toast({ title: 'Please select your country', variant: 'destructive' })
        return
      }
      if (isNigeria && !formData.state) {
        toast({ title: 'Please select your state', variant: 'destructive' })
        return
      }
    }

    if (step < totalSteps) {
      setStep(step + 1)
    }
  }

  const handleGoalSelect = async (goal: UserGoal) => {
    setFormData(prev => ({ ...prev, goal }))
    
    if (goal === 'exploring') {
      // Just exploring - no onboarding completion, just close and browse
      toast({
        title: 'Welcome! 👋',
        description: 'Feel free to explore. You can complete setup anytime.'
      })
      onOpenChange(false)
      onComplete?.()
      return
    }

    if (goal === 'hire') {
      // Client flow - save temporary state and redirect to AI assistant
      setLoading(true)
      try {
        await updateProfile({
          full_name: formData.full_name.trim(),
          profession: formData.profession.trim() || null,
          country: formData.country,
          state: isNigeria ? formData.state : null,
          lga: isNigeria ? formData.lga : null,
          city: !isNigeria ? formData.city : null,
          remote_work: formData.remote,
          account_type: 'client',
          onboarding_completed: false // NOT completed yet - needs AI flow
        } as any)

        if (isMiniPay) {
          await refreshUserState()
        }

        toast({
          title: "Let's find you the perfect freelancer! 🤖",
          description: "Our AI will help match you with the right talent."
        })

        onOpenChange(false)
        // Navigate to AI hiring assistant
        navigate('/ai-hire')
      } catch (error) {
        toast({
          title: 'Error',
          description: 'Failed to save profile',
          variant: 'destructive'
        })
      } finally {
        setLoading(false)
      }
      return
    }

    // Freelancer flow - complete onboarding
    setLoading(true)
    try {
      await updateProfile({
        full_name: formData.full_name.trim(),
        profession: formData.profession.trim() || null,
        country: formData.country,
        state: isNigeria ? formData.state : null,
        lga: isNigeria ? formData.lga : null,
        city: !isNigeria ? formData.city : null,
        remote_work: formData.remote,
        account_type: 'freelancer',
        onboarding_completed: true
      } as any)

      if (isMiniPay) {
        await refreshUserState()
      }

      toast({
        title: 'Welcome to NaijaLancers! 🎉',
        description: "You're all set. Start finding opportunities!"
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

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1)
    }
  }

  const handleSkip = () => {
    onOpenChange(false)
    onComplete?.()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 overflow-hidden max-h-[90vh] overflow-y-auto">
        {/* Progress Bar */}
        <Progress value={(step / totalSteps) * 100} className="h-1 rounded-none" />
        
        {/* Skip Button */}
        <button
          onClick={handleSkip}
          className="absolute right-4 top-4 text-muted-foreground hover:text-foreground transition-colors z-10"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="p-6 pt-4">
          {/* Logo */}
          <div className="flex justify-center mb-4">
            <Logo />
          </div>

          {/* STEP 1: About You */}
          {step === 1 && (
            <div className="space-y-5 animate-in fade-in slide-in-from-right-4">
              <div className="text-center">
                <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                  <User className="h-7 w-7 text-primary" />
                </div>
                <h2 className="text-xl font-bold text-foreground">About You</h2>
                <p className="text-muted-foreground text-sm mt-1">Let's personalize your experience</p>
              </div>
              
              {/* Full Name */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Full Name *</label>
                <BrandInput
                  placeholder="Enter your full name"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="text-base"
                />
              </div>

              {/* Account Type */}
              <div className="space-y-2">
                <label className="text-sm font-medium">I am a...</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setFormData({ ...formData, account_type: 'freelancer' })}
                    className={`p-3 rounded-xl border-2 transition-all text-left ${
                      formData.account_type === 'freelancer'
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <Briefcase className={`h-5 w-5 mb-1 ${formData.account_type === 'freelancer' ? 'text-primary' : 'text-muted-foreground'}`} />
                    <p className="font-medium text-sm">Freelancer</p>
                    <p className="text-xs text-muted-foreground">I offer services</p>
                  </button>
                  <button
                    onClick={() => setFormData({ ...formData, account_type: 'client' })}
                    className={`p-3 rounded-xl border-2 transition-all text-left ${
                      formData.account_type === 'client'
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <UserCheck className={`h-5 w-5 mb-1 ${formData.account_type === 'client' ? 'text-primary' : 'text-muted-foreground'}`} />
                    <p className="font-medium text-sm">Client</p>
                    <p className="text-xs text-muted-foreground">I hire talent</p>
                  </button>
                </div>
              </div>

              {/* Profession (only for freelancers) */}
              {formData.account_type === 'freelancer' && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Your Profession *</label>
                  <BrandInput
                    placeholder="e.g., Web Developer, Designer"
                    value={formData.profession}
                    onChange={(e) => setFormData({ ...formData, profession: e.target.value })}
                  />
                  <div className="flex flex-wrap gap-2">
                    {['Graphic Designer', 'Web Developer', 'Writer', 'Virtual Assistant', 'Video Editor'].map((prof) => (
                      <button
                        key={prof}
                        onClick={() => setFormData({ ...formData, profession: prof })}
                        className={`px-2.5 py-1 rounded-full text-xs transition-all ${
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
            </div>
          )}

          {/* STEP 2: Location */}
          {step === 2 && (
            <div className="space-y-5 animate-in fade-in slide-in-from-right-4">
              <div className="text-center">
                <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                  <MapPin className="h-7 w-7 text-primary" />
                </div>
                <h2 className="text-xl font-bold text-foreground">Your Location</h2>
                <p className="text-muted-foreground text-sm mt-1">Help us connect you locally & globally</p>
              </div>

              {/* Country */}
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  Country *
                </label>
                <Select
                  value={formData.country}
                  onValueChange={(value) => setFormData({ ...formData, country: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select your country" />
                  </SelectTrigger>
                  <SelectContent>
                    {COUNTRIES.map((country) => (
                      <SelectItem key={country} value={country}>
                        {country === 'Nigeria' ? '🇳🇬 ' : ''}{country}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Nigeria-specific: State & LGA */}
              {isNigeria && (
                <>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">State *</label>
                    <Select
                      value={formData.state}
                      onValueChange={(value) => setFormData({ ...formData, state: value, lga: '' })}
                      disabled={loadingStates}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={loadingStates ? "Loading states..." : "Select state"} />
                      </SelectTrigger>
                      <SelectContent>
                        {states.map((state) => (
                          <SelectItem key={state.id} value={state.name}>
                            {state.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {formData.state && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Local Government (LGA)</label>
                      <Select
                        value={formData.lga}
                        onValueChange={(value) => setFormData({ ...formData, lga: value })}
                        disabled={loadingLGAs}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={loadingLGAs ? "Loading LGAs..." : "Select LGA (optional)"} />
                        </SelectTrigger>
                        <SelectContent>
                          {lgas.map((lga) => (
                            <SelectItem key={lga.id} value={lga.name}>
                              {lga.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </>
              )}

              {/* Non-Nigeria: City only */}
              {formData.country && !isNigeria && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">City (Optional)</label>
                  <BrandInput
                    placeholder="e.g., New York, London"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Globe className="h-3 w-3" />
                    You'll be shown remote opportunities globally
                  </p>
                </div>
              )}
            </div>
          )}

          {/* STEP 3: Your Goal */}
          {step === 3 && (
            <div className="space-y-5 animate-in fade-in slide-in-from-right-4">
              <div className="text-center">
                <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Target className="h-7 w-7 text-primary" />
                </div>
                <h2 className="text-xl font-bold text-foreground">Your Goal</h2>
                <p className="text-muted-foreground text-sm mt-1">What brings you here today?</p>
              </div>

              <div className="space-y-3">
                {/* Freelancer Option (Default) */}
                <button
                  onClick={() => handleGoalSelect('freelancer')}
                  disabled={loading}
                  className="w-full p-4 rounded-xl border-2 border-primary bg-primary/5 hover:bg-primary/10 transition-all text-left group"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center shrink-0">
                      <Briefcase className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-foreground flex items-center gap-2">
                        I am a Freelancer
                        <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full">Recommended</span>
                      </p>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        Find jobs, offer services & earn money
                      </p>
                    </div>
                    <ArrowRight className="h-5 w-5 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </button>

                {/* Exploring Option */}
                <button
                  onClick={() => handleGoalSelect('exploring')}
                  disabled={loading}
                  className="w-full p-4 rounded-xl border-2 border-border hover:border-primary/50 transition-all text-left group"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center shrink-0">
                      <Search className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-foreground">I'm just Exploring</p>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        Browse freely, no setup required
                      </p>
                    </div>
                    <ArrowRight className="h-5 w-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </button>

                {/* Hire Freelancers Option */}
                <button
                  onClick={() => handleGoalSelect('hire')}
                  disabled={loading}
                  className="w-full p-4 rounded-xl border-2 border-border hover:border-primary/50 transition-all text-left group"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-blue-500/10 rounded-full flex items-center justify-center shrink-0">
                      <Bot className="h-5 w-5 text-blue-500" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-foreground">I want to Hire Freelancers</p>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        AI will guide you to find the right talent
                      </p>
                    </div>
                    <ArrowRight className="h-5 w-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </button>
              </div>

              {loading && (
                <div className="flex items-center justify-center gap-2 text-muted-foreground">
                  <div className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full" />
                  <span className="text-sm">Setting up your account...</span>
                </div>
              )}
            </div>
          )}

          {/* Navigation Actions (Steps 1-2 only) */}
          {step < 3 && (
            <div className="flex gap-3 mt-6">
              {step > 1 && (
                <Button 
                  variant="outline" 
                  onClick={handleBack}
                  className="flex-1"
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
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
                className="flex-1"
              >
                Continue
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          )}

          {/* Step indicator */}
          <div className="flex justify-center gap-2 mt-5">
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
