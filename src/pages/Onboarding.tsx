import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Logo } from '@/components/ui/logo'
import { BrandButton } from '@/components/ui/brand-button'
import { BrandInput } from '@/components/ui/brand-input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'

// Types for API responses
interface State {
  id: string
  name: string
}

interface LGA {
  id: string
  name: string
}

const Onboarding = () => {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [states, setStates] = useState<State[]>([])
  const [lgas, setLgas] = useState<LGA[]>([])
  const [selectedState, setSelectedState] = useState('')
  const [selectedLGA, setSelectedLGA] = useState('')
  const [area, setArea] = useState('')
  const [purpose, setPurpose] = useState('To Browse')
  const [loading, setLoading] = useState(false)

  // Fetch states on component mount
  useEffect(() => {
    fetchStates()
  }, [])

  // Fetch LGAs when state changes
  useEffect(() => {
    if (selectedState) {
      fetchLGAs(selectedState)
      setSelectedLGA('') // Reset LGA when state changes
    }
  }, [selectedState])

  const fetchStates = async () => {
    try {
      const response = await fetch('https://nigeria-api.com/api/v1/states')
      if (response.ok) {
        const data = await response.json()
        setStates(data.data || [])
      }
    } catch (error) {
      console.error('Error fetching states:', error)
      toast({
        title: "Error",
        description: "Failed to load states. Please try again.",
        variant: "destructive",
      })
    }
  }

  const fetchLGAs = async (stateId: string) => {
    try {
      const response = await fetch(`https://nigeria-api.com/api/v1/states/${stateId}/lgas`)
      if (response.ok) {
        const data = await response.json()
        setLgas(data.data || [])
      }
    } catch (error) {
      console.error('Error fetching LGAs:', error)
      toast({
        title: "Error", 
        description: "Failed to load LGAs. Please try again.",
        variant: "destructive",
      })
    }
  }

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
      navigate('/feed')
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
              disabled={!selectedState || !selectedLGA || !area.trim() || loading}
            >
              {loading ? 'Setting up...' : 'Next'}
            </BrandButton>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Onboarding