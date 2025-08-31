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
      // Try primary API first - locus.fkkas.com
      let response = await fetch('https://locus.fkkas.com/api/states')
      if (response.ok) {
        const data = await response.json()
        if (data.data && Array.isArray(data.data)) {
          setStates(data.data)
          return
        }
      }
    } catch (error) {
      console.log('Primary API failed, using fallback data:', error)
    }

    // Fallback to comprehensive static data
    const fallbackStates = [
      { id: "1", name: "Abia" },
      { id: "2", name: "Adamawa" },
      { id: "3", name: "Akwa Ibom" },
      { id: "4", name: "Anambra" },
      { id: "5", name: "Bauchi" },
      { id: "6", name: "Bayelsa" },
      { id: "7", name: "Benue" },
      { id: "8", name: "Borno" },
      { id: "9", name: "Cross River" },
      { id: "10", name: "Delta" },
      { id: "11", name: "Ebonyi" },
      { id: "12", name: "Edo" },
      { id: "13", name: "Ekiti" },
      { id: "14", name: "Enugu" },
      { id: "15", name: "Abuja" },
      { id: "16", name: "Gombe" },
      { id: "17", name: "Imo" },
      { id: "18", name: "Jigawa" },
      { id: "19", name: "Kaduna" },
      { id: "20", name: "Kano" },
      { id: "21", name: "Katsina" },
      { id: "22", name: "Kebbi" },
      { id: "23", name: "Kogi" },
      { id: "24", name: "Kwara" },
      { id: "25", name: "Lagos" },
      { id: "26", name: "Nasarawa" },
      { id: "27", name: "Niger" },
      { id: "28", name: "Ogun" },
      { id: "29", name: "Ondo" },
      { id: "30", name: "Osun" },
      { id: "31", name: "Oyo" },
      { id: "32", name: "Plateau" },
      { id: "33", name: "Rivers" },
      { id: "34", name: "Sokoto" },
      { id: "35", name: "Taraba" },
      { id: "36", name: "Yobe" },
      { id: "37", name: "Zamfara" }
    ]
    setStates(fallbackStates)
  }

  const fetchLGAs = async (stateId: string) => {
    try {
      // Try API first  
      let response = await fetch(`https://locus.fkkas.com/api/regions/${stateId}`)
      if (response.ok) {
        const data = await response.json()
        if (data.data && Array.isArray(data.data)) {
          setLgas(data.data)
          return
        }
      }
    } catch (error) {
      console.log('Primary API failed for LGAs, using fallback:', error)
    }

    // Comprehensive static LGA data based on state
    const stateLGAMap: Record<string, LGA[]> = {
      "1": [ // Abia
        { id: "1", name: "Aba North" },
        { id: "2", name: "Aba South" },
        { id: "3", name: "Arochukwu" },
        { id: "4", name: "Bende" },
        { id: "5", name: "Ikwuano" },
        { id: "6", name: "Isiala-Ngwa North" },
        { id: "7", name: "Isiala-Ngwa South" },
        { id: "8", name: "Isuikwato" },
        { id: "9", name: "Obi Nwa" },
        { id: "10", name: "Ohafia" },
        { id: "11", name: "Osisioma" },
        { id: "12", name: "Ugwunagbo" },
        { id: "13", name: "Ukwa East" },
        { id: "14", name: "Ukwa West" },
        { id: "15", name: "Umuahia North" },
        { id: "16", name: "Umuahia South" },
        { id: "17", name: "Umu-Neochi" }
      ],
      "25": [ // Lagos
        { id: "1", name: "Agege" },
        { id: "2", name: "Ajeromi-Ifelodun" },
        { id: "3", name: "Alimosho" },
        { id: "4", name: "Amuwo-Odofin" },
        { id: "5", name: "Apapa" },
        { id: "6", name: "Badagry" },
        { id: "7", name: "Epe" },
        { id: "8", name: "Eti Osa" },
        { id: "9", name: "Ibeju-Lekki" },
        { id: "10", name: "Ifako-Ijaiye" },
        { id: "11", name: "Ikeja" },
        { id: "12", name: "Ikorodu" },
        { id: "13", name: "Kosofe" },
        { id: "14", name: "Lagos Island" },
        { id: "15", name: "Lagos Mainland" },
        { id: "16", name: "Mushin" },
        { id: "17", name: "Ojo" },
        { id: "18", name: "Oshodi-Isolo" },
        { id: "19", name: "Shomolu" },
        { id: "20", name: "Surulere" }
      ],
      "15": [ // Abuja (FCT)
        { id: "1", name: "Abaji" },
        { id: "2", name: "Bwari" },
        { id: "3", name: "Gwagwalada" },
        { id: "4", name: "Kuje" },
        { id: "5", name: "Kwali" },
        { id: "6", name: "Municipal Area Council" }
      ],
      "20": [ // Kano
        { id: "1", name: "Ajingi" },
        { id: "2", name: "Albasu" },
        { id: "3", name: "Bagwai" },
        { id: "4", name: "Bebeji" },
        { id: "5", name: "Bichi" },
        { id: "6", name: "Bunkure" },
        { id: "7", name: "Dala" },
        { id: "8", name: "Dambatta" },
        { id: "9", name: "Dawakin Kudu" },
        { id: "10", name: "Dawakin Tofa" },
        { id: "11", name: "Doguwa" },
        { id: "12", name: "Fagge" },
        { id: "13", name: "Gabasawa" },
        { id: "14", name: "Garko" },
        { id: "15", name: "Garun Mallam" },
        { id: "16", name: "Gaya" },
        { id: "17", name: "Gezawa" },
        { id: "18", name: "Gwale" },
        { id: "19", name: "Gwarzo" },
        { id: "20", name: "Kabo" }
      ],
      "33": [ // Rivers
        { id: "1", name: "Abua/Odual" },
        { id: "2", name: "Ahoada East" },
        { id: "3", name: "Ahoada West" },
        { id: "4", name: "Akuku-Toru" },
        { id: "5", name: "Andoni" },
        { id: "6", name: "Asari-Toru" },
        { id: "7", name: "Bonny" },
        { id: "8", name: "Degema" },
        { id: "9", name: "Eleme" },
        { id: "10", name: "Emuoha" },
        { id: "11", name: "Etche" },
        { id: "12", name: "Gokana" },
        { id: "13", name: "Ikwerre" },
        { id: "14", name: "Khana" },
        { id: "15", name: "Obio/Akpor" },
        { id: "16", name: "Ogba/Egbema/Ndoni" },
        { id: "17", name: "Ogu/Bolo" },
        { id: "18", name: "Okrika" },
        { id: "19", name: "Omuma" },
        { id: "20", name: "Opobo/Nkoro" },
        { id: "21", name: "Oyigbo" },
        { id: "22", name: "Port Harcourt" },
        { id: "23", name: "Tai" }
      ]
    }

    // Use fallback data for the selected state
    const selectedStateName = states.find(s => s.id === stateId)?.name
    const fallbackLGAs = stateLGAMap[stateId] || [
      { id: "1", name: `${selectedStateName} Central` },
      { id: "2", name: `${selectedStateName} East` },
      { id: "3", name: `${selectedStateName} West` },
      { id: "4", name: `${selectedStateName} North` },
      { id: "5", name: `${selectedStateName} South` }
    ]
    
    setLgas(fallbackLGAs)
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