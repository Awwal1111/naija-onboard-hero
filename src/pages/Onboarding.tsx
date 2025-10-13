import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Logo } from '@/components/ui/logo'
import { BrandButton } from '@/components/ui/brand-button'
import { BrandInput } from '@/components/ui/brand-input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { useProfile } from '@/hooks/useProfile'
import { useToast } from '@/hooks/use-toast'
import { useNigerianStates } from '@/hooks/useNigerianStates'
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
  BookOpen
} from 'lucide-react'

const Onboarding = () => {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { profile, updateProfile } = useProfile()
  const { states, lgas, loadingStates, loadingLGAs, fetchLGAs } = useNigerianStates()
  const [currentStep, setCurrentStep] = useState(1)
  const [selectedState, setSelectedState] = useState('')
  const [selectedLGA, setSelectedLGA] = useState('')
  const [area, setArea] = useState('')
  const [purpose, setPurpose] = useState('')
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    full_name: profile?.full_name || '',
    profession: profile?.profession || ''
  })

  const totalSteps = 3
  const progress = (currentStep / totalSteps) * 100

  // Fetch LGAs when state changes
  useEffect(() => {
    if (selectedState) {
      const stateName = states.find(s => s.id === selectedState)?.name
      if (stateName) {
        fetchLGAs(stateName)
      }
      setSelectedLGA('') // Reset LGA when state changes
    }
  }, [selectedState, states])

  const handleNext = () => {
    if (!selectedState || !selectedLGA || !area.trim()) {
      toast({
        title: "Incomplete Information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      })
      return
    }
    
    setLoading(true)
    
    const selectedStateName = states.find(s => s.id === selectedState)?.name
    const selectedLGAName = lgas.find(l => l.name === selectedLGA)?.name
    
    // Handle onboarding completion
    console.log('Onboarding data:', {
      state: selectedState,
      lga: selectedLGA,
      area: area.trim(),
      purpose
    })
    
    setTimeout(() => {
      toast({
        title: "Welcome to NaijaLancers!",
        description: "Your profile has been set up successfully.",
      })
      
      // Update the user's profile with onboarding data
      updateProfile({
        full_name: formData.full_name || profile?.full_name,
        state_name: selectedStateName,
        lga_name: selectedLGAName,
        area: area.trim(),
        state_id: selectedState
      }).then(() => {
        navigate('/feed')
      })
    }, 1000)
  }

  const handleContinue = () => {
    if (currentStep === 1 && !formData.full_name.trim()) {
      toast({
        title: "Name Required",
        description: "Please enter your full name to continue.",
        variant: "destructive",
      })
      return
    }
    
    if (currentStep === 2 && (!selectedState || !selectedLGA || !area.trim())) {
      toast({
        title: "Location Required",
        description: "Please complete your location information.",
        variant: "destructive",
      })
      return
    }

    if (currentStep === 3 && !purpose) {
      toast({
        title: "Purpose Required",
        description: "Please select why you're joining NaijaLancers.",
        variant: "destructive",
      })
      return
    }

    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1)
    } else {
      handleNext()
    }
  }

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const purposes = [
    { 
      value: 'To Browse', 
      label: 'Browse & Explore', 
      description: 'Discover talent and opportunities',
      icon: Target,
      color: 'text-blue-500'
    },
    { 
      value: 'To Earn', 
      label: 'Earn Money', 
      description: 'Monetize your skills as a freelancer',
      icon: DollarSign,
      color: 'text-green-500'
    },
    { 
      value: 'To Hire', 
      label: 'Hire Talent', 
      description: 'Find skilled professionals for your projects',
      icon: Users,
      color: 'text-purple-500'
    },
    { 
      value: 'To Learn', 
      label: 'Learn & Grow', 
      description: 'Develop new skills and advance your career',
      icon: BookOpen,
      color: 'text-orange-500'
    }
  ]

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
          onClick={() => navigate('/feed')}
          className="text-sm text-text-secondary hover:text-primary transition-colors"
        >
          Skip for now
        </button>
      </nav>

      {/* Progress Bar */}
      <div className="px-4 sm:px-6 max-w-2xl mx-auto w-full">
        <div className="space-y-3">
          <Progress value={progress} className="h-2" />
          <div className="flex justify-between items-center">
            {steps.map((step, idx) => (
              <div
                key={step.number}
                className={`flex items-center gap-2 ${
                  currentStep >= step.number ? 'text-primary' : 'text-text-secondary'
                }`}
              >
                <div
                  className={`flex items-center justify-center w-8 h-8 rounded-full border-2 transition-all ${
                    currentStep >= step.number
                      ? 'border-primary bg-primary text-white'
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
            {/* Step 1: Personal Info */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div className="text-center space-y-2">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-4">
                    <Sparkles className="h-8 w-8 text-primary" />
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-text-primary">
                    Welcome to NaijaLancers! 🎉
                  </h1>
                  <p className="text-text-secondary max-w-md mx-auto">
                    Let's get you set up. Tell us a bit about yourself to personalize your experience.
                  </p>
                </div>

                <div className="space-y-4">
                  <BrandInput
                    label="Full Name"
                    value={formData.full_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                    placeholder="e.g., Chinedu Okafor"
                    required
                  />

                  <BrandInput
                    label="Profession (Optional)"
                    value={formData.profession}
                    onChange={(e) => setFormData(prev => ({ ...prev, profession: e.target.value }))}
                    placeholder="e.g., Graphic Designer, Developer, etc."
                  />

                  <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
                    <div className="flex gap-3">
                      <Award className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-text-primary">
                          Pro Tip
                        </p>
                        <p className="text-xs text-text-secondary">
                          Adding your profession helps us show you relevant opportunities and connect you with the right people.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Location */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div className="text-center space-y-2">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-4">
                    <MapPin className="h-8 w-8 text-primary" />
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-text-primary">
                    Where are you located?
                  </h1>
                  <p className="text-text-secondary max-w-md mx-auto">
                    We'll help you discover local opportunities and connect with professionals near you.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-text-primary">State *</label>
                    <Select value={selectedState} onValueChange={setSelectedState}>
                      <SelectTrigger className="w-full h-12 bg-input">
                        <SelectValue placeholder="Select your state" />
                      </SelectTrigger>
                      <SelectContent className="bg-background border border-border z-50 max-h-[300px]">
                        {states.map((state) => (
                          <SelectItem key={state.id} value={state.id} className="hover:bg-accent">
                            {state.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-text-primary">Local Government Area (LGA) *</label>
                    <Select 
                      value={selectedLGA} 
                      onValueChange={setSelectedLGA}
                      disabled={!selectedState}
                    >
                      <SelectTrigger className="w-full h-12 bg-input">
                        <SelectValue placeholder={!selectedState ? "Select state first" : "Select your LGA"} />
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

                  <BrandInput
                    label="Area/Street *"
                    value={area}
                    onChange={(e) => setArea(e.target.value)}
                    placeholder="e.g., Ikeja GRA, VI, Surulere"
                    required
                  />

                  <div className="p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <div className="flex gap-3">
                      <MapPin className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-blue-800 dark:text-blue-300">
                        <strong>Privacy:</strong> Your exact location is private. We only use this to show you relevant local opportunities.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Purpose */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <div className="text-center space-y-2">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-4">
                    <Target className="h-8 w-8 text-primary" />
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-text-primary">
                    What brings you here?
                  </h1>
                  <p className="text-text-secondary max-w-md mx-auto">
                    Select your primary goal so we can tailor your experience.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {purposes.map((option) => {
                    const Icon = option.icon
                    return (
                      <label
                        key={option.value}
                        className={`relative flex flex-col p-5 rounded-xl border-2 cursor-pointer transition-all hover:shadow-md ${
                          purpose === option.value
                            ? 'border-primary bg-primary/5 shadow-md'
                            : 'border-border hover:border-primary/50'
                        }`}
                      >
                        <input
                          type="radio"
                          name="purpose"
                          value={option.value}
                          checked={purpose === option.value}
                          onChange={(e) => setPurpose(e.target.value)}
                          className="sr-only"
                        />
                        <div className="flex items-start gap-3">
                          <div className={`p-2 rounded-lg bg-primary/10 ${option.color}`}>
                            <Icon className="h-6 w-6" />
                          </div>
                          <div className="flex-1">
                            <div className="font-semibold text-text-primary mb-1">
                              {option.label}
                            </div>
                            <div className="text-sm text-text-secondary">
                              {option.description}
                            </div>
                          </div>
                        </div>
                        {purpose === option.value && (
                          <div className="absolute top-3 right-3">
                            <CheckCircle2 className="h-5 w-5 text-primary" />
                          </div>
                        )}
                      </label>
                    )
                  })}
                </div>

                {purpose === 'To Earn' && (
                  <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border border-green-200 dark:border-green-800 rounded-lg">
                    <div className="flex gap-3">
                      <Award className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-green-800 dark:text-green-300">
                          💡 Become a Verified Expert
                        </p>
                        <p className="text-xs text-green-700 dark:text-green-400">
                          Want to stand out? Apply to become a verified expert after setup and unlock premium features!
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              {currentStep > 1 && (
                <BrandButton
                  variant="outline"
                  onClick={handleBack}
                  className="flex-1"
                  size="lg"
                >
                  Back
                </BrandButton>
              )}
              <BrandButton
                onClick={handleContinue}
                className="flex-1 group"
                size="lg"
                disabled={loading}
              >
                {loading ? (
                  'Setting up...'
                ) : currentStep === totalSteps ? (
                  <>
                    Complete Setup
                    <CheckCircle2 className="ml-2 h-4 w-4" />
                  </>
                ) : (
                  <>
                    Continue
                    <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </BrandButton>
            </div>
          </div>

          {/* Trust Indicators */}
          <div className="mt-8 text-center">
            <div className="flex items-center justify-center gap-6 text-xs text-text-secondary">
              <div className="flex items-center gap-1">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span>10,000+ Active Users</span>
              </div>
              <div className="flex items-center gap-1">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span>100% Secure</span>
              </div>
              <div className="flex items-center gap-1">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span>Free Forever</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Onboarding