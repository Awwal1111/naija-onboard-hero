import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Logo } from '@/components/ui/logo'
import { BrandButton } from '@/components/ui/brand-button'
import { BrandInput } from '@/components/ui/brand-input'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/integrations/supabase/client'

const ResetPassword = () => {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isValidSession, setIsValidSession] = useState(false)
  const { updatePassword } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    // Check if we have a valid session for password reset
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        setIsValidSession(true)
      } else {
        navigate('/login')
      }
    }
    
    checkSession()
  }, [navigate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (password !== confirmPassword) {
      return
    }
    
    setIsLoading(true)
    await updatePassword(password)
    setIsLoading(false)
  }

  if (!isValidSession) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-text-secondary">Verifying reset link...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <nav className="flex items-center justify-between p-6">
        <Link to="/">
          <Logo />
        </Link>
      </nav>

      <div className="flex-1 flex items-center justify-center px-6">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-text-primary">Reset Password</h1>
            <p className="text-text-secondary">Enter your new password</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <BrandInput
              label="New Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your new password"
              required
              minLength={6}
            />

            <BrandInput
              label="Confirm New Password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm your new password"
              required
              minLength={6}
            />

            {password && confirmPassword && password !== confirmPassword && (
              <p className="text-destructive text-sm">Passwords do not match</p>
            )}

            <BrandButton 
              type="submit" 
              className="w-full" 
              size="lg" 
              disabled={isLoading || !password || !confirmPassword || password !== confirmPassword}
            >
              {isLoading ? 'Updating...' : 'Update Password'}
            </BrandButton>
          </form>
        </div>
      </div>
    </div>
  )
}

export default ResetPassword