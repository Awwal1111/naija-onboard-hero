import { useAuth } from '@/hooks/useAuth'
import { Navigate } from 'react-router-dom'

interface ProtectedRouteProps {
  children: React.ReactNode
  redirectTo?: string
}

/**
 * ProtectedRoute - Standard Supabase Auth protection
 * 
 * Works the same in MiniPay and regular browser:
 * - User must be logged in via Supabase Auth
 * - If not logged in, redirects to login page
 * - MiniPay users log in normally like everyone else
 */
export const ProtectedRoute = ({ 
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
