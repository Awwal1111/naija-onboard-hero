import { useAuth } from '@/hooks/useAuth'
import { Navigate } from 'react-router-dom'
import { useMiniPayContext } from '@/components/MiniPayAuthWrapper'

interface ProtectedRouteProps {
  children: React.ReactNode
  redirectTo?: string
  /** If true, allows unauthenticated access in MiniPay environment (for browsing) */
  allowMiniPayBrowsing?: boolean
  /** If true, requires profile to be complete for MiniPay users */
  requireCompleteProfile?: boolean
}

/**
 * ProtectedRoute handles access control for routes.
 * 
 * MiniPay behavior:
 * - With allowMiniPayBrowsing=true: Allows browsing with just wallet
 * - With allowMiniPayBrowsing=false: Requires user to be registered
 * - In MiniPay, we NEVER redirect to login - wallet = identity
 * 
 * Normal browser behavior:
 * - Requires Supabase authentication
 * - Redirects to login if not authenticated
 */
export const ProtectedRoute = ({ 
  children, 
  redirectTo = '/login',
  allowMiniPayBrowsing = false,
  requireCompleteProfile = false
}: ProtectedRouteProps) => {
  const { user, loading, session } = useAuth()
  const { isMiniPay, walletAddress, isRegistered, userProfile, isInitializing } = useMiniPayContext()

  // Still initializing MiniPay - wait
  if (isMiniPay && isInitializing) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  // Show loading while auth is being determined (but not in MiniPay)
  if (loading && !isMiniPay) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  // ===== MiniPay Logic =====
  if (isMiniPay) {
    // In MiniPay with browsing allowed - just need wallet address
    if (allowMiniPayBrowsing && walletAddress) {
      return <>{children}</>
    }

    // MiniPay user is registered (has wallet-based account)
    if (isRegistered && walletAddress) {
      // Check if complete profile is required
      if (requireCompleteProfile && userProfile && !userProfile.profileCompleted) {
        // Redirect to a profile completion page or show inline prompt
        // For now, allow access - MiniPayProtectedAction handles this per-action
        return <>{children}</>
      }
      return <>{children}</>
    }

    // MiniPay but no wallet or not registered
    // For protected routes in MiniPay, we allow browsing but actions will be blocked
    if (allowMiniPayBrowsing) {
      return <>{children}</>
    }

    // Strict protected route in MiniPay without registration
    // This is unusual - redirect to feed where they can browse
    return <Navigate to="/feed" replace />
  }

  // ===== Normal Browser Logic =====
  // Standard auth check for non-MiniPay users
  if (!user && !session) {
    return <Navigate to={redirectTo} replace />
  }

  return <>{children}</>
}
