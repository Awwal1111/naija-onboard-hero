import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Logo } from '@/components/ui/logo'
import { BrandButton } from '@/components/ui/brand-button'
import { BrandInput } from '@/components/ui/brand-input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useProfile } from '@/hooks/useProfile'
import { useToast } from '@/hooks/use-toast'
import { useNigerianStates } from '@/hooks/useNigerianStates'

const Onboarding = () => {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { profile, updateProfile } = useProfile()
  const { states, lgas, loadingStates, loadingLGAs, fetchLGAs } = useNigerianStates()
  const [selectedState, setSelectedState] = useState('')
  const [selectedLGA, setSelectedLGA] = useState('')
  const [area, setArea] = useState('')
  const [purpose, setPurpose] = useState('To Browse')
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    full_name: profile?.full_name || ''
  })

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

  const purposes = [
    { value: 'To Browse', label: 'To Browse', description: 'For clients looking to hire' },
    { value: 'To Earn', label: 'To Earn', description: 'For freelancers' },
    { value: 'To Hire', label: 'To Hire', description: 'For businesses looking to recruit' },
    { value: 'To Learn', label: 'To Learn', description: 'For skill development' }
  ]

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Navigation */}
      <nav className="flex items-center justify-between p-6">
        <Link to="/">
          <Logo />
        </Link>
      </nav>

      {/* Onboarding Form */}
      <div className="flex-1 flex items-center justify-center px-6">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-text-primary">Tell us about yourself</h1>
          </div>

          <div className="space-y-6">
            <BrandInput
              label="Full Name"
              value={formData.full_name}
              onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
              placeholder="Enter your full name"
              required
            />
            
            {/* Location Section */}
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-text-primary">State</label>
                <Select value={selectedState} onValueChange={setSelectedState}>
                  <SelectTrigger className="w-full h-10 bg-input">
                    <SelectValue placeholder="Select your state" />
                  </SelectTrigger>
                  <SelectContent className="bg-background border border-border z-50">
                    {states.map((state) => (
                      <SelectItem key={state.id} value={state.id} className="hover:bg-accent">
                        {state.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-text-primary">Local Government Area (LGA)</label>
                <Select 
                  value={selectedLGA} 
                  onValueChange={setSelectedLGA}
                  disabled={!selectedState}
                >
                  <SelectTrigger className="w-full h-10 bg-input">
                    <SelectValue placeholder="Select your LGA" />
                  </SelectTrigger>
                  <SelectContent className="bg-background border border-border z-50">
                    {lgas.map((lga) => (
                      <SelectItem key={lga.id} value={lga.name} className="hover:bg-accent">
                        {lga.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <BrandInput
                  label="Area"
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                  placeholder="Enter your specific area/location"
                  required
                />
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-border"></div>

            {/* Purpose Section */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-text-primary">Why are you here?</h2>
              
              <div className="space-y-3">
                {purposes.map((option) => (
                  <label
                    key={option.value}
                    className={`flex items-center space-x-3 p-4 rounded-lg border cursor-pointer transition-colors ${
                      purpose === option.value
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:bg-accent'
                    }`}
                  >
                    <input
                      type="radio"
                      name="purpose"
                      value={option.value}
                      checked={purpose === option.value}
                      onChange={(e) => setPurpose(e.target.value)}
                      className="w-4 h-4 text-primary border-border focus:ring-primary"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-text-primary">{option.label}</div>
                      <div className="text-sm text-text-secondary">{option.description}</div>
                    </div>
                    {purpose === option.value && (
                      <div className="text-primary font-bold">✓</div>
                    )}
                  </label>
                ))}
              </div>
            </div>

            <BrandButton 
              onClick={handleNext}
              className="w-full" 
              size="lg"
              disabled={!formData.full_name.trim() || !selectedState || !selectedLGA || !area.trim() || loading}
            >
              {loading ? 'Setting up...' : 'Complete Setup'}
            </BrandButton>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Onboarding