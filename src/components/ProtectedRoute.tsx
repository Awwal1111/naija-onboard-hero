import { useAuth } from '@/hooks/useAuth'
import { Navigate } from 'react-router-dom'
import { useMiniPay } from '@/hooks/useMiniPay'

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
  const { isMiniPay } = useMiniPay()

  // Show loading while auth is being determined
  if (loading) {
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
  if (isMiniPay && allowMiniPayBrowsing && !user && !session) {
    return <>{children}</>
  }

  // Only redirect if we're sure there's no valid session
  if (!user && !session) {
    return <Navigate to={redirectTo} replace />
  }

  return <>{children}</>
}