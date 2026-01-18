import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Logo } from '@/components/ui/logo'
import { BrandButton } from '@/components/ui/brand-button'
import { BrandInput } from '@/components/ui/brand-input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { useProfile } from '@/hooks/useProfile'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/use-toast'
import { useNigerianStates } from '@/hooks/useNigerianStates'
import { useMiniPayContext } from '@/components/MiniPayAuthWrapper'
import { 
  User, 
  MapPin, 
  Briefcase, 
  Target, 
  CheckCircle2, 
  ArrowRight, 
  Sparkles,
  Award,
  DollarSign,
  Users,
  BookOpen,
  Globe,
  Search,
  Bot,
  UserCheck,
  ChevronLeft
} from 'lucide-react'

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

type AccountType = 'freelancer' | 'client'
type UserGoal = 'freelancer' | 'exploring' | 'hire'

const Onboarding = () => {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { user } = useAuth()
  const { profile, updateProfile } = useProfile()
  const { states, lgas, loadingStates, loadingLGAs, fetchLGAs } = useNigerianStates()
  const { isMiniPay, userId: miniPayUserId, refreshUserState } = useMiniPayContext()
  
  const [currentStep, setCurrentStep] = useState(1)
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
    goal: '' as UserGoal | ''
  })

  const totalSteps = 3
  const progress = (currentStep / totalSteps) * 100
  const effectiveUserId = isMiniPay ? miniPayUserId : user?.id
  const isNigeria = formData.country === 'Nigeria'

  // Update form data when profile loads
  useEffect(() => {
    if (profile) {
      setFormData(prev => ({
        ...prev,
        full_name: profile.full_name || '',
        profession: profile.profession || '',
        country: (profile as any).country || '',
        state: (profile as any).state || (profile as any).state_name || '',
        lga: (profile as any).lga || (profile as any).lga_name || '',
        city: (profile as any).city || ''
      }))
    }
  }, [profile])

  // Fetch LGAs when state changes (Nigeria only)
  useEffect(() => {
    if (isNigeria && formData.state) {
      fetchLGAs(formData.state)
    }
  }, [formData.state, isNigeria])

  // Auto-set remote for non-Nigeria
  useEffect(() => {
    if (formData.country && formData.country !== 'Nigeria') {
      setFormData(prev => ({ ...prev, remote: true, state: '', lga: '' }))
    } else if (formData.country === 'Nigeria') {
      setFormData(prev => ({ ...prev, remote: false, city: '' }))
    }
  }, [formData.country])

  const handleNext = () => {
    // Validation per step
    if (currentStep === 1) {
      if (!formData.full_name.trim()) {
        toast({ title: 'Please enter your name', variant: 'destructive' })
        return
      }
      if (formData.account_type === 'freelancer' && !formData.profession.trim()) {
        toast({ title: 'Please enter your profession', variant: 'destructive' })
        return
      }
    }

    if (currentStep === 2) {
      if (!formData.country) {
        toast({ title: 'Please select your country', variant: 'destructive' })
        return
      }
      if (isNigeria && !formData.state) {
        toast({ title: 'Please select your state', variant: 'destructive' })
        return
      }
    }

    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handleGoalSelect = async (goal: UserGoal) => {
    setFormData(prev => ({ ...prev, goal }))
    
    if (goal === 'exploring') {
      // Just exploring - mark as completed, let them browse
      toast({
        title: 'Welcome! 👋',
        description: 'Feel free to explore. You can update your profile anytime.'
      })
      navigate('/feed')
      return
    }

    if (goal === 'hire') {
      // Client flow - save and redirect to AI assistant
      setLoading(true)
      try {
        await updateProfile({
          full_name: formData.full_name.trim(),
          profession: formData.profession.trim() || null,
          country: formData.country,
          state_name: isNigeria ? formData.state : null,
          lga_name: isNigeria ? formData.lga : null,
          city: !isNigeria ? formData.city : null,
          remote_work: formData.remote,
          account_type: 'client',
          onboarding_completed: true
        } as any)

        if (isMiniPay) {
          await refreshUserState()
        }

        toast({
          title: "Let's find you the perfect freelancer! 🤖",
          description: "Our AI will help match you with the right talent."
        })

        navigate('/ai-hire')
      } catch (error) {
        toast({ title: 'Error saving profile', variant: 'destructive' })
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
        state_name: isNigeria ? formData.state : null,
        lga_name: isNigeria ? formData.lga : null,
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

      navigate('/feed')
    } catch (error) {
      toast({ title: 'Error saving profile', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleSkip = () => {
    navigate('/feed')
  }

  const steps = [
    { number: 1, title: 'About You', icon: User },
    { number: 2, title: 'Location', icon: MapPin },
    { number: 3, title: 'Your Goal', icon: Target }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 flex flex-col">
      {/* Header */}
      <nav className="flex items-center justify-between p-4 sm:p-6">
        <Link to="/" className="hover-scale">
          <Logo />
        </Link>
        <button
          onClick={handleSkip}
          className="text-sm text-muted-foreground hover:text-primary transition-colors"
        >
          Skip for now
        </button>
      </nav>

      {/* Progress Bar */}
      <div className="px-4 sm:px-6 max-w-2xl mx-auto w-full">
        <div className="space-y-3">
          <Progress value={progress} className="h-2" />
          <div className="flex justify-between items-center">
            {steps.map((step) => (
              <div
                key={step.number}
                className={`flex items-center gap-2 ${
                  currentStep >= step.number ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                <div
                  className={`flex items-center justify-center w-8 h-8 rounded-full border-2 transition-all ${
                    currentStep >= step.number
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border bg-background'
                  }`}
                >
                  {currentStep > step.number ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    <step.icon className="h-4 w-4" />
                  )}
                </div>
                <span className="text-xs sm:text-sm font-medium hidden sm:block">
                  {step.title}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 py-8">
        <div className="w-full max-w-2xl">
          <div className="bg-card border border-border rounded-2xl shadow-lg p-6 sm:p-8 space-y-8 animate-fade-in">
            
            {/* Step 1: About You */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div className="text-center space-y-2">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-4">
                    <Sparkles className="h-8 w-8 text-primary" />
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
                    Welcome to NaijaLancers! 🎉
                  </h1>
                  <p className="text-muted-foreground max-w-md mx-auto">
                    Let's personalize your experience
                  </p>
                </div>

                <div className="space-y-4">
                  {/* Full Name */}
                  <div>
                    <label className="block text-sm font-medium mb-2">Full Name *</label>
                    <BrandInput
                      value={formData.full_name}
                      onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                      placeholder="Enter your full name"
                      required
                    />
                  </div>

                  {/* Account Type */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">I am a...</label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => setFormData(prev => ({ ...prev, account_type: 'freelancer' }))}
                        className={`p-4 rounded-xl border-2 transition-all text-left ${
                          formData.account_type === 'freelancer'
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:border-primary/50'
                        }`}
                      >
                        <Briefcase className={`h-6 w-6 mb-2 ${formData.account_type === 'freelancer' ? 'text-primary' : 'text-muted-foreground'}`} />
                        <p className="font-medium">Freelancer</p>
                        <p className="text-xs text-muted-foreground">I offer services</p>
                      </button>
                      <button
                        onClick={() => setFormData(prev => ({ ...prev, account_type: 'client' }))}
                        className={`p-4 rounded-xl border-2 transition-all text-left ${
                          formData.account_type === 'client'
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:border-primary/50'
                        }`}
                      >
                        <UserCheck className={`h-6 w-6 mb-2 ${formData.account_type === 'client' ? 'text-primary' : 'text-muted-foreground'}`} />
                        <p className="font-medium">Client</p>
                        <p className="text-xs text-muted-foreground">I hire talent</p>
                      </button>
                    </div>
                  </div>

                  {/* Profession (for freelancers) */}
                  {formData.account_type === 'freelancer' && (
                    <div className="space-y-2">
                      <label className="block text-sm font-medium">Your Profession *</label>
                      <BrandInput
                        value={formData.profession}
                        onChange={(e) => setFormData(prev => ({ ...prev, profession: e.target.value }))}
                        placeholder="e.g., Web Developer, Designer"
                      />
                      <div className="flex flex-wrap gap-2">
                        {['Graphic Designer', 'Web Developer', 'Writer', 'Virtual Assistant', 'Video Editor'].map((prof) => (
                          <button
                            key={prof}
                            onClick={() => setFormData(prev => ({ ...prev, profession: prof }))}
                            className={`px-3 py-1.5 rounded-full text-xs transition-all ${
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
              </div>
            )}

            {/* Step 2: Location - GLOBAL READY */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div className="text-center space-y-2">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-4">
                    <MapPin className="h-8 w-8 text-primary" />
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
                    Your Location
                  </h1>
                  <p className="text-muted-foreground max-w-md mx-auto">
                    Connect with opportunities locally & globally
                  </p>
                </div>

                <div className="space-y-4">
                  {/* Country Selection */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-2">
                      <Globe className="h-4 w-4" />
                      Country *
                    </label>
                    <Select
                      value={formData.country}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, country: value }))}
                    >
                      <SelectTrigger className="w-full h-12 bg-input">
                        <SelectValue placeholder="Select your country" />
                      </SelectTrigger>
                      <SelectContent className="bg-background border border-border z-50 max-h-[300px]">
                        {COUNTRIES.map((country) => (
                          <SelectItem key={country} value={country} className="hover:bg-accent">
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
                          onValueChange={(value) => setFormData(prev => ({ ...prev, state: value, lga: '' }))}
                          disabled={loadingStates}
                        >
                          <SelectTrigger className="w-full h-12 bg-input">
                            <SelectValue placeholder={loadingStates ? "Loading states..." : "Select your state"} />
                          </SelectTrigger>
                          <SelectContent className="bg-background border border-border z-50 max-h-[300px]">
                            {states.map((state) => (
                              <SelectItem key={state.id} value={state.name} className="hover:bg-accent">
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
                            onValueChange={(value) => setFormData(prev => ({ ...prev, lga: value }))}
                            disabled={loadingLGAs}
                          >
                            <SelectTrigger className="w-full h-12 bg-input">
                              <SelectValue placeholder={loadingLGAs ? "Loading LGAs..." : "Select LGA (optional)"} />
                            </SelectTrigger>
                            <SelectContent className="bg-background border border-border z-50 max-h-[300px]">
                              {lgas.map((lga) => (
                                <SelectItem key={lga.id} value={lga.name} className="hover:bg-accent">
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
                        onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                      />
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Globe className="h-3 w-3" />
                        You'll be shown remote opportunities globally
                      </p>
                    </div>
                  )}

                  <div className="p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <div className="flex gap-3">
                      <MapPin className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-blue-800 dark:text-blue-300">
                        <strong>Privacy:</strong> Your location helps us show relevant opportunities. We never share your exact address.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Goal Selection */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <div className="text-center space-y-2">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-4">
                    <Target className="h-8 w-8 text-primary" />
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
                    What brings you here?
                  </h1>
                  <p className="text-muted-foreground max-w-md mx-auto">
                    Select your primary goal
                  </p>
                </div>

                <div className="space-y-3">
                  {/* Freelancer Option */}
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
                          I'm a Freelancer
                          <Badge variant="secondary" className="text-xs">Recommended</Badge>
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Find clients, showcase skills, and earn money
                        </p>
                      </div>
                      <ArrowRight className="h-5 w-5 text-primary opacity-0 group-hover:opacity-100 transition-opacity mt-2" />
                    </div>
                  </button>

                  {/* Hire Option */}
                  <button
                    onClick={() => handleGoalSelect('hire')}
                    disabled={loading}
                    className="w-full p-4 rounded-xl border-2 border-border hover:border-primary/50 transition-all text-left group"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center shrink-0">
                        <Bot className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-foreground flex items-center gap-2">
                          I Want to Hire
                          <Badge variant="outline" className="text-xs border-purple-300 text-purple-600">AI-Powered</Badge>
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Let our AI match you with perfect freelancers
                        </p>
                      </div>
                      <ArrowRight className="h-5 w-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity mt-2" />
                    </div>
                  </button>

                  {/* Just Browsing */}
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
                        <p className="font-semibold text-foreground">Just Browsing</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Explore the platform first
                        </p>
                      </div>
                      <ArrowRight className="h-5 w-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity mt-2" />
                    </div>
                  </button>
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex items-center justify-between pt-4 border-t border-border">
              {currentStep > 1 ? (
                <BrandButton
                  variant="outline"
                  onClick={handleBack}
                  disabled={loading}
                >
                  <ChevronLeft className="h-4 w-4 mr-2" />
                  Back
                </BrandButton>
              ) : (
                <div />
              )}

              {currentStep < totalSteps && (
                <BrandButton onClick={handleNext} disabled={loading}>
                  Continue
                  <ArrowRight className="h-4 w-4 ml-2" />
                </BrandButton>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Onboarding
