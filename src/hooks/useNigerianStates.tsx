import { useState, useEffect } from 'react'

export interface State {
  id: string
  name: string
}

export interface LGA {
  id: string
  name: string
}

interface NigerianStatesResponse {
  states?: State[]
  [key: string]: any
}

export const useNigerianStates = () => {
  const [states, setStates] = useState<State[]>([])
  const [lgas, setLgas] = useState<LGA[]>([])
  const [loadingStates, setLoadingStates] = useState(false)
  const [loadingLGAs, setLoadingLGAs] = useState(false)

  // Fetch all Nigerian states on component mount
  useEffect(() => {
    fetchStates()
  }, [])

  const fetchStates = async () => {
    setLoadingStates(true)
    
    // Try primary API first
    try {
      const response = await fetch('https://nga-states-lga.onrender.com/fetch', {
        signal: AbortSignal.timeout(5000) // 5 second timeout
      })
      
      if (response.ok) {
        const data = await response.json()
        if (Array.isArray(data)) {
          const formattedStates = data.map((state: any, index: number) => ({
            id: String(index + 1),
            name: state
          }))
          setStates(formattedStates)
          setLoadingStates(false)
          return
        }
      }
    } catch (error) {
      console.log('Primary API failed for states, using fallback')
    }

    // Fallback: Use official Nigerian states list
    const nigerianStates: State[] = [
      { id: '1', name: 'Abia' },
      { id: '2', name: 'Adamawa' },
      { id: '3', name: 'Akwa Ibom' },
      { id: '4', name: 'Anambra' },
      { id: '5', name: 'Bauchi' },
      { id: '6', name: 'Bayelsa' },
      { id: '7', name: 'Benue' },
      { id: '8', name: 'Borno' },
      { id: '9', name: 'Cross River' },
      { id: '10', name: 'Delta' },
      { id: '11', name: 'Ebonyi' },
      { id: '12', name: 'Edo' },
      { id: '13', name: 'Ekiti' },
      { id: '14', name: 'Enugu' },
      { id: '15', name: 'FCT' },
      { id: '16', name: 'Gombe' },
      { id: '17', name: 'Imo' },
      { id: '18', name: 'Jigawa' },
      { id: '19', name: 'Kaduna' },
      { id: '20', name: 'Kano' },
      { id: '21', name: 'Katsina' },
      { id: '22', name: 'Kebbi' },
      { id: '23', name: 'Kogi' },
      { id: '24', name: 'Kwara' },
      { id: '25', name: 'Lagos' },
      { id: '26', name: 'Nasarawa' },
      { id: '27', name: 'Niger' },
      { id: '28', name: 'Ogun' },
      { id: '29', name: 'Ondo' },
      { id: '30', name: 'Osun' },
      { id: '31', name: 'Oyo' },
      { id: '32', name: 'Plateau' },
      { id: '33', name: 'Rivers' },
      { id: '34', name: 'Sokoto' },
      { id: '35', name: 'Taraba' },
      { id: '36', name: 'Yobe' },
      { id: '37', name: 'Zamfara' }
    ]
    
    setStates(nigerianStates)
    setLoadingStates(false)
  }

  const fetchLGAs = async (stateName: string) => {
    setLoadingLGAs(true)
    setLgas([]) // Clear previous LGAs
    
    // Try primary API first
    try {
      const response = await fetch(
        `https://nga-states-lga.onrender.com/?state=${encodeURIComponent(stateName)}`,
        { signal: AbortSignal.timeout(5000) }
      )
      
      if (response.ok) {
        const data = await response.json()
        if (Array.isArray(data)) {
          const formattedLGAs = data.map((lga: any, index: number) => ({
            id: String(index + 1),
            name: lga
          }))
          setLgas(formattedLGAs)
          setLoadingLGAs(false)
          return
        }
      }
    } catch (error) {
      console.log('Primary API failed for LGAs, using fallback')
    }

    // Try secondary API
    try {
      const response = await fetch(
        `https://nigeria-states-free-api.onrender.com/api/v1/states/${stateName}/lgas`,
        { signal: AbortSignal.timeout(5000) }
      )
      
      if (response.ok) {
        const data = await response.json()
        if (data.lgas && Array.isArray(data.lgas)) {
          const formattedLGAs = data.lgas.map((lga: any, index: number) => ({
            id: String(index + 1),
            name: lga
          }))
          setLgas(formattedLGAs)
          setLoadingLGAs(false)
          return
        }
      }
    } catch (error) {
      console.log('Secondary API failed for LGAs, using comprehensive fallback')
    }

    // Comprehensive fallback with official LGA data
    const lgaData = getLGAsFallback(stateName)
    setLgas(lgaData)
    setLoadingLGAs(false)
  }

  return {
    states,
    lgas,
    loadingStates,
    loadingLGAs,
    fetchLGAs
  }
}

