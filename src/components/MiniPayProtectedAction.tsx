import { ReactNode, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useMiniPay } from '@/hooks/useMiniPay'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { BrandButton } from '@/components/ui/brand-button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Wallet, UserCircle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

interface MiniPayProtectedActionProps {
  children: ReactNode
  actionName?: string
  onActionBlocked?: () => void
}

/**
 * Wraps protected actions that require authentication.
 * In MiniPay environment: Shows a minimal profile completion dialog
 * Outside MiniPay: Redirects to login page
 */
export const MiniPayProtectedAction = ({ 
  children, 
  actionName = 'this action',
  onActionBlocked 
}: MiniPayProtectedActionProps) => {
  const { user } = useAuth()
  const { isMiniPay, account } = useMiniPay()
  const navigate = useNavigate()
  const [showDialog, setShowDialog] = useState(false)

  const handleProtectedClick = (e: React.MouseEvent) => {
    if (user) return // User is authenticated, allow action

    e.preventDefault()
    e.stopPropagation()

    if (isMiniPay) {
      // In MiniPay: Show minimal sign-up dialog
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
    navigate('/signup')
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
              Sign In Required
            </DialogTitle>
            <DialogDescription>
              To {actionName}, please sign in or create an account.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-4">
            {account && (
              <div className="p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-2 text-sm">
                  <Wallet className="h-4 w-4 text-primary" />
                  <span className="text-muted-foreground">Connected wallet:</span>
                </div>
                <p className="font-mono text-xs mt-1 truncate">{account}</p>
              </div>
            )}

            <div className="grid gap-3">
              <BrandButton onClick={handleSignUp} className="w-full">
                Create Account
              </BrandButton>
              <BrandButton onClick={handleSignIn} variant="outline" className="w-full">
                Sign In
              </BrandButton>
            </div>

            <p className="text-xs text-center text-muted-foreground">
              Your wallet will be linked to your account for easy deposits.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
