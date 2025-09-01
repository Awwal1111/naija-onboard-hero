import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Logo } from '@/components/ui/logo'
import { BrandButton } from '@/components/ui/brand-button'
import { BrandInput } from '@/components/ui/brand-input'
import { useAuth } from '@/hooks/useAuth'

const ForgotPassword = () => {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isEmailSent, setIsEmailSent] = useState(false)
  const { resetPassword } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    
    const { error } = await resetPassword(email)
    
    if (!error) {
      setIsEmailSent(true)
    }
    
    setIsLoading(false)
  }

  if (isEmailSent) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <nav className="flex items-center justify-between p-6">
          <Link to="/">
            <Logo />
          </Link>
        </nav>

        <div className="flex-1 flex items-center justify-center px-6">
          <div className="w-full max-w-md space-y-8 text-center">
            <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto">
              <svg className="w-8 h-8 text-primary-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            
            <div>
              <h1 className="text-3xl font-bold text-text-primary">Check your email</h1>
              <p className="mt-2 text-text-secondary">
                We've sent a password reset link to <strong>{email}</strong>
              </p>
            </div>

            <div className="space-y-4">
              <BrandButton 
                onClick={() => setIsEmailSent(false)}
                variant="outline" 
                className="w-full"
              >
                Try another email
              </BrandButton>
              
              <Link to="/login">
                <BrandButton variant="outline" className="w-full">
                  Back to Login
                </BrandButton>
              </Link>
            </div>
          </div>
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
          <div className="flex items-center gap-4">
            <Link to="/login" className="p-2 hover:bg-accent rounded-full">
              <ArrowLeft className="h-5 w-5 text-text-secondary" />
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-text-primary">Forgot Password</h1>
              <p className="text-text-secondary">Enter your email to reset your password</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <BrandInput
              label="Email Address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
            />

            <BrandButton 
              type="submit" 
              className="w-full" 
              size="lg" 
              disabled={isLoading || !email.trim()}
            >
              {isLoading ? 'Sending...' : 'Send Reset Link'}
            </BrandButton>
          </form>

          <div className="text-center">
            <span className="text-text-secondary">Remember your password? </span>
            <Link to="/login" className="text-primary hover:text-brand-green-hover font-medium">
              Back to Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ForgotPassword