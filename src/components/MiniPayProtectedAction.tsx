import { ReactNode, useState, cloneElement, isValidElement } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useMiniPayContext } from '@/components/MiniPayAuthWrapper'
import { MiniPayProfileCompletion } from '@/components/MiniPayProfileCompletion'
import { useNavigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'

interface MiniPayProtectedActionProps {
  children: ReactNode
  actionName?: string
  onActionBlocked?: () => void
  /** Called when action is allowed to proceed */
  onActionAllowed?: () => void
}

/**
 * Wraps protected actions that require authentication.
 * 
 * In MiniPay environment:
 *   - LAZY: Wallet initialization happens on first protected action click
 *   - If user exists AND profile is complete: Allows action immediately
 *   - If user exists BUT profile incomplete: Shows profile completion dialog
 *   - After completion: Returns to original action (no redirect)
 * 
 * Outside MiniPay:
 *   - If authenticated: Allows action
 *   - If not authenticated: Redirects to login page
 * 
 * KEY PRINCIPLE: No login/signup screens in MiniPay - wallet = identity
 */
export const MiniPayProtectedAction = ({ 
  children, 
  actionName = 'this action',
  onActionBlocked,
  onActionAllowed
}: MiniPayProtectedActionProps) => {
  const { user } = useAuth()
  const { 
    isMiniPay, 
    isRegistered, 
    userProfile, 
    walletAddress,
    isInitializing,
    initializeWallet 
  } = useMiniPayContext()
  const navigate = useNavigate()
  const [showProfileCompletion, setShowProfileCompletion] = useState(false)
  const [pendingCallback, setPendingCallback] = useState<(() => void) | null>(null)
  const [isConnecting, setIsConnecting] = useState(false)

  const handleProtectedClick = async (e: React.MouseEvent, originalOnClick?: (e: React.MouseEvent) => void) => {
    // Case 1: Standard Supabase auth user (outside MiniPay or linked)
    if (user) {
      // Allow action - user is authenticated via Supabase
      originalOnClick?.(e)
      onActionAllowed?.()
      return
    }

    // Case 2: MiniPay environment
    if (isMiniPay) {
      e.preventDefault()
      e.stopPropagation()

      // If already connecting, ignore
      if (isConnecting || isInitializing) {
        return
      }

      // Check if we already have wallet initialized
      if (walletAddress && isRegistered && userProfile) {
        if (userProfile.profileCompleted) {
          // Profile is complete - allow action
          originalOnClick?.(e)
          onActionAllowed?.()
          return
        } else {
          // Profile incomplete - show completion dialog
          setPendingCallback(() => () => {
            originalOnClick?.(e)
            onActionAllowed?.()
          })
          setShowProfileCompletion(true)
          onActionBlocked?.()
          return
        }
      }

      // LAZY INITIALIZATION: Connect wallet now
      setIsConnecting(true)
      
      try {
        const success = await initializeWallet()
        
        if (success) {
          // After initialization, check user state
          // We need to re-check context after init (state may have updated)
          // For now, show profile completion if new user
          setPendingCallback(() => () => {
            originalOnClick?.(e)
            onActionAllowed?.()
          })
          setShowProfileCompletion(true)
        } else {
          // Wallet connection failed
          onActionBlocked?.()
        }
      } catch (error) {
        console.error('[MiniPayProtected] Init error:', error)
        onActionBlocked?.()
      } finally {
        setIsConnecting(false)
      }
      return
    }

    // Case 3: Outside MiniPay, not authenticated
    e.preventDefault()
    e.stopPropagation()
    navigate('/login')
    onActionBlocked?.()
  }

  const handleProfileComplete = () => {
    setShowProfileCompletion(false)
    // Execute the pending action after profile completion
    if (pendingCallback) {
      pendingCallback()
      setPendingCallback(null)
    }
  }

  // Clone children to intercept click events
  const wrappedChildren = isValidElement(children) 
    ? cloneElement(children as React.ReactElement<any>, {
        onClick: (e: React.MouseEvent) => {
          const originalOnClick = (children as React.ReactElement<any>).props.onClick
          handleProtectedClick(e, originalOnClick)
        },
        disabled: isConnecting || isInitializing || (children as React.ReactElement<any>).props.disabled
      })
    : (
        <div onClick={(e) => handleProtectedClick(e)}>
          {children}
        </div>
      )

  return (
    <>
      {isConnecting ? (
        <div className="relative inline-flex items-center">
          {wrappedChildren}
          <div className="absolute inset-0 bg-background/50 flex items-center justify-center rounded">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
          </div>
        </div>
      ) : (
        wrappedChildren
      )}

      <MiniPayProfileCompletion
        open={showProfileCompletion}
        onOpenChange={setShowProfileCompletion}
        onComplete={handleProfileComplete}
        actionName={actionName}
      />
    </>
  )
}