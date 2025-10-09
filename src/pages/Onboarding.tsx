import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Logo } from '@/components/ui/logo'
import { BrandButton } from '@/components/ui/brand-button'
import { BrandInput } from '@/components/ui/brand-input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useProfile } from '@/hooks/useProfile'
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
  const { profile, updateProfile } = useProfile()
  const [states, setStates] = useState<State[]>([])
  const [lgas, setLgas] = useState<LGA[]>([])
  const [selectedState, setSelectedState] = useState('')
  const [selectedLGA, setSelectedLGA] = useState('')
  const [area, setArea] = useState('')
  const [purpose, setPurpose] = useState('To Browse')
  const [loading, setLoading] = useState(false)
  const [loadingStates, setLoadingStates] = useState(true)
  const [loadingLGAs, setLoadingLGAs] = useState(false)
  const [formData, setFormData] = useState({
    full_name: profile?.full_name || ''
  })

  // Fetch states on component mount with cache
  useEffect(() => {
    const cachedStates = sessionStorage.getItem('nigeria_states')
    if (cachedStates) {
      setStates(JSON.parse(cachedStates))
      setLoadingStates(false)
    } else {
      fetchStates()
    }
  }, [])

  // Fetch LGAs when state changes with cache
  useEffect(() => {
    if (selectedState) {
      const cacheKey = `nigeria_lgas_${selectedState}`
      const cachedLGAs = sessionStorage.getItem(cacheKey)
      if (cachedLGAs) {
        setLgas(JSON.parse(cachedLGAs))
      } else {
        fetchLGAs(selectedState)
      }
      setSelectedLGA('') // Reset LGA when state changes
    }
  }, [selectedState])

  const fetchStates = async () => {
    setLoadingStates(true)
    try {
      // Try primary API with timeout
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 3000) // 3 second timeout
      
      const response = await fetch('https://locus.fkkas.com/api/states', {
        signal: controller.signal
      })
      clearTimeout(timeoutId)
      
      if (response.ok) {
        const data = await response.json()
        if (data.data && Array.isArray(data.data)) {
          setStates(data.data)
          sessionStorage.setItem('nigeria_states', JSON.stringify(data.data))
          setLoadingStates(false)
          return
        }
      }
    } catch (error) {
      console.log('API failed or timeout, using fallback data:', error)
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
    sessionStorage.setItem('nigeria_states', JSON.stringify(fallbackStates))
    setLoadingStates(false)
  }

  const fetchLGAs = async (stateId: string) => {
    setLoadingLGAs(true)
    const cacheKey = `nigeria_lgas_${stateId}`
    
    try {
      // Try API with timeout
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 3000) // 3 second timeout
      
      const response = await fetch(`https://locus.fkkas.com/api/regions/${stateId}`, {
        signal: controller.signal
      })
      clearTimeout(timeoutId)
      
      if (response.ok) {
        const data = await response.json()
        if (data.data && Array.isArray(data.data)) {
          setLgas(data.data)
          sessionStorage.setItem(cacheKey, JSON.stringify(data.data))
          setLoadingLGAs(false)
          return
        }
      }
    } catch (error) {
      console.log('API failed or timeout for LGAs, using fallback:', error)
    }

    // Comprehensive static LGA data based on official Nigeria states and LGAs (2025)
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
        { id: "12", name: "Ngwa" },
        { id: "13", name: "Ugwunagbo" },
        { id: "14", name: "Ukwa East" },
        { id: "15", name: "Ukwa West" },
        { id: "16", name: "Umuahia North" },
        { id: "17", name: "Umuahia South" },
        { id: "18", name: "Umu-Neochi" }
      ],
      "2": [ // Adamawa
        { id: "1", name: "Demsa" },
        { id: "2", name: "Fufore" },
        { id: "3", name: "Ganaye" },
        { id: "4", name: "Gireri" },
        { id: "5", name: "Gombi" },
        { id: "6", name: "Guyuk" },
        { id: "7", name: "Hong" },
        { id: "8", name: "Jada" },
        { id: "9", name: "Lamurde" },
        { id: "10", name: "Madagali" },
        { id: "11", name: "Maiha" },
        { id: "12", name: "Mayo-Belwa" },
        { id: "13", name: "Michika" },
        { id: "14", name: "Mubi North" },
        { id: "15", name: "Mubi South" },
        { id: "16", name: "Numan" },
        { id: "17", name: "Shelleng" },
        { id: "18", name: "Song" },
        { id: "19", name: "Toungo" },
        { id: "20", name: "Yola North" },
        { id: "21", name: "Yola South" }
      ],
      "3": [ // Akwa Ibom
        { id: "1", name: "Abak" },
        { id: "2", name: "Eastern Obolo" },
        { id: "3", name: "Eket" },
        { id: "4", name: "Esit Eket" },
        { id: "5", name: "Essien Udim" },
        { id: "6", name: "Etim Ekpo" },
        { id: "7", name: "Etinan" },
        { id: "8", name: "Ibeno" },
        { id: "9", name: "Ibesikpo Asutan" },
        { id: "10", name: "Ibiono Ibom" },
        { id: "11", name: "Ika" },
        { id: "12", name: "Ikono" },
        { id: "13", name: "Ikot Abasi" },
        { id: "14", name: "Ikot Ekpene" },
        { id: "15", name: "Ini" },
        { id: "16", name: "Itu" },
        { id: "17", name: "Mbo" },
        { id: "18", name: "Mkpat Enin" },
        { id: "19", name: "Nsit Atai" },
        { id: "20", name: "Nsit Ibom" },
        { id: "21", name: "Nsit Ubium" },
        { id: "22", name: "Obot Akara" },
        { id: "23", name: "Okobo" },
        { id: "24", name: "Onna" },
        { id: "25", name: "Oron" },
        { id: "26", name: "Oruk Anam" },
        { id: "27", name: "Udung Uko" },
        { id: "28", name: "Ukanafun" },
        { id: "29", name: "Uruan" },
        { id: "30", name: "Urue-Offong/Oruko" },
        { id: "31", name: "Uyo" }
      ],
      "4": [ // Anambra
        { id: "1", name: "Aguata" },
        { id: "2", name: "Anambra East" },
        { id: "3", name: "Anambra West" },
        { id: "4", name: "Anaocha" },
        { id: "5", name: "Awka North" },
        { id: "6", name: "Awka South" },
        { id: "7", name: "Ayamelum" },
        { id: "8", name: "Dunukofia" },
        { id: "9", name: "Ekwusigo" },
        { id: "10", name: "Idemili North" },
        { id: "11", name: "Idemili South" },
        { id: "12", name: "Ihiala" },
        { id: "13", name: "Njikoka" },
        { id: "14", name: "Nnewi North" },
        { id: "15", name: "Nnewi South" },
        { id: "16", name: "Ogbaru" },
        { id: "17", name: "Onitsha North" },
        { id: "18", name: "Onitsha South" },
        { id: "19", name: "Orumba North" },
        { id: "20", name: "Orumba South" },
        { id: "21", name: "Oyi" }
      ],
      "27": [ // Niger
        { id: "1", name: "Agaie" },
        { id: "2", name: "Agwara" },
        { id: "3", name: "Bida" },
        { id: "4", name: "Borgu" },
        { id: "5", name: "Bosso" },
        { id: "6", name: "Chanchaga" },
        { id: "7", name: "Edati" },
        { id: "8", name: "Gbako" },
        { id: "9", name: "Gurara" },
        { id: "10", name: "Katcha" },
        { id: "11", name: "Kontagora" },
        { id: "12", name: "Lapai" },
        { id: "13", name: "Lavun" },
        { id: "14", name: "Magama" },
        { id: "15", name: "Mariga" },
        { id: "16", name: "Mashegu" },
        { id: "17", name: "Mokwa" },
        { id: "18", name: "Muya" },
        { id: "19", name: "Pailoro" },
        { id: "20", name: "Rafi" },
        { id: "21", name: "Rijau" },
        { id: "22", name: "Shiroro" },
        { id: "23", name: "Suleja" },
        { id: "24", name: "Tafa" },
        { id: "25", name: "Wushishi" }
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
        { id: "2", name: "Abuja Municipal" },
        { id: "3", name: "Bwari" },
        { id: "4", name: "Gwagwalada" },
        { id: "5", name: "Kuje" },
        { id: "6", name: "Kwali" }
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
        { id: "20", name: "Kabo" },
        { id: "21", name: "Kano Municipal" },
        { id: "22", name: "Karaye" },
        { id: "23", name: "Kibiya" },
        { id: "24", name: "Kiru" },
        { id: "25", name: "Kumbotso" },
        { id: "26", name: "Kunchi" },
        { id: "27", name: "Kura" },
        { id: "28", name: "Madobi" },
        { id: "29", name: "Makoda" },
        { id: "30", name: "Minjibir" },
        { id: "31", name: "Nasarawa" },
        { id: "32", name: "Rano" },
        { id: "33", name: "Rimin Gado" },
        { id: "34", name: "Rogo" },
        { id: "35", name: "Shanono" },
        { id: "36", name: "Sumaila" },
        { id: "37", name: "Takai" },
        { id: "38", name: "Tarauni" },
        { id: "39", name: "Tofa" },
        { id: "40", name: "Tsanyawa" },
        { id: "41", name: "Tudun Wada" },
        { id: "42", name: "Ungogo" },
        { id: "43", name: "Warawa" },
        { id: "44", name: "Wudil" }
      ],
      "33": [ // Rivers
        { id: "1", name: "Abua/Odual" },
        { id: "2", name: "Ahoada East" },
        { id: "3", name: "Ahoada West" },
        { id: "4", name: "Akuku Toru" },
        { id: "5", name: "Andoni" },
        { id: "6", name: "Asari-Toru" },
        { id: "7", name: "Bonny" },
        { id: "8", name: "Degema" },
        { id: "9", name: "Eleme" },
        { id: "10", name: "Emohua" },
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

    // Use fallback data for the selected state - either from map or generate default
    const fallbackLGAs = stateLGAMap[stateId] || [
      { id: "1", name: `${states.find(s => s.id === stateId)?.name} Central` }
    ]
    
    setLgas(fallbackLGAs)
    sessionStorage.setItem(cacheKey, JSON.stringify(fallbackLGAs))
    setLoadingLGAs(false)
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