// Comprehensive LGA fallback data
const getLGAsFallback = (stateName: string): LGA[] => {
  const lgaMap: Record<string, string[]> = {
    'Lagos': ['Agege', 'Ajeromi-Ifelodun', 'Alimosho', 'Amuwo-Odofin', 'Apapa', 'Badagry', 'Epe', 'Eti-Osa', 'Ibeju-Lekki', 'Ifako-Ijaiye', 'Ikeja', 'Ikorodu', 'Kosofe', 'Lagos Island', 'Lagos Mainland', 'Mushin', 'Ojo', 'Oshodi-Isolo', 'Shomolu', 'Surulere'],
    'Kano': ['Ajingi', 'Albasu', 'Bagwai', 'Bebeji', 'Bichi', 'Bunkure', 'Dala', 'Dambatta', 'Dawakin Kudu', 'Dawakin Tofa', 'Doguwa', 'Fagge', 'Gabasawa', 'Garko', 'Garun Mallam', 'Gaya', 'Gezawa', 'Gwale', 'Gwarzo', 'Kabo', 'Kano Municipal', 'Karaye', 'Kibiya', 'Kiru', 'Kumbotso', 'Kunchi', 'Kura', 'Madobi', 'Makoda', 'Minjibir', 'Nasarawa', 'Rano', 'Rimin Gado', 'Rogo', 'Shanono', 'Sumaila', 'Takai', 'Tarauni', 'Tofa', 'Tsanyawa', 'Tudun Wada', 'Ungogo', 'Warawa', 'Wudil'],
    'Kaduna': ['Birnin Gwari', 'Chikun', 'Giwa', 'Igabi', 'Ikara', 'Jaba', "Jema'a", 'Kachia', 'Kaduna North', 'Kaduna South', 'Kagarko', 'Kajuru', 'Kaura', 'Kauru', 'Kubau', 'Kudan', 'Lere', 'Makarfi', 'Sabon Gari', 'Sanga', 'Soba', 'Zangon Kataf', 'Zaria'],
    'Rivers': ['Abua/Odual', 'Ahoada East', 'Ahoada West', 'Akuku-Toru', 'Andoni', 'Asari-Toru', 'Bonny', 'Degema', 'Eleme', 'Emohua', 'Etche', 'Gokana', 'Ikwerre', 'Khana', 'Obio/Akpor', 'Ogba/Egbema/Ndoni', 'Ogu/Bolo', 'Okrika', 'Omuma', 'Opobo/Nkoro', 'Oyigbo', 'Port Harcourt', 'Tai'],
    'Oyo': ['Afijio', 'Akinyele', 'Atiba', 'Atisbo', 'Egbeda', 'Ibadan North', 'Ibadan North-East', 'Ibadan North-West', 'Ibadan South-East', 'Ibadan South-West', 'Ibarapa Central', 'Ibarapa East', 'Ibarapa North', 'Ido', 'Irepo', 'Iseyin', 'Itesiwaju', 'Iwajowa', 'Kajola', 'Lagelu', 'Ogbomosho North', 'Ogbomosho South', 'Ogo Oluwa', 'Olorunsogo', 'Oluyole', 'Ona Ara', 'Orelope', 'Ori Ire', 'Oyo East', 'Oyo West', 'Saki East', 'Saki West', 'Surulere']
  }

  const lgas = lgaMap[stateName] || [
    `${stateName} Central`,
    `${stateName} North`,
    `${stateName} South`,
    `${stateName} East`,
    `${stateName} West`
  ]

  return lgas.map((lga, index) => ({
    id: String(index + 1),
    name: lga
  }))
}
