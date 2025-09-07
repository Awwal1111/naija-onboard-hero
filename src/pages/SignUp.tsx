import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Logo } from '@/components/ui/logo'
import { BrandButton } from '@/components/ui/brand-button'
import { SecureInput } from '@/components/ui/secure-input'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/use-toast'
import { validatePasswordStrength } from '@/lib/security'

const SignUp = () => {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: ''
  })
  const [isLoading, setIsLoading] = useState(false)
  const [passwordValidation, setPasswordValidation] = useState<{
    isValid: boolean;
    errors: string[];
    strength: 'weak' | 'medium' | 'strong';
  } | null>(null)
  const { signUp, signInWithGoogle } = useAuth()

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    console.log('Input changed:', { name, value, currentFormData: formData })
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    
    // Validate password strength in real-time
    if (name === 'password') {
      const validation = validatePasswordStrength(value)
      setPasswordValidation(validation)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    console.log('Form data before validation:', formData)
    
    // Basic validation - just check if fields exist
    if (!formData.email.trim()) {
      toast({
        title: "Validation Error", 
        description: "Email is required",
        variant: "destructive",
      })
      return
    }
    
    if (!formData.password) {
      toast({
        title: "Validation Error",
        description: "Password is required", 
        variant: "destructive",
      })
      return
    }
    
    // Validate password strength before submission
    if (passwordValidation && !passwordValidation.isValid) {
      toast({
        title: "Validation Error",
        description: "Please fix password requirements",
        variant: "destructive",
      })
      return
    }
    
    setIsLoading(true)
    console.log('Calling signUp with:', {
      email: formData.email.trim(),
      hasPassword: !!formData.password,
      fullName: formData.fullName.trim() || 'User'
    })
    
    // Use a default name if none provided, or use the provided name
    const nameToUse = formData.fullName.trim() || 'User'
    
    const { error } = await signUp(formData.email.trim(), formData.password, nameToUse)
    setIsLoading(false)
    
    if (!error) {
      navigate('/onboarding')
    }
  }

  const handleGoogleSignUp = async () => {
    setIsLoading(true)
    await signInWithGoogle()
    setIsLoading(false)
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Navigation */}
      <nav className="flex items-center justify-between p-6">
        <Link to="/">
          <Logo />
        </Link>
      </nav>

      {/* Sign Up Form */}
      <div className="flex-1 flex items-center justify-center px-6">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-text-primary">Sign Up</h1>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <SecureInput
              label="Full Name"
              type="text"
              name="fullName"
              value={formData.fullName}
              onChange={handleInputChange}
              placeholder="Enter your full name"
              validation="text"
              required
            />

            <SecureInput
              label="Email Address"
              type="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              placeholder="Enter your email"
              validation="email"
              required
            />

            <div className="space-y-2">
              <SecureInput
                label="Password"
                type="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                placeholder="Create a strong password"
                validation="none"
                showValidation={false}
                required
              />
              
              {/* Password strength indicator */}
              {passwordValidation && formData.password && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-300 ${
                          passwordValidation.strength === 'weak' ? 'w-1/3 bg-destructive' :
                          passwordValidation.strength === 'medium' ? 'w-2/3 bg-warning' :
                          'w-full bg-primary'
                        }`}
                      />
                    </div>
                    <span className={`text-xs font-medium ${
                      passwordValidation.strength === 'weak' ? 'text-destructive' :
                      passwordValidation.strength === 'medium' ? 'text-warning' :
                      'text-primary'
                    }`}>
                      {passwordValidation.strength.toUpperCase()}
                    </span>
                  </div>
                  
                  {!passwordValidation.isValid && (
                    <div className="space-y-1">
                      {passwordValidation.errors.map((error, index) => (
                        <p key={index} className="text-xs text-destructive">
                          • {error}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <BrandButton 
              type="submit" 
              className="w-full" 
              size="lg" 
              disabled={isLoading || (passwordValidation && !passwordValidation.isValid)}
            >
              {isLoading ? 'Creating Account...' : 'Sign Up'}
            </BrandButton>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-text-secondary">or</span>
            </div>
          </div>

          <div className="space-y-3">
            <BrandButton 
              variant="social" 
              className="w-full" 
              size="lg"
              onClick={handleGoogleSignUp}
              disabled={isLoading}
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              {isLoading ? 'Creating Account...' : 'Sign up with Google'}
            </BrandButton>

            <BrandButton variant="social" className="w-full" size="lg">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="#1877F2">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
              Sign up with Facebook
            </BrandButton>
          </div>

          <div className="text-center">
            <span className="text-text-secondary">Already have an account? </span>
            <Link to="/login" className="text-primary hover:text-brand-green-hover font-medium">
              Log In
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SignUp