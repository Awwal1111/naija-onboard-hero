import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { BrandButton } from '@/components/ui/brand-button'
import { AlertCircle, User, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'

interface ProfileCompletionDialogProps {
  isOpen: boolean
  missingFields: string[]
  onDismiss?: () => void
}

const ProfileCompletionDialog: React.FC<ProfileCompletionDialogProps> = ({
  isOpen,
  missingFields,
  onDismiss
}) => {
  const [dismissed, setDismissed] = useState(false)
  const [dismissCount, setDismissCount] = useState(0)
  
  // Reset dismissed state when dialog should show again
  useEffect(() => {
    if (isOpen && !dismissed) {
      // Check if user dismissed recently (within this session)
      const sessionDismissed = sessionStorage.getItem('profileDialogDismissed')
      if (sessionDismissed) {
        setDismissed(true)
      }
    }
  }, [isOpen])

  const handleDismiss = () => {
    setDismissed(true)
    setDismissCount(prev => prev + 1)
    sessionStorage.setItem('profileDialogDismissed', 'true')
    onDismiss?.()
  }

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      handleDismiss()
    }
  }

  // Don't show if dismissed this session
  if (dismissed) {
    return null
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <AlertCircle className="h-6 w-6 text-orange-500" />
            Complete Your Profile
          </DialogTitle>
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-4 top-4 h-6 w-6"
            onClick={handleDismiss}
          >
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="flex items-center justify-center">
            <div className="h-24 w-24 rounded-full bg-muted flex items-center justify-center">
              <User className="h-12 w-12 text-text-secondary" />
            </div>
          </div>

          <div className="text-center space-y-2">
            <h3 className="font-semibold text-lg text-text-primary">
              Your profile is incomplete
            </h3>
            <p className="text-sm text-text-secondary">
              Please complete your profile to continue using NaijaLancers
            </p>
          </div>

          <div className="bg-muted rounded-lg p-4 space-y-2">
            <p className="text-sm font-medium text-text-primary">Missing information:</p>
            <ul className="space-y-1">
              {missingFields.map((field) => (
                <li key={field} className="text-sm text-text-secondary flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                  {field}
                </li>
              ))}
            </ul>
          </div>

          <Link to="/profile?edit=true" className="block">
            <BrandButton className="w-full" size="lg">
              Edit My Profile
            </BrandButton>
          </Link>

          <div className="flex flex-col gap-2">
            <p className="text-xs text-center text-text-secondary">
              Complete your profile for the best experience
            </p>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDismiss}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Remind me later
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default ProfileCompletionDialog
