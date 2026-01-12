import { ReactNode, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useMiniPayContext } from '@/components/MiniPayAuthWrapper'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { BrandButton } from '@/components/ui/brand-button'
import { Wallet, UserCircle, CheckCircle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

interface MiniPayProtectedActionProps {
  children: ReactNode
  actionName?: string
  onActionBlocked?: () => void
}

/**
 * Wraps protected actions that require authentication.
 * In MiniPay environment: 
 *   - If registered: Allows action (no dialog)
 *   - If not registered: Shows registration dialog
 * Outside MiniPay: Redirects to login page
 */
export const MiniPayProtectedAction = ({ 
  children, 
  actionName = 'this action',
  onActionBlocked 
}: MiniPayProtectedActionProps) => {
  const { user } = useAuth()
  const { isMiniPay, walletAddress, isRegistered, userProfile } = useMiniPayContext()
  const navigate = useNavigate()
  const [showDialog, setShowDialog] = useState(false)

  const handleProtectedClick = (e: React.MouseEvent) => {
    // User is authenticated via Supabase OR is a registered MiniPay user
    if (user || (isMiniPay && isRegistered)) {
      // Allow the action to proceed
      return
    }

    e.preventDefault()
    e.stopPropagation()

    if (isMiniPay && walletAddress) {
      // In MiniPay with wallet but not registered: Show sign-up dialog
      setShowDialog(true)
    } else {
      // Outside MiniPay: Redirect to login
      navigate('/login')
    }

    onActionBlocked?.()
  }

  const handleSignIn = () => {
    setShowDialog(false)
    navigate('/login')
  }

  const handleSignUp = () => {
    setShowDialog(false)
    // Pass wallet address to signup for linking
    navigate('/signup', { state: { miniPayWallet: walletAddress } })
  }

  return (
    <>
      <div onClick={handleProtectedClick}>
        {children}
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="w-[90vw] max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCircle className="h-5 w-5 text-primary" />
              Complete Registration
            </DialogTitle>
            <DialogDescription>
              To {actionName}, please complete your registration. Your wallet is already connected!
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-4">
            {walletAddress && (
              <div className="p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-2 text-sm">
                  <Wallet className="h-4 w-4 text-primary" />
                  <span className="text-muted-foreground">Connected wallet:</span>
                  <CheckCircle className="h-4 w-4 text-green-500 ml-auto" />
                </div>
                <p className="font-mono text-xs mt-1 truncate">{walletAddress}</p>
              </div>
            )}

            <div className="grid gap-3">
              <BrandButton onClick={handleSignUp} className="w-full">
                Complete Registration
              </BrandButton>
              <BrandButton onClick={handleSignIn} variant="outline" className="w-full">
                Already have an account? Sign In
              </BrandButton>
            </div>

            <p className="text-xs text-center text-muted-foreground">
              Your MiniPay wallet will be automatically linked to your account for instant deposits.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
