import { ReactNode, useState, cloneElement, isValidElement } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useMiniPayContext } from '@/components/MiniPayAuthWrapper'
import { MiniPayProfileCompletion } from '@/components/MiniPayProfileCompletion'
import { useNavigate } from 'react-router-dom'

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
  const { isMiniPay, isRegistered, userProfile, walletAddress } = useMiniPayContext()
  const navigate = useNavigate()
  const [showProfileCompletion, setShowProfileCompletion] = useState(false)
  const [pendingCallback, setPendingCallback] = useState<(() => void) | null>(null)

  const handleProtectedClick = (e: React.MouseEvent, originalOnClick?: (e: React.MouseEvent) => void) => {
    // Case 1: Standard Supabase auth user (outside MiniPay or linked)
    if (user) {
      // Allow action - user is authenticated via Supabase
      originalOnClick?.(e)
      onActionAllowed?.()
      return
    }

    // Case 2: MiniPay environment
    if (isMiniPay) {
      if (isRegistered && userProfile) {
        // User exists in our system (wallet-based)
        if (userProfile.profileCompleted) {
          // Profile is complete - allow action
          originalOnClick?.(e)
          onActionAllowed?.()
          return
        } else {
          // Profile incomplete - show completion dialog
          e.preventDefault()
          e.stopPropagation()
          
          // Store the callback to execute after profile completion
          setPendingCallback(() => () => {
            originalOnClick?.(e)
            onActionAllowed?.()
          })
          setShowProfileCompletion(true)
          onActionBlocked?.()
          return
        }
      } else if (walletAddress) {
        // Wallet connected but no user record (edge case - should auto-create)
        // Show profile completion to create the user properly
        e.preventDefault()
        e.stopPropagation()
        
        setPendingCallback(() => () => {
          originalOnClick?.(e)
          onActionAllowed?.()
        })
        setShowProfileCompletion(true)
        onActionBlocked?.()
        return
      } else {
        // No wallet connected in MiniPay - unusual state
        e.preventDefault()
        e.stopPropagation()
        onActionBlocked?.()
        return
      }
    }

    // Case 3: Outside MiniPay, not authenticated
    e.preventDefault()
    e.stopPropagation()
    navigate('/login')
    onActionBlocked?.()
  }

  const handleProfileComplete = () => {
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
        }
      })
    : (
        <div onClick={(e) => handleProtectedClick(e)}>
          {children}
        </div>
      )

  return (
    <>
      {wrappedChildren}

      <MiniPayProfileCompletion
        open={showProfileCompletion}
        onOpenChange={setShowProfileCompletion}
        onComplete={handleProfileComplete}
        actionName={actionName}
      />
    </>
  )
}
