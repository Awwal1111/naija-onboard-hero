import React from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { BrandButton } from '@/components/ui/brand-button'
import { AlertCircle, User } from 'lucide-react'
import { Link } from 'react-router-dom'

interface ProfileCompletionDialogProps {
  isOpen: boolean
  missingFields: string[]
}

const ProfileCompletionDialog: React.FC<ProfileCompletionDialogProps> = ({
  isOpen,
  missingFields
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <AlertCircle className="h-6 w-6 text-orange-500" />
            Complete Your Profile
          </DialogTitle>
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

          <p className="text-xs text-center text-text-secondary">
            You'll be able to use all features once your profile is complete
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default ProfileCompletionDialog
