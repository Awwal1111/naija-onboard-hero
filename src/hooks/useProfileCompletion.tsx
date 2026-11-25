import { useState, useEffect } from 'react'
import { useProfile } from './useProfile'
import { useLocation } from 'react-router-dom'

interface ProfileCompletionStatus {
  isComplete: boolean
  missingFields: string[]
}

export const useProfileCompletion = () => {
  const { profile, loading } = useProfile()
  const location = useLocation()
  const [completionStatus, setCompletionStatus] = useState<ProfileCompletionStatus>({
    isComplete: true,
    missingFields: []
  })
  const [shouldShowDialog, setShouldShowDialog] = useState(false)

  useEffect(() => {
    if (loading) return
    if (!profile) {
      setCompletionStatus({ isComplete: false, missingFields: ['Profile'] })
      setShouldShowDialog(false)
      return
    }

    const missingFields: string[] = []
    const hasValue = (value?: string | null) => Boolean(value && value.trim())

    if (!hasValue(profile.full_name)) missingFields.push('Full Name')
    if (!hasValue(profile.phone_number)) missingFields.push('Phone Number')

    // Clients do not need a freelancer profession or portfolio bio to hire.
    const isClient = profile.account_type === 'client'
    if (!isClient && !hasValue(profile.profession)) missingFields.push('Profession')
    if (!isClient && !hasValue(profile.bio)) missingFields.push('Bio')

    // LGA is optional in onboarding; only Nigerian accounts require a state.
    const country = String(profile.country_code || profile.country || '').trim().toLowerCase()
    const isNigeria = country === 'nigeria' || country === 'ng' || country === 'nga'
    if (isNigeria && !hasValue(profile.state_name)) missingFields.push('State')

    const isComplete = missingFields.length === 0
    setCompletionStatus({ isComplete, missingFields })

    const excludedPaths = ['/profile', '/settings', '/onboarding', '/setup-pin']
    setShouldShowDialog(!isComplete && !excludedPaths.some(path => location.pathname.startsWith(path)))
  }, [profile, loading, location.pathname])

  return { ...completionStatus, shouldShowDialog, loading }
}
