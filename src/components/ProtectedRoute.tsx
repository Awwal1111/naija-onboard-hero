import { useAuth } from '@/hooks/useAuth'
import { Navigate } from 'react-router-dom'
import { useMiniPayContext } from '@/components/MiniPayAuthWrapper'

interface ProtectedRouteProps {
  children: React.ReactNode
  redirectTo?: string
  /** If true, allows unauthenticated access in MiniPay environment (for browsing) */
  allowMiniPayBrowsing?: boolean
}

export const ProtectedRoute = ({ 
  children, 
  redirectTo = '/login',
  allowMiniPayBrowsing = false 
}: ProtectedRouteProps) => {
  const { user, loading, session } = useAuth()
  const { isMiniPay, walletAddress, isRegistered } = useMiniPayContext()

  // Show loading while auth is being determined (but not in MiniPay browsing mode)
  if (loading && !(isMiniPay && allowMiniPayBrowsing)) {
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  // In MiniPay environment with browsing allowed, skip auth check
  // Allow browsing if they have a wallet address (even if not registered)
  if (isMiniPay && allowMiniPayBrowsing && walletAddress) {
    return <>{children}</>
  }

  // If MiniPay user is registered, allow access
  if (isMiniPay && isRegistered) {
    return <>{children}</>
  }

  // MiniPay user with wallet but not in a browsable route and not registered
  // Redirect to signup for protected actions
  if (isMiniPay && !allowMiniPayBrowsing && !isRegistered && walletAddress) {
    return <Navigate to="/signup" replace />
  }

  // Standard auth check for non-MiniPay users
  // Only redirect if we're sure there's no valid session
  if (!user && !session) {
    return <Navigate to={redirectTo} replace />
  }

  return <>{children}</>
}
