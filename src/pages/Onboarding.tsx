import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Logo } from '@/components/ui/logo'
import { BrandButton } from '@/components/ui/brand-button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

// Nigerian states and their LGAs (sample data)
const nigerianStates = {
  "Lagos": ["Agege", "Ajeromi-Ifelodun", "Alimosho", "Amuwo-Odofin", "Apapa", "Badagry"],
  "Abuja": ["Abaji", "Bwari", "Gwagwalada", "Kuje", "Kwali", "Municipal Area Council"],
  "Rivers": ["Abua/Odual", "Ahoada East", "Ahoada West", "Akuku-Toru", "Andoni", "Asari-Toru"],
  "Kano": ["Ajingi", "Albasu", "Bagwai", "Bebeji", "Bichi", "Bunkure"]
}

const Onboarding = () => {
  const navigate = useNavigate()
  const [selectedState, setSelectedState] = useState('')
  const [selectedLGA, setSelectedLGA] = useState('')
  const [purpose, setPurpose] = useState('To Browse')

  const handleNext = () => {
    if (!selectedState || !selectedLGA) {
      alert('Please select both state and LGA')
      return
    }
    
    // Handle onboarding completion
    console.log('Onboarding data:', {
      state: selectedState,
      lga: selectedLGA,
      purpose
    })
    
    // Navigate to main app/dashboard
    alert('Onboarding completed! Welcome to NaijaLancers!')
  }

  const purposes = [
    { value: 'To Earn', label: 'To Earn', description: 'For freelancers' },
    { value: 'To Browse', label: 'To Browse', description: 'For clients looking to hire' },
    { value: 'To be an Expert', label: 'To be an Expert', description: 'For seasoned professionals' },
    { value: 'To Look for Jobs', label: 'To Look for Jobs', description: 'For job seekers' }
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

          <div className="space-y-8">
            {/* Location Section */}
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-text-primary">State</label>
                <Select value={selectedState} onValueChange={setSelectedState}>
                  <SelectTrigger className="w-full h-10 bg-input">
                    <SelectValue placeholder="Select your state" />
                  </SelectTrigger>
                  <SelectContent className="bg-background border border-border z-50">
                    {Object.keys(nigerianStates).map((state) => (
                      <SelectItem key={state} value={state} className="hover:bg-accent">
                        {state}
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
                    {selectedState && nigerianStates[selectedState as keyof typeof nigerianStates]?.map((lga) => (
                      <SelectItem key={lga} value={lga} className="hover:bg-accent">
                        {lga}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
              disabled={!selectedState || !selectedLGA}
            >
              Next
            </BrandButton>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Onboarding