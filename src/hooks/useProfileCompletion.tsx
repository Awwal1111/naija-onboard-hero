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
    if (!loading && profile) {
      checkProfileCompletion()
    }
  }, [profile, loading, location.pathname])

  const checkProfileCompletion = () => {
    if (!profile) return

    const missingFields: string[] = []
    
    // Check required fields
    if (!profile.full_name || profile.full_name.trim() === '') {
      missingFields.push('Full Name')
    }
    
    if (!profile.profession || profile.profession.trim() === '') {
      missingFields.push('Profession')
    }
    
    if (!profile.phone_number || profile.phone_number.trim() === '') {
      missingFields.push('Phone Number')
    }
    
    if (!profile.bio || profile.bio.trim() === '') {
      missingFields.push('Bio')
    }

    // Check location fields
    if (!profile.state_name || profile.state_name.trim() === '') {
      missingFields.push('State')
    }
    
    if (!profile.lga_name || profile.lga_name.trim() === '') {
      missingFields.push('Local Government Area')
    }

    const isComplete = missingFields.length === 0
    
    setCompletionStatus({
      isComplete,
      missingFields
    })

    // Show dialog only if profile is incomplete and not on profile/settings pages
    const excludedPaths = ['/profile', '/settings', '/onboarding', '/setup-pin']
    const shouldShow = !isComplete && !excludedPaths.some(path => location.pathname.startsWith(path))
    
    setShouldShowDialog(shouldShow)
  }

  return {
    ...completionStatus,
    shouldShowDialog,
    loading
  }
}
