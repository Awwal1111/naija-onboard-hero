import { useAuth } from '@/hooks/useAuth'
import { Navigate } from 'react-router-dom'
import { detectMiniPaySync } from '@/lib/minipay'

// SYNC detection at module load
const isMiniPayEnv = detectMiniPaySync().isMiniPay

interface ProtectedRouteProps {
  children: React.ReactNode
  redirectTo?: string
}

/**
 * ProtectedRoute - Standard Supabase Auth protection
 * 
 * CRITICAL for MiniPay:
 * - Uses wrapper + internal pattern to avoid hook calls before MiniPay check
 * - Shows simple loading state in MiniPay to prevent re-render cascades
 */
export const ProtectedRoute = ({ 
  children, 
  redirectTo = '/login'
}: ProtectedRouteProps) => {
  // In MiniPay, use simplified loading/auth check to prevent re-renders
  if (isMiniPayEnv) {
    return <ProtectedRouteMiniPay redirectTo={redirectTo}>{children}</ProtectedRouteMiniPay>
  }
  
  return <ProtectedRouteStandard redirectTo={redirectTo}>{children}</ProtectedRouteStandard>
}

// Standard route protection for non-MiniPay
const ProtectedRouteStandard = ({ 
  children, 
  redirectTo = '/login'
}: ProtectedRouteProps) => {
  const { user, loading, session } = useAuth()

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

  // Require authentication
  if (!user && !session) {
    return <Navigate to={redirectTo} replace />
  }

  return <>{children}</>
}

// Simplified route protection for MiniPay to minimize re-renders
const ProtectedRouteMiniPay = ({ 
  children, 
  redirectTo = '/login'
}: ProtectedRouteProps) => {
  const { user, loading, session } = useAuth()

  // In MiniPay, show minimal loading UI
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
      </div>
    )
  }

  // Require authentication
  if (!user && !session) {
    return <Navigate to={redirectTo} replace />
  }

  return <>{children}</>
}
