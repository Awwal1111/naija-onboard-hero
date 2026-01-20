import { useMemo } from 'react'
import { useProfile } from './useProfile'

// Nigerian states list for detection
const NIGERIAN_STATES = [
  'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue', 'Borno',
  'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu', 'Abuja', 'FCT', 'Gombe', 'Imo',
  'Jigawa', 'Kaduna', 'Kano', 'Katsina', 'Kebbi', 'Kogi', 'Kwara', 'Lagos', 'Nasarawa',
  'Niger', 'Ogun', 'Ondo', 'Osun', 'Oyo', 'Plateau', 'Rivers', 'Sokoto', 'Taraba',
  'Yobe', 'Zamfara'
]

/**
 * Hook to determine if the current user is Nigerian
 * Used to conditionally show Nigerian-specific UI elements
 */
export const useUserCountry = () => {
  const { profile, loading } = useProfile()

  const isNigerian = useMemo(() => {
    if (!profile) return false
    
    // Check if they have a Nigerian state set in their profile
    if (profile.state_name) {
      return NIGERIAN_STATES.some(state => 
        state.toLowerCase() === profile.state_name?.toLowerCase()
      )
    }

    // Default to false for international users (those with city but no state)
    return false
  }, [profile])

  const country = useMemo(() => {
    if (!profile) return null
    return isNigerian ? 'Nigeria' : 'International'
  }, [profile, isNigerian])

  return {
    isNigerian,
    country,
    loading,
    nigerianStates: NIGERIAN_STATES
  }
}
