import { useMemo } from 'react'
import { useProfile } from './useProfile'
import { useGeoLocation } from './useGeoLocation'

// Nigerian states list for detection
const NIGERIAN_STATES = [
  'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue', 'Borno',
  'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu', 'Abuja', 'FCT', 'Gombe', 'Imo',
  'Jigawa', 'Kaduna', 'Kano', 'Katsina', 'Kebbi', 'Kogi', 'Kwara', 'Lagos', 'Nasarawa',
  'Niger', 'Ogun', 'Ondo', 'Osun', 'Oyo', 'Plateau', 'Rivers', 'Sokoto', 'Taraba',
  'Yobe', 'Zamfara'
]

/**
 * Determine the user's country. Profile is authoritative; falls back to IP geolocation.
 */
export const useUserCountry = () => {
  const { profile, loading } = useProfile()
  const { geo, loading: geoLoading } = useGeoLocation()

  const isNigerian = useMemo(() => {
    if (profile?.state_name) {
      return NIGERIAN_STATES.some(state =>
        state.toLowerCase() === profile.state_name?.toLowerCase()
      )
    }
    if (geo?.countryCode) return geo.countryCode === 'NG'
    return false
  }, [profile, geo])

  const country = useMemo(() => {
    if (profile?.state_name && isNigerian) return 'Nigeria'
    if (geo?.countryName) return geo.countryName
    return profile ? 'International' : null
  }, [profile, geo, isNigerian])

  return {
    isNigerian,
    country,
    countryCode: geo?.countryCode || (isNigerian ? 'NG' : null),
    loading: loading || geoLoading,
    nigerianStates: NIGERIAN_STATES,
  }
}
