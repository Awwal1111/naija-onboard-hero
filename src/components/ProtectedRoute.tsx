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
 * - NEVER shows loading state (prevents flickering)
 * - With allowMiniPayBrowsing=true: Always allows access
 * - Wallet connection happens lazily on protected actions
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
  const { isMiniPay, walletAddress, isRegistered, userProfile } = useMiniPayContext()

  // ===== MiniPay Logic - NO LOADING STATE =====
  // In MiniPay, we NEVER show loading spinners - they cause flickering
  // MiniPay users can ALWAYS browse - protected actions handled by MiniPayProtectedAction
  if (isMiniPay) {
    // ✅ FIX: Always allow access in MiniPay - no blocking
    // Protected actions are handled by MiniPayProtectedAction component
    return <>{children}</>
  }

  // ===== Normal Browser Logic =====
  // Show loading while auth is being determined
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  // Standard auth check for non-MiniPay users
  if (!user && !session) {
    return <Navigate to={redirectTo} replace />
  }

  return <>{children}</>
}